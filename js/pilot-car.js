initNav('pilot-car');

const user = getCurrentUser();
const userId = user?.id || 'dev-pilot';
const form = document.getElementById('listing-form');
const message = document.getElementById('listing-message');
const previewSection = document.getElementById('listing-preview-section');
const previewEl = document.getElementById('listing-preview');
const deleteBtn = document.getElementById('delete-listing-btn');
const formHeading = document.getElementById('form-heading');

function showMessage(text, isError) {
  message.textContent = text;
  message.hidden = false;
  message.classList.toggle('is-error', isError);
}

function renderPreview(listing) {
  if (!listing) {
    previewSection.hidden = true;
    formHeading.textContent = 'Create your listing';
    return;
  }

  previewSection.hidden = false;
  formHeading.textContent = 'Edit your listing';
  previewEl.innerHTML = '';
  const card = renderListingCard(getListingWithUser(listing), { showContact: false });
  previewEl.appendChild(card);
}

function loadListing() {
  const listing = getListingByUserId(userId);
  if (!listing) {
    if (user) form.businessName.value = user.name;
    renderPreview(null);
    return;
  }

  form.businessName.value = listing.businessName;
  form.phone.value = listing.phone;
  form.states.value = listing.states;
  form.serviceArea.value = listing.serviceArea || listing.corridors || '';
  form.availability.value = listing.availability || '';
  form.notes.value = listing.notes || '';

  form.querySelectorAll('input[name="escortTypes"]').forEach((input) => {
    input.checked = listing.escortTypes.includes(input.value);
  });

  renderPreview(listing);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  message.hidden = true;

  const escortTypes = [...form.querySelectorAll('input[name="escortTypes"]:checked')].map((el) => el.value);
  if (escortTypes.length === 0) {
    showMessage('Select at least one escort type.', true);
    return;
  }

  const existing = getListingByUserId(userId);
  const listing = {
    id: existing?.id || crypto.randomUUID(),
    userId,
    businessName: form.businessName.value.trim(),
    phone: form.phone.value.trim(),
    escortTypes,
    states: form.states.value.trim(),
    serviceArea: form.serviceArea.value.trim(),
    availability: form.availability.value.trim(),
    notes: form.notes.value.trim(),
    updatedAt: Date.now(),
  };

  upsertListing(listing);
  showMessage('Listing saved. Carriers can now find you.', false);
  renderPreview(listing);
});

deleteBtn.addEventListener('click', () => {
  if (!confirm('Remove your listing? Carriers will no longer see it.')) return;
  deleteListingByUserId(userId);
  form.reset();
  if (user) form.businessName.value = user.name;
  message.hidden = true;
  renderPreview(null);
});

loadListing();
