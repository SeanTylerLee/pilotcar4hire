function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function listingCardHtml(listing, { showContact = true } = {}) {
  const data = normalizeListing(listing);
  const badges = (data.services || [])
    .map((s) => `<span class="badge">${escapeHtml(getServiceLabel(s))}</span>`)
    .join('');

  const experience = data.yearsExperience != null && data.yearsExperience !== ''
    ? `<div><dt>Experience</dt><dd>${escapeHtml(data.yearsExperience)} year${data.yearsExperience === 1 ? '' : 's'}</dd></div>`
    : '';

  const contactEmail = data.email;
  const contact = showContact ? `
    <div class="listing-contact">
      <a href="tel:${escapeHtml(data.phone)}" class="btn-submit btn-small" aria-label="Call ${escapeHtml(data.businessName)} at ${escapeHtml(data.phone)}">Call ${escapeHtml(data.phone)}</a>
      ${contactEmail ? `<a href="mailto:${escapeHtml(contactEmail)}" class="btn-secondary btn-small">Email</a>` : ''}
    </div>
  ` : '';

  return `
    <div class="listing-card-head">
      <h2 class="listing-name">${escapeHtml(data.businessName)}</h2>
      <div class="badges">${badges}</div>
    </div>
    <dl class="listing-details">
      ${experience}
      <div><dt>Based in</dt><dd>${escapeHtml(formatHomeLocation(data.homeCity, data.homeState))}</dd></div>
      <div><dt>States certified</dt><dd>${escapeHtml(formatStatesList(data.statesCertified))}</dd></div>
      ${data.description ? `<div><dt>Description</dt><dd>${escapeHtml(data.description)}</dd></div>` : ''}
    </dl>
    ${contact}
  `;
}

function renderListingCard(listing, options = {}) {
  const { showContact = true, showReport = showContact } = options;
  const card = document.createElement('article');
  card.className = 'listing-card panel';
  card.innerHTML = listingCardHtml(listing, { showContact });
  if (showReport && typeof attachReportListingButton === 'function') {
    attachReportListingButton(card, listing);
  }
  return card;
}
