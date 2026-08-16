const AppState = {
  currentPage: 'home',
  currentUser: null,
  uploadedDocuments: [
    { name: 'RRA_VAT_Filing_Jan2026.pdf', date: 'Feb 14, 2026', status: 'Accepted by RRA' },
    { name: 'Income_Statement_Q4_2025.pdf', date: 'Jan 28, 2026', status: 'Audited & Signed' },
    { name: 'Rwanda_RSSB_Declaration_Dec2025.pdf', date: 'Jan 15, 2026', status: 'Payment Cleared' },
    { name: 'Tax_Clearance_Certificate_2026.pdf', date: 'Jan 05, 2026', status: 'Active Official' }
  ]
};

// --- Currency Formatter ---
function formatRWF(num) {
  return new Intl.NumberFormat('en-RW', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.round(num)) + ' RWF';
}

// --- Rwanda Salary & Tax Calculation Engine (RRA Statutory Rules) ---
function calculateRwandaTax(grossSalary, allowances = 0) {
  const totalTaxable = Math.max(0, grossSalary + allowances);

  // 1. RSSB Employee Contributions
  const employeePension = totalTaxable * 0.03; // 3%
  const employeeMaternity = totalTaxable * 0.003; // 0.3%
  const totalEmployeeRSSB = employeePension + employeeMaternity;

  // 2. Rwanda PAYE Progressive Brackets on (Taxable Gross - Employee RSSB)
  const payeBase = Math.max(0, totalTaxable - totalEmployeeRSSB);
  let payeTax = 0;

  if (payeBase <= 60000) {
    payeTax = 0;
  } else if (payeBase <= 100000) {
    payeTax = (payeBase - 60000) * 0.10;
  } else if (payeBase <= 200000) {
    payeTax = (40000 * 0.10) + ((payeBase - 100000) * 0.20);
  } else {
    payeTax = (40000 * 0.10) + (100000 * 0.20) + ((payeBase - 200000) * 0.30);
  }

  // 3. Net Take-Home Pay
  const totalDeductions = totalEmployeeRSSB + payeTax;
  const netPay = Math.max(0, totalTaxable - totalDeductions);

  // 4. RSSB Employer Contributions
  const employerPension = totalTaxable * 0.05; // 5%
  const employerMaternity = totalTaxable * 0.003; // 0.3%
  const totalEmployerRSSB = employerPension + employerMaternity;
  const totalEmployerCost = totalTaxable + totalEmployerRSSB;

  return {
    grossSalary: totalTaxable,
    employeePension,
    employeeMaternity,
    totalEmployeeRSSB,
    payeTax,
    totalDeductions,
    netPay,
    employerPension,
    employerMaternity,
    totalEmployerRSSB,
    totalEmployerCost,
    effectiveTaxRate: totalTaxable > 0 ? ((payeTax / totalTaxable) * 100).toFixed(1) : 0
  };
}

// --- Navigation & Multi-Page Router ---
const PAGE_TITLES = {
  home: 'ACTUAL ACCOUNTING | Business Consultancy & Accounting in Rwanda',
  services: 'Services & Retainer Packages | ACTUAL ACCOUNTING',
  about: 'About Us & Corporate Identity | ACTUAL ACCOUNTING',
  family: 'The ACTUAL Family & Ecosystem | ACTUAL HOLDINGS CO LTD',
  resources: 'Rwanda Tax & Regulatory Hub | ACTUAL ACCOUNTING',
  contact: 'Contact Kigali Headquarters | ACTUAL ACCOUNTING',
  login: 'Client Portal Sign In | ACTUAL ACCOUNTING',
  signup: 'Open New Client Account | ACTUAL ACCOUNTING',
  portal: 'Client Compliance Portal | ACTUAL ACCOUNTING'
};

