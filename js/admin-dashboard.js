(async function initAdminDashboard() {
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
  const pilotsSection = document.getElementById('admin-pilots-section');
  const startBtn = document.getElementById('admin-start-btn');
  const listingsBtn = document.getElementById('admin-listings-btn');
  const pilotsBtn = document.getElementById('admin-pilots-btn');
  const listingsBackBtn = document.getElementById('admin-listings-back-btn');
  const pilotsBackBtn = document.getElementById('admin-pilots-back-btn');
  const listingsLoading = document.getElementById('admin-listings-loading');
  const listingsEmpty = document.getElementById('admin-listings-empty');
  const listingsError = document.getElementById('admin-listings-error');
  const handoffsList = document.getElementById('admin-handoffs-list');
  const pilotsLoading = document.getElementById('admin-pilots-loading');
  const pilotsEmpty = document.getElementById('admin-pilots-empty');
  const pilotsError = document.getElementById('admin-pilots-error');
  const pilotsMessage = document.getElementById('admin-pilots-message');
  const pilotsList = document.getElementById('admin-pilots-list');
  const pilotsIncompleteOnly = document.getElementById('admin-pilots-incomplete-only');
  const pilotsSearch = document.getElementById('admin-pilots-search');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const formBackBtn = document.getElementById('admin-form-back-btn');
  const form = document.getElementById('admin-listing-form');
  const formMessage = document.getElementById('admin-form-message');
  const passwordInput = document.getElementById('admin-login-password');
  const regenPasswordBtn = document.getElementById('admin-regen-password');
  const servicesEl = document.getElementById('admin-services-checkboxes');
  const statesCertGrid = document.getElementById('admin-states-cert-grid');
  const statesOtherGrid = document.getElementById('admin-states-other-grid');
  const statesSelectAllBtn = document.getElementById('admin-states-select-all');
  const statesClearAllBtn = document.getElementById('admin-states-clear-all');
  const homeStateSelect = document.getElementById('admin-home-state');
  const successWarning = document.getElementById('success-warning');
  const successBackBtn = document.getElementById('admin-success-back-btn');
  const accountFields = document.getElementById('admin-account-fields');
  const formEyebrow = document.getElementById('admin-form-eyebrow');
  const formTitle = document.getElementById('admin-form-title');
  const formSubtitle = document.getElementById('admin-form-subtitle');
  const formSubmitBtn = document.getElementById('admin-form-submit');

  let allPilots = [];
  let handoffByUserId = new Map();
  let formMode = 'create';
  let editingPilot = null;

  LISTING_SERVICES.forEach((service) => {
    const label = document.createElement('label');
    label.className = 'checkbox-pill';
    label.innerHTML = `<input type="checkbox" name="services" value="${service.value}"> ${service.label}`;
    servicesEl.appendChild(label);
  });

  function appendStateCheckbox(container, code, { showName = false } = {}) {
    const label = document.createElement('label');
    label.className = showName ? 'state-check state-check--named' : 'state-check';
    const text = showName ? getStateName(code) : code;
    label.innerHTML = `<input type="checkbox" name="statesCertified" value="${code}"> ${text}`;
    container.appendChild(label);
  }

  CERTIFICATION_REQUIRED_STATES.forEach((code) => {
    appendStateCheckbox(statesCertGrid, code, { showName: true });
  });

  US_STATES.filter((code) => !CERTIFICATION_REQUIRED_STATES.includes(code)).forEach((code) => {
    appendStateCheckbox(statesOtherGrid, code, { showName: true });
  });

  US_STATES.forEach((code) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} — ${getStateName(code)}`;
    homeStateSelect.appendChild(option);
  });

  function setAllStatesChecked(checked) {
    form.querySelectorAll('input[name="statesCertified"]').forEach((el) => {
      el.checked = checked;
    });
  }

  statesSelectAllBtn.addEventListener('click', () => setAllStatesChecked(true));
  statesClearAllBtn.addEventListener('click', () => setAllStatesChecked(false));

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
    pilotsSection.hidden = view !== 'pilots';
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

  function formatSignedUp(timestamp) {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  function showPilotsBanner(text, isError) {
    pilotsMessage.textContent = text;
    pilotsMessage.hidden = false;
    pilotsMessage.classList.toggle('is-error', isError);
    pilotsMessage.classList.toggle('is-success', !isError);
  }

  function getFilteredPilots() {
    const incompleteOnly = pilotsIncompleteOnly?.checked;
    const query = (pilotsSearch?.value || '').trim().toLowerCase();

    return allPilots.filter((pilot) => {
      if (incompleteOnly && pilot.listing) return false;
      if (!query) return true;
      const haystack = `${pilot.name || ''} ${pilot.email || ''} ${pilot.listing?.businessName || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderPilotCard(pilot) {
    const listing = pilot.listing;
    const handoff = handoffByUserId.get(pilot.id);
    const statusClass = listing ? 'is-complete' : 'is-incomplete';
    const statusLabel = listing ? 'Listing live' : 'No listing yet';
    const listingHtml = listing
      ? `
        <dl class="admin-pilot-listing">
          <div><dt>Business</dt><dd>${escapeHtml(listing.businessName || '—')}</dd></div>
          <div><dt>Phone</dt><dd>${escapeHtml(listing.phone || '—')}</dd></div>
          <div><dt>Public email</dt><dd>${escapeHtml(listing.email || '—')}</dd></div>
          <div><dt>Based in</dt><dd>${escapeHtml(formatHomeLocation(listing.homeCity, listing.homeState) || '—')}</dd></div>
        </dl>
      `
      : '<p class="admin-pilot-missing">Signed up but never finished a listing. Use Complete listing to fill it in for them.</p>';

    const passwordHtml = handoff?.tempPassword
      ? `<p class="admin-pilot-password"><strong>Temp password on file:</strong> ${escapeHtml(handoff.tempPassword)} <span class="admin-pilot-password-note">(from when you added them)</span></p>`
      : '<p class="admin-pilot-password-note">Password can’t be viewed. Use Send reset email if they forgot it.</p>';

    const editLabel = listing ? 'Edit listing' : 'Complete listing';

    return `
      <article class="admin-pilot-card panel" data-pilot-id="${escapeHtml(pilot.id)}">
        <div class="admin-pilot-card-head">
          <div>
            <h2 class="admin-pilot-name">${escapeHtml(pilot.name || '—')}</h2>
            <p class="admin-pilot-email">${escapeHtml(pilot.email || '—')}</p>
            <p class="admin-pilot-meta">Signed up ${escapeHtml(formatSignedUp(pilot.createdAt))}</p>
          </div>
          <span class="admin-pilot-status ${statusClass}">${statusLabel}</span>
        </div>
        ${listingHtml}
        ${passwordHtml}
        <div class="admin-pilot-actions">
          <button type="button" class="btn-submit btn-small" data-edit-pilot="${escapeHtml(pilot.id)}">${editLabel}</button>
          <button type="button" class="btn-secondary btn-small" data-copy-pilot-email="${escapeHtml(pilot.email || '')}">Copy email</button>
          <button type="button" class="btn-secondary btn-small" data-reset-pilot="${escapeHtml(pilot.email || '')}">Send reset email</button>
          ${handoff?.tempPassword ? `<button type="button" class="btn-secondary btn-small" data-copy-pilot-password="${escapeHtml(handoff.tempPassword)}">Copy temp password</button>` : ''}
        </div>
      </article>
    `;
  }

  function renderPilotsList() {
    const filtered = getFilteredPilots();
    pilotsLoading.hidden = true;
    pilotsError.hidden = true;

    if (filtered.length === 0) {
      pilotsList.hidden = true;
      pilotsEmpty.hidden = false;
      return;
    }

    pilotsEmpty.hidden = true;
    pilotsList.innerHTML = filtered.map(renderPilotCard).join('');
    pilotsList.hidden = false;
  }

  async function loadAllPilots() {
    pilotsLoading.hidden = false;
    pilotsEmpty.hidden = true;
    pilotsError.hidden = true;
    pilotsMessage.hidden = true;
    pilotsList.hidden = true;
    pilotsList.innerHTML = '';

    try {
      const [pilots, handoffs] = await Promise.all([
        getAllPilotsWithListings(),
        getAdminPilotHandoffs().catch(() => []),
      ]);
      allPilots = pilots;
      handoffByUserId = new Map(
        handoffs
          .filter((row) => row.userId)
          .map((row) => [row.userId, row]),
      );
      renderPilotsList();
    } catch (err) {
      pilotsLoading.hidden = true;
      pilotsError.textContent = err.message;
      pilotsError.hidden = false;
    }
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
        <span class="admin-handoff-name">${escapeHtml(handoff.contactName)}</span>
        <div class="admin-handoff-actions">
          <button type="button" class="btn-secondary btn-small" data-copy-handoff="${escapeHtml(handoff.id)}">Copy email</button>
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
    delete form.loginEmail.dataset.lastSynced;
  }

  function setCreateFormMode() {
    formMode = 'create';
    editingPilot = null;
    if (accountFields) accountFields.hidden = false;
    form.contactName.required = true;
    form.loginEmail.required = true;
    form.loginPassword.required = true;
    if (formEyebrow) formEyebrow.textContent = 'New listing';
    if (formTitle) formTitle.textContent = 'Pilot car intake';
    if (formSubtitle) {
      formSubtitle.textContent = 'Enter what they give you on the call. A login is created automatically when you save.';
    }
    if (formSubmitBtn) formSubmitBtn.textContent = 'Save listing & create account';
  }

  function setEditFormMode(pilot) {
    formMode = 'edit';
    editingPilot = pilot;
    if (accountFields) accountFields.hidden = true;
    form.contactName.required = false;
    form.loginEmail.required = false;
    form.loginPassword.required = false;

    const hasListing = Boolean(pilot.listing);
    if (formEyebrow) formEyebrow.textContent = hasListing ? 'Edit listing' : 'Complete listing';
    if (formTitle) {
      formTitle.textContent = hasListing
        ? `Edit ${pilot.name || 'listing'}`
        : `Complete listing for ${pilot.name || 'pilot'}`;
    }
    if (formSubtitle) {
      formSubtitle.textContent = `Account: ${pilot.email || '—'}. Fill in what carriers should see, then save.`;
    }
    if (formSubmitBtn) {
      formSubmitBtn.textContent = hasListing ? 'Save listing' : 'Save & publish listing';
    }
  }

  function fillListingFields(pilot) {
    const listing = pilot.listing || {};
    form.businessName.value = listing.businessName || pilot.name || '';
    form.yearsExperience.value = listing.yearsExperience ?? '';
    form.phone.value = listing.phone || '';
    form.email.value = listing.email || pilot.email || '';
    form.homeCity.value = listing.homeCity || '';
    form.homeState.value = listing.homeState || '';
    form.description.value = listing.description || '';

    form.querySelectorAll('input[name="services"]').forEach((input) => {
      input.checked = (listing.services || []).includes(input.value);
    });
    form.querySelectorAll('input[name="statesCertified"]').forEach((input) => {
      input.checked = (listing.statesCertified || []).includes(input.value);
    });
  }

  function openEditPilot(pilotId) {
    const pilot = allPilots.find((row) => row.id === pilotId);
    if (!pilot) {
      showPilotsBanner('Could not find that pilot.', true);
      return;
    }
    resetForm();
    setEditFormMode(pilot);
    fillListingFields(pilot);
    showView('form');
    form.businessName.focus();
  }

  function leaveForm() {
    if (formMode === 'edit') {
      setCreateFormMode();
      showView('pilots');
      loadAllPilots();
      return;
    }
    setCreateFormMode();
    showView('home');
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

  function showSuccessView(result) {
    if (successWarning) {
      if (result.handoffWarning) {
        successWarning.textContent = result.handoffWarning;
        successWarning.hidden = false;
      } else {
        successWarning.hidden = true;
        successWarning.textContent = '';
      }
    }
  }

  showView('home');

  if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);

  startBtn.addEventListener('click', () => {
    resetForm();
    setCreateFormMode();
    showView('form');
    form.contactName.focus();
  });

  listingsBtn.addEventListener('click', () => {
    showView('listings');
    loadAdminHandoffs();
  });

  pilotsBtn.addEventListener('click', () => {
    showView('pilots');
    loadAllPilots();
  });

  listingsBackBtn.addEventListener('click', () => {
    showView('home');
  });

  pilotsBackBtn.addEventListener('click', () => {
    showView('home');
  });

  if (pilotsIncompleteOnly) {
    pilotsIncompleteOnly.addEventListener('change', renderPilotsList);
  }
  if (pilotsSearch) {
    pilotsSearch.addEventListener('input', renderPilotsList);
  }

  cancelBtn.addEventListener('click', leaveForm);

  if (formBackBtn) {
    formBackBtn.addEventListener('click', leaveForm);
  }

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

    const yearsExperience = Number(form.yearsExperience.value);
    if (!Number.isFinite(yearsExperience) || yearsExperience < 0) {
      showMessage('Enter a valid years of experience.', true);
      return;
    }

    const listingPayload = {
      businessName: form.businessName.value.trim(),
      yearsExperience,
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      services,
      statesCertified,
      homeState: form.homeState.value,
      homeCity: form.homeCity.value.trim(),
      description: form.description.value.trim(),
    };

    const submitBtn = formSubmitBtn || form.querySelector('button[type="submit"]');
    const submitLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      if (formMode === 'edit') {
        if (!editingPilot?.id) {
          throw new Error('Missing pilot account.');
        }
        await adminUpsertListingForUser(editingPilot.id, {
          ...listingPayload,
          id: editingPilot.listing?.id,
          addedByAdmin: editingPilot.listing?.addedByAdmin ?? true,
        });
        showPilotsBanner(
          editingPilot.listing
            ? `Updated listing for ${editingPilot.name || editingPilot.email}.`
            : `Published listing for ${editingPilot.name || editingPilot.email}.`,
          false,
        );
        setCreateFormMode();
        showView('pilots');
        await loadAllPilots();
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

      const loginEmail = form.loginEmail.value.trim();
      const result = await adminCreatePilot({
        name: contactName,
        email: loginEmail,
        password,
        listing: listingPayload,
      });

      showSuccessView(result);
      showView('success');
    } catch (err) {
      const needsMigration = err.message.includes('row-level security')
        || err.message.includes('permission')
        || err.message.includes('RLS');
      showMessage(
        needsMigration && formMode === 'edit'
          ? 'Database needs an update. Run supabase/migrations/004_admin_edit_listings.sql in Supabase SQL Editor.'
          : err.message,
        true,
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });

  if (successBackBtn) {
    successBackBtn.addEventListener('click', () => {
      setCreateFormMode();
      showView('home');
    });
  }

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

  pilotsList.addEventListener('click', async (event) => {
    const editBtn = event.target.closest('[data-edit-pilot]');
    if (editBtn) {
      openEditPilot(editBtn.dataset.editPilot);
      return;
    }

    const copyEmailBtn = event.target.closest('[data-copy-pilot-email]');
    if (copyEmailBtn) {
      const email = copyEmailBtn.dataset.copyPilotEmail;
      if (email) {
        await copyText(email, copyEmailBtn);
        showPilotsBanner(`Copied ${email}`, false);
      }
      return;
    }

    const copyPasswordBtn = event.target.closest('[data-copy-pilot-password]');
    if (copyPasswordBtn) {
      const password = copyPasswordBtn.dataset.copyPilotPassword;
      if (password) {
        await copyText(password, copyPasswordBtn);
        showPilotsBanner('Copied temp password.', false);
      }
      return;
    }

    const resetBtn = event.target.closest('[data-reset-pilot]');
    if (!resetBtn) return;

    const email = resetBtn.dataset.resetPilot;
    if (!email) return;
    if (!window.confirm(`Send a password reset email to ${email}?`)) return;

    resetBtn.disabled = true;
    try {
      await sendPasswordReset(email);
      showPilotsBanner(`Reset email sent to ${email}.`, false);
    } catch (err) {
      showPilotsBanner(err.message, true);
    } finally {
      resetBtn.disabled = false;
    }
  });
})();
