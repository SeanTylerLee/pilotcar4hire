runWhenReady(async () => {
  let admin;
  try {
    admin = await getAdminSession();
  } catch (err) {
    window.location.href = `admin.html?error=${encodeURIComponent(err.message)}`;
    return;
  }

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
  const handoffsList = document.getElementById('admin-handoffs-list');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const form = document.getElementById('admin-listing-form');
  const formMessage = document.getElementById('admin-form-message');
  const passwordInput = document.getElementById('admin-login-password');
  const regenPasswordBtn = document.getElementById('admin-regen-password');
  const servicesEl = document.getElementById('admin-services-checkboxes');
  const statesGrid = document.getElementById('admin-states-grid');
  const homeStateSelect = document.getElementById('admin-home-state');
  const successName = document.getElementById('success-name');
  const successEmail = document.getElementById('success-email');
  const successPassword = document.getElementById('success-password');
  const successPhone = document.getElementById('success-phone');
  const successMessage = document.getElementById('success-message');
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
    if (view === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatHandoffMessage(handoff) {
    return [
      `Hi ${handoff.contactName},`,
      '',
      'Your pilot car listing is live on Pilot Car 4 Hire. Use these details to log in and manage your listing:',
      '',
      `Email: ${handoff.loginEmail}`,
      `Password: ${handoff.tempPassword}`,
      `Phone: ${handoff.phone}`,
      '',
      'Log in at pilotcar4hire.com',
    ].join('\n');
  }

  function renderHandoffCard(handoff) {
    return `
      <article class="admin-handoff-card panel" data-handoff-id="${escapeHtml(handoff.id)}">
        <div class="admin-handoff-fields">
          <div class="admin-handoff-field">
            <span class="field-label">Name</span>
            <span class="admin-handoff-value">${escapeHtml(handoff.contactName)}</span>
          </div>
          <div class="admin-handoff-field">
            <span class="field-label">Email</span>
            <span class="admin-handoff-value">${escapeHtml(handoff.loginEmail)}</span>
          </div>
          <div class="admin-handoff-field">
            <span class="field-label">Password</span>
            <span class="admin-handoff-value">${escapeHtml(handoff.tempPassword)}</span>
          </div>
          <div class="admin-handoff-field">
            <span class="field-label">Phone</span>
            <span class="admin-handoff-value">${escapeHtml(handoff.phone)}</span>
          </div>
        </div>
        <div class="admin-form-actions">
          <button type="button" class="btn-secondary btn-small" data-copy-handoff="${escapeHtml(handoff.id)}">Copy all info</button>
          <button type="button" class="btn-secondary btn-small admin-handoff-remove" data-remove-handoff="${escapeHtml(handoff.id)}">Remove</button>
        </div>
      </article>
    `;
  }

  function renderAdminHandoffs(handoffs) {
    handoffsList.innerHTML = handoffs.map(renderHandoffCard).join('');
    handoffsList.dataset.handoffs = JSON.stringify(handoffs);
  }

  async function loadAdminHandoffs() {
    listingsLoading.hidden = false;
    listingsEmpty.hidden = true;
    listingsError.hidden = true;
    handoffsList.hidden = true;
    handoffsList.innerHTML = '';

    try {
      const handoffs = await getAdminPilotHandoffs();
      listingsLoading.hidden = true;

      if (handoffs.length === 0) {
        listingsEmpty.hidden = false;
        return;
      }

      renderAdminHandoffs(handoffs);
      handoffsList.hidden = false;
    } catch (err) {
      listingsLoading.hidden = true;
      listingsError.textContent = err.message.includes('admin_pilot_handoffs')
        ? 'Database needs an update. Run supabase/migrations/003_admin_pilot_handoffs.sql in Supabase SQL Editor.'
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

  function getHandoffById(handoffId) {
    const handoffs = JSON.parse(handoffsList.dataset.handoffs || '[]');
    return handoffs.find((row) => row.id === handoffId) || null;
  }

  function fillSuccessView(result) {
    const handoff = {
      contactName: result.contactName,
      loginEmail: result.email,
      tempPassword: result.password,
      phone: result.phone,
    };
    successName.value = result.contactName;
    successEmail.value = result.email;
    successPassword.value = result.password;
    successPhone.value = result.phone;
    successMessage.value = formatHandoffMessage(handoff);
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
    loadAdminHandoffs();
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

      fillSuccessView(result);
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
    copyText(successMessage.value, copyAllBtn);
  });

  addAnotherBtn.addEventListener('click', () => {
    resetForm();
    showView('form');
    form.contactName.focus();
  });

  handoffsList.addEventListener('click', async (event) => {
    const copyBtn = event.target.closest('[data-copy-handoff]');
    if (copyBtn) {
      const handoff = getHandoffById(copyBtn.dataset.copyHandoff);
      if (handoff) copyText(formatHandoffMessage(handoff), copyBtn);
      return;
    }

    const removeBtn = event.target.closest('[data-remove-handoff]');
    if (!removeBtn) return;

    const handoffId = removeBtn.dataset.removeHandoff;
    if (!window.confirm('Remove this pilot from your list? Their listing stays live on the site.')) {
      return;
    }

    removeBtn.disabled = true;
    try {
      await removeAdminPilotHandoff(handoffId);
      await loadAdminHandoffs();
    } catch (err) {
      listingsError.textContent = err.message;
      listingsError.hidden = false;
      removeBtn.disabled = false;
    }
  });
});
