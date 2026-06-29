const REPORT_EMAIL = 'support@pilotcar4hire.com';

function buildReportMailto(listing) {
  const data = normalizeListing(listing);
  const subject = encodeURIComponent(`Report listing: ${data.businessName || 'Pilot car'}`);
  const body = encodeURIComponent(
    `I would like to report a listing on Pilot Car 4 Hire.\n\n`
    + `Business: ${data.businessName || '—'}\n`
    + `Location: ${formatHomeLocation(data.homeCity, data.homeState)}\n`
    + `Listing ID: ${data.id || '—'}\n\n`
    + `Reason (incorrect info, spam, etc.):\n`,
  );
  return `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

function attachReportListingButton(container, listing) {
  if (!container || !listing) return;

  const existing = container.querySelector('.report-listing-btn');
  if (existing) existing.remove();

  const data = normalizeListing(listing);
  const wrap = document.createElement('p');
  wrap.className = 'listing-report';
  const btn = document.createElement('a');
  btn.className = 'report-listing-btn text-link';
  btn.href = buildReportMailto(listing);
  btn.textContent = 'Report listing';
  btn.setAttribute('aria-label', `Report ${data.businessName || 'this listing'}`);
  wrap.appendChild(btn);
  container.appendChild(wrap);
}