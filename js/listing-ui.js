function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function listingCardHtml(listing, { showContact = true } = {}) {
  const serviceArea = listing.serviceArea || listing.corridors || '';
  const badges = (listing.escortTypes || [])
    .map((t) => `<span class="badge">${escapeHtml(t)}</span>`)
    .join('');

  const contact = showContact ? `
    <div class="listing-contact">
      <a href="tel:${escapeHtml(listing.phone)}" class="btn-submit btn-small" aria-label="Call ${escapeHtml(listing.businessName)} at ${escapeHtml(listing.phone)}">Call ${escapeHtml(listing.phone)}</a>
      ${listing.userEmail ? `<a href="mailto:${escapeHtml(listing.userEmail)}" class="btn-secondary btn-small">Email</a>` : ''}
    </div>
  ` : '';

  return `
    <div class="listing-card-head">
      <h2 class="listing-name">${escapeHtml(listing.businessName)}</h2>
      <div class="badges">${badges}</div>
    </div>
    <dl class="listing-details">
      <div><dt>States certified</dt><dd>${escapeHtml(listing.states)}</dd></div>
      <div><dt>Service area</dt><dd>${escapeHtml(serviceArea)}</dd></div>
      ${listing.availability ? `<div><dt>Availability</dt><dd>${escapeHtml(listing.availability)}</dd></div>` : ''}
      ${listing.notes ? `<div><dt>Notes</dt><dd>${escapeHtml(listing.notes)}</dd></div>` : ''}
    </dl>
    ${contact}
  `;
}

function renderListingCard(listing, options = {}) {
  const card = document.createElement('article');
  card.className = 'listing-card panel';
  card.innerHTML = listingCardHtml(listing, options);
  return card;
}