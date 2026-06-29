runWhenReady(async () => {
  initNav('pilot-car');

  if (useLocalDev()) {
    const banner = document.getElementById('dev-banner');
    if (banner) banner.hidden = false;
  }

  const user = await requireAuth();
  if (!user) return;

  const userId = user.id;
  const form = document.getElementById('listing-form');
  const message = document.getElementById('listing-message');
  const liveSection = document.getElementById('listing-live-section');
  const previewEl = document.getElementById('listing-preview');
  const deleteBtn = document.getElementById('delete-listing-btn');
  const scrollToEditBtn = document.getElementById('scroll-to-edit');
  const editSection = document.getElementById('listing-edit-section');
  const formHeading = document.getElementById('form-heading');
  const servicesEl = document.getElementById('services-checkboxes');
  const statesGrid = document.getElementById('states-certified-grid');
  const homeStateSelect = document.getElementById('home-state-select');

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
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('is-error', isError);
    message.classList.toggle('is-success', !isError);
  }

  function renderLiveListing(listing) {
    if (!listing) {
      liveSection.hidden = true;
      formHeading.textContent = 'Create your listing';
      return;
    }

    liveSection.hidden = false;
    formHeading.textContent = 'Edit your listing';
    previewEl.innerHTML = '';
    previewEl.appendChild(renderListingCard(listing, { showContact: true }));
  }

  function fillForm(listing) {
    const data = normalizeListing(listing) || {};

    form.businessName.value = data.businessName || user.name;
    form.yearsExperience.value = data.yearsExperience ?? '';
    form.phone.value = data.phone || '';
    form.email.value = data.email || user.email || '';
    form.homeCity.value = data.homeCity || '';
    form.homeState.value = data.homeState || '';
    form.description.value = data.description || '';

    form.querySelectorAll('input[name="services"]').forEach((input) => {
      input.checked = data.services?.includes(input.value) || false;
    });

    form.querySelectorAll('input[name="statesCertified"]').forEach((input) => {
      input.checked = data.statesCertified?.includes(input.value) || false;
    });
  }

  function getSelectedServices() {
    return [...form.querySelectorAll('input[name="services"]:checked')].map((el) => el.value);
  }

  function getSelectedStates() {
    return [...form.querySelectorAll('input[name="statesCertified"]:checked')].map((el) => el.value);
  }

  async function loadListing() {
    try {
      const listing = await getListingByUserId(userId);
      fillForm(listing);
      renderLiveListing(listing);
    } catch (err) {
      showMessage(err.message, true);
    }
  }

  scrollToEditBtn.addEventListener('click', () => {
    editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.businessName.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.hidden = true;

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

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const existing = await getListingByUserId(userId);
      const listing = await upsertListing({
        id: existing?.id,
        userId,
        businessName: form.businessName.value.trim(),
        yearsExperience: Number(form.yearsExperience.value),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        services,
        statesCertified,
        homeState: form.homeState.value,
        homeCity: form.homeCity.value.trim(),
        description: form.description.value.trim(),
      });

      showMessage('Listing saved. Carriers can now find you on the map.', false);
      renderLiveListing(listing);
      liveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Remove your listing? Carriers will no longer see it.')) return;

    try {
      await deleteListingByUserId(userId);
      form.reset();
      fillForm(null);
      message.hidden = true;
      renderLiveListing(null);
    } catch (err) {
      showMessage(err.message, true);
    }
  });

  await loadListing();
});
