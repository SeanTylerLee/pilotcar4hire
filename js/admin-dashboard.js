runWhenReady(async () => {
  const admin = await getAdminSession();
  if (!admin) {
    window.location.href = 'admin.html';
    return;
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  const homeSection = document.getElementById('admin-home');
  const formSection = document.getElementById('admin-form-section');
  const successSection = document.getElementById('admin-success-section');
  const listingsSection = document.getElementById('admin-listings-section');
  const startBtn = document.getElementById('admin-start-btn');
  const listingsBtn = document.getElementById('admin-listings-btn');
  const listingsBackBtn = document.getElementById('admin-listings-back-btn');
  const listingsLoading = document.getElementById('admin-listings-loading');
  const listingsEmpty = document.getElementById('admin-listings-empty');
  const listingsError = document.getElementById('admin-listings-error');
  const listingsTableWrap = document.getElementById('admin-listings-table-wrap');
  const listingsTbody = document.getElementById('admin-listings-tbody');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const form = document.getElementById('admin-listing-form');
  const formMessage = document.getElementById('admin-form-message');
  const passwordInput = document.getElementById('admin-login-password');
  const regenPasswordBtn = document.getElementById('admin-regen-password');
  const servicesEl = document.getElementById('admin-services-checkboxes');
  const statesGrid = document.getElementById('admin-states-grid');
  const homeStateSelect = document.getElementById('admin-home-state');
  const successEmail = document.getElementById('success-email');
  const successPassword = document.getElementById('success-password');
  const copyAllBtn = document.getElementById('admin-copy-all-btn');
  const addAnotherBtn = document.getElementById('admin-add-another-btn');

  LISTING_SERVICES.forEach((service) => {
    const label = document.createElement('label');
    label.className = 'checkbox-pill';
    label.innerHTML = `<input type="checkbox" name="services" value="${service.value}"> ${service.label}`;
    servicesEl.appendChild(label);
  });

  US_STATES.forEach((code) => {
    const label = document.createElement('label');
    label.className = 'state-check';
    label.innerHTML = `<input type="checkbox" name="statesCertified" value="${code}"> ${code}`;
    statesGrid.appendChild(label);

    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} — ${getStateName(code)}`;
    homeStateSelect.appendChild(option);
  });

  function showMessage(text, isError) {
    formMessage.textContent = text;
    formMessage.hidden = false;
    formMessage.classList.toggle('is-error', isError);
    formMessage.classList.toggle('is-success', !isError);
  }

  function showView(view) {
    homeSection.hidden = view !== 'home';
    formSection.hidden = view !== 'form';
    successSection.hidden = view !== 'success';
    listingsSection.hidden = view !== 'listings';
  }

  function formatAddedDate(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAdminListings(listings) {
    listingsTbody.innerHTML = listings.map((listing) => `
      <tr>
        <td>${escapeHtml(listing.userName || '—')}</td>
        <td>${escapeHtml(listing.businessName || '—')}</td>
        <td>${escapeHtml(listing.userEmail || listing.email || '—')}</td>
        <td>${escapeHtml(listing.phone || '—')}</td>
        <td>${escapeHtml([listing.homeCity, listing.homeState].filter(Boolean).join(', ') || '—')}</td>
        <td>${escapeHtml(formatAddedDate(listing.createdAt || listing.updatedAt))}</td>
      </tr>
    `).join('');
  }

  async function loadAdminListings() {
    listingsLoading.hidden = false;
    listingsEmpty.hidden = true;
    listingsError.hidden = true;
    listingsTableWrap.hidden = true;
    listingsTbody.innerHTML = '';

    try {
      const listings = await getAdminAddedListings();
      listingsLoading.hidden = true;

      if (listings.length === 0) {
        listingsEmpty.hidden = false;
        return;
      }

      renderAdminListings(listings);
      listingsTableWrap.hidden = false;
    } catch (err) {
      listingsLoading.hidden = true;
      listingsError.textContent = err.message.includes('added_by_admin')
        ? 'Database needs an update. Run supabase/migrations/002_admin_added_listings.sql in Supabase SQL Editor.'
        : err.message;
      listingsError.hidden = false;
    }
  }

  function setPassword(value) {
    passwordInput.value = value;
  }

  function refreshPassword() {
    const name = form.contactName.value.trim();
    if (!name) {
      setPassword('');
      return;
    }
    setPassword(generatePilotPassword(name));
  }

  function resetForm() {
    form.reset();
    setPassword('');
    formMessage.hidden = true;
    form.querySelectorAll('input[name="services"], input[name="statesCertified"]').forEach((el) => {
      el.checked = false;
    });
  }

  function getSelectedServices() {
    return [...form.querySelectorAll('input[name="services"]:checked')].map((el) => el.value);
  }

  function getSelectedStates() {
    return [...form.querySelectorAll('input[name="statesCertified"]:checked')].map((el) => el.value);
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      if (button) {
        const original = button.textContent;
        button.textContent = 'Copied!';
        window.setTimeout(() => { button.textContent = original; }, 1500);
      }
    } catch {
      window.prompt('Copy this text:', text);
    }
  }

  showView('home');

  if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);

  startBtn.addEventListener('click', () => {
    resetForm();
    showView('form');
    form.contactName.focus();
  });

  listingsBtn.addEventListener('click', () => {
    showView('listings');
    loadAdminListings();
  });

  listingsBackBtn.addEventListener('click', () => {
    showView('home');
  });

  cancelBtn.addEventListener('click', () => {
    showView('home');
  });

  regenPasswordBtn.addEventListener('click', () => {
    if (!form.contactName.value.trim()) {
      form.contactName.focus();
      return;
    }
    refreshPassword();
  });

  form.contactName.addEventListener('input', refreshPassword);

  form.loginEmail.addEventListener('input', () => {
    if (!form.email.value || form.email.value === form.loginEmail.dataset.lastSynced) {
      form.email.value = form.loginEmail.value;
      form.loginEmail.dataset.lastSynced = form.loginEmail.value;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formMessage.hidden = true;

    const services = getSelectedServices();
    const statesCertified = getSelectedStates();

    if (services.length === 0) {
      showMessage('Select at least one service.', true);
      return;
    }

    if (statesCertified.length === 0) {
      showMessage('Select at least one certified state.', true);
      return;
    }

    const contactName = form.contactName.value.trim();
    if (!contactName) {
      showMessage('Enter a contact name.', true);
      return;
    }

    const password = form.loginPassword.value;
    if (!password) {
      showMessage('Enter a contact name to generate a password.', true);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const loginEmail = form.loginEmail.value.trim();

      const result = await adminCreatePilot({
        name: contactName,
        email: loginEmail,
        password,
        listing: {
          businessName: form.businessName.value.trim(),
          yearsExperience: Number(form.yearsExperience.value),
          phone: form.phone.value.trim(),
          email: form.email.value.trim(),
          services,
          statesCertified,
          homeState: form.homeState.value,
          homeCity: form.homeCity.value.trim(),
          description: form.description.value.trim(),
        },
      });

      successEmail.value = result.email;
      successPassword.value = result.password;
      showView('success');
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.copyTarget);
      if (input) copyText(input.value, button);
    });
  });

  copyAllBtn.addEventListener('click', () => {
    const text = `Pilot Car 4 Hire login\nEmail: ${successEmail.value}\nPassword: ${successPassword.value}\nLog in at pilotcar4hire.com`;
    copyText(text, copyAllBtn);
  });

  addAnotherBtn.addEventListener('click', () => {
    resetForm();
    showView('form');
    form.contactName.focus();
  });
});