function navigateTo(pageId) {
  // Normalize pageId
  if (!pageId) pageId = 'home';
  pageId = pageId.toString().toLowerCase().trim().replace(/^[#/]+/, '');
  if (!PAGE_TITLES[pageId]) {
    pageId = 'home';
  }

  // Check portal authentication
  if (pageId === 'portal' && !AppState.currentUser) {
    showToast('Please sign in to access your Client Portal. (Demo login available)');
    pageId = 'login';
  }

  AppState.currentPage = pageId;

  // Update hash safely without breaking history
  if (window.location.hash !== `#${pageId}`) {
    window.location.hash = pageId;
  }

  // Update Page View Visibility
  const allViews = document.querySelectorAll('.page-view');
  allViews.forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`page-${pageId}`);
  if (targetView) {
    targetView.classList.add('active');
  } else {
    const homeView = document.getElementById('page-home');
    if (homeView) homeView.classList.add('active');
  }

  // Update Navigation Active States (Desktop & Mobile Drawer)
  document.querySelectorAll('.nav-link, .drawer-link, .footer-links button').forEach(link => {
    const linkPage = link.getAttribute('data-page') || 
                     (link.getAttribute('href') ? link.getAttribute('href').replace(/^[#/]+/, '') : '') ||
                     link.textContent.toLowerCase().trim();
    if (linkPage === pageId || (pageId === 'home' && linkPage === '')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update Document Title
  if (PAGE_TITLES[pageId]) {
    document.title = PAGE_TITLES[pageId];
  }

  // Set body attribute for styling hooks
  document.body.setAttribute('data-current-page', pageId);

  // Update Auth UI State
  updateAuthUI();

  // Close Mobile Drawer if open
  closeMobileMenu();

  // Smooth scroll to top of new page
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// --- Mobile Drawer Handlers ---
function openMobileMenu() {
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (overlay) overlay.classList.remove('open');
}

// --- Modals Handlers ---
function openConsultationModal(serviceName = 'General Accounting & Tax Advisory') {
  const modal = document.getElementById('consultation-modal');
  const serviceInput = document.getElementById('consult-service-input');
  if (serviceInput) serviceInput.value = serviceName;
  if (modal) modal.classList.add('open');
}

function closeConsultationModal() {
  const modal = document.getElementById('consultation-modal');
  if (modal) modal.classList.remove('open');
}

function openTaxModal() {
  const modal = document.getElementById('tax-modal');
  if (modal) {
    modal.classList.add('open');
    updateModalTaxCalculation();
  }
}

function closeTaxModal() {
  const modal = document.getElementById('tax-modal');
  if (modal) modal.classList.remove('open');
}

// --- Modal Tax Calculator Sync ---
function updateModalTaxCalculation() {
  const grossInput = document.getElementById('modal-gross-salary');
  const gross = parseFloat(grossInput ? grossInput.value : 500000) || 0;
  const result = calculateRwandaTax(gross);

  const netEl = document.getElementById('modal-calc-net');
  const payeEl = document.getElementById('modal-calc-paye');
  const rssbEmpEl = document.getElementById('modal-calc-rssb-emp');
  const rssbEmplrEl = document.getElementById('modal-calc-rssb-emplr');
  const costEl = document.getElementById('modal-calc-total-cost');
  const rateEl = document.getElementById('modal-calc-rate');

  if (netEl) netEl.textContent = formatRWF(result.netPay);
  if (payeEl) payeEl.textContent = formatRWF(result.payeTax);
  if (rssbEmpEl) rssbEmpEl.textContent = formatRWF(result.totalEmployeeRSSB);
  if (rssbEmplrEl) rssbEmplrEl.textContent = formatRWF(result.totalEmployerRSSB);
  if (costEl) costEl.textContent = formatRWF(result.totalEmployerCost);
  if (rateEl) rateEl.textContent = result.effectiveTaxRate + '%';
}

// --- In-Page Tax Calculator Sync ---
function updateInPageTaxCalculation() {
  const grossInput = document.getElementById('inpage-gross-salary');
  const allowInput = document.getElementById('inpage-allowances');
  
  const gross = parseFloat(grossInput ? grossInput.value : 850000) || 0;
  const allow = parseFloat(allowInput ? allowInput.value : 0) || 0;
  const result = calculateRwandaTax(gross, allow);

  const netEl = document.getElementById('inpage-calc-net');
  const payeEl = document.getElementById('inpage-calc-paye');
  const pensionEl = document.getElementById('inpage-calc-pension');
  const matEl = document.getElementById('inpage-calc-maternity');
  const empPensionEl = document.getElementById('inpage-calc-employer-pension');
  const costEl = document.getElementById('inpage-calc-total-cost');

  if (netEl) netEl.textContent = formatRWF(result.netPay);
  if (payeEl) payeEl.textContent = formatRWF(result.payeTax);
  if (pensionEl) pensionEl.textContent = formatRWF(result.employeePension);
  if (matEl) matEl.textContent = formatRWF(result.employeeMaternity);
  if (empPensionEl) empPensionEl.textContent = formatRWF(result.employerPension);
  if (costEl) costEl.textContent = formatRWF(result.totalEmployerCost);
}

// --- Authentication & User State ---
function loginUser(email, companyName, tin) {
  AppState.currentUser = {
    name: 'Jean-Paul Mugisha',
    email: email || 'jean@kigalitech.rw',
    company: companyName || 'Kigali Tech Ventures Ltd',
    tin: tin || '109847291',
    plan: 'Growth Enterprise Retainer'
  };
  localStorage.setItem('actual_user', JSON.stringify(AppState.currentUser));
  updateAuthUI();
  showToast(`Welcome back, ${AppState.currentUser.company}! Logged in successfully.`);
  navigateTo('portal');
}

function logoutUser() {
  AppState.currentUser = null;
  localStorage.removeItem('actual_user');
  updateAuthUI();
  showToast('You have been signed out.');
  navigateTo('home');
}

function updateAuthUI() {
  const navAuthBtn = document.getElementById('nav-auth-btn');
  const navSignupBtn = document.getElementById('nav-signup-btn');
  const portalNameEl = document.getElementById('portal-display-company');
  const portalTinEl = document.getElementById('portal-display-tin');
  const portalPlanEl = document.getElementById('portal-display-plan');

  if (AppState.currentUser) {
    if (navAuthBtn) {
      navAuthBtn.textContent = 'Client Portal';
      navAuthBtn.onclick = () => navigateTo('portal');
    }
    if (navSignupBtn) {
      navSignupBtn.textContent = 'Sign Out';
      navSignupBtn.className = 'btn btn-outline btn-sm';
      navSignupBtn.onclick = logoutUser;
    }
    if (portalNameEl) portalNameEl.textContent = AppState.currentUser.company;
    if (portalTinEl) portalTinEl.textContent = `RRA TIN: ${AppState.currentUser.tin}`;
    if (portalPlanEl) portalPlanEl.textContent = AppState.currentUser.plan;
  } else {
    if (navAuthBtn) {
      navAuthBtn.textContent = 'Log In';
      navAuthBtn.onclick = () => navigateTo('login');
    }
    if (navSignupBtn) {
      navSignupBtn.textContent = 'Sign Up';
      navSignupBtn.className = 'btn btn-gold btn-sm';
      navSignupBtn.onclick = () => navigateTo('signup');
    }
  }

  // Render Portal Documents
  renderPortalDocuments();
}

function renderPortalDocuments() {
  const tableBody = document.getElementById('portal-docs-tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  AppState.uploadedDocuments.forEach(doc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; display:flex; align-items:center; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F3D2E" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        ${doc.name}
      </td>
      <td>${doc.date}</td>
      <td><span style="background:#E8F2EE; color:#0F3D2E; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:12px;">${doc.status}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="showToast('Downloading verified copy of ${doc.name}...')">Download</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// --- Event Listeners Setup on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
  // Check for saved user in localStorage
  const saved = localStorage.getItem('actual_user');
  if (saved) {
    try {
      AppState.currentUser = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }

  // Setup Hash Routing
  const currentHash = window.location.hash.replace(/^[#/]+/, '') || 'home';
  navigateTo(currentHash);

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace(/^[#/]+/, '') || 'home';
    navigateTo(hash);
  });

  // Modal Calculator input listener
  const modalGross = document.getElementById('modal-gross-salary');
  if (modalGross) {
    modalGross.addEventListener('input', updateModalTaxCalculation);
  }

  // In-page Calculator input listener
  const inpageGross = document.getElementById('inpage-gross-salary');
  const inpageAllow = document.getElementById('inpage-allowances');
  if (inpageGross) inpageGross.addEventListener('input', updateInPageTaxCalculation);
  if (inpageAllow) inpageAllow.addEventListener('input', updateInPageTaxCalculation);

  // Initialize initial calculator outputs
  updateModalTaxCalculation();
  updateInPageTaxCalculation();

  // Consultation Form Handler
  const consultForm = document.getElementById('consultation-form');
  if (consultForm) {
    consultForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeConsultationModal();
      showToast('Thank you! Your confidential consultation request has been received. Our Senior Accountant will contact you within 2 hours.');
      consultForm.reset();
    });
  }

  // Contact Page Form Handler
  const contactForm = document.getElementById('contact-page-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Message sent to Kigali Heights desk. We will reach out promptly.');
      contactForm.reset();
    });
  }

  // Login Form Handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      loginUser(email, 'Kigali Tech Ventures Ltd', '109847291');
    });
  }

  // Demo Login Button
  const demoLoginBtn = document.getElementById('demo-login-btn');
  if (demoLoginBtn) {
    demoLoginBtn.addEventListener('click', () => {
      loginUser('jean@kigalitech.rw', 'Kigali Tech Ventures Ltd', '109847291');
    });
  }

  // Sign Up Form Handler
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const company = document.getElementById('signup-company').value;
      const tin = document.getElementById('signup-tin').value;
      const email = document.getElementById('signup-email').value;
      loginUser(email, company, tin);
    });
  }

  // File Upload in Portal
  const portalFileInput = document.getElementById('portal-file-input');
  if (portalFileInput) {
    portalFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        for (let i = 0; i < e.target.files.length; i++) {
          const f = e.target.files[i];
          AppState.uploadedDocuments.unshift({
            name: f.name,
            date: 'Just Now',
            status: 'Under CPA Review',
            size: `${(f.size / 1024).toFixed(0)} KB`
          });
        }
        renderPortalDocuments();
        showToast('Document uploaded successfully to your encrypted CPA vault.');
      }
    });
  }

  // Messenger in Portal
  const chatForm = document.getElementById('portal-chat-form');
  const chatInput = document.getElementById('portal-chat-input');
  const chatBox = document.getElementById('portal-chat-box');

  if (chatForm && chatInput && chatBox) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      // Append user msg
      const userDiv = document.createElement('div');
      userDiv.style.cssText = 'align-self:flex-end; background:#0F3D2E; color:#FFF; padding:8px 14px; border-radius:10px 10px 0 10px; font-size:0.85rem; max-width:80%; margin-bottom:8px;';
      userDiv.textContent = text;
      chatBox.appendChild(userDiv);
      chatInput.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;

      // Simulated CPA response
      setTimeout(() => {
        const cpaDiv = document.createElement('div');
        cpaDiv.style.cssText = 'align-self:flex-start; background:#E8F2EE; color:#0F3D2E; padding:8px 14px; border-radius:10px 10px 10px 0; font-size:0.85rem; max-width:80%; margin-bottom:8px;';
        cpaDiv.textContent = 'Murakoze Jean-Paul. Our tax team is examining this item against latest RRA guidelines.';
        chatBox.appendChild(cpaDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
      }, 1200);
    });
  }
});
