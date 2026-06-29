const COMPLETION_FIELDS = [
  { key: 'businessName', label: 'Business name', weight: 15, check: (d) => Boolean(d.businessName?.trim()) },
  { key: 'yearsExperience', label: 'Years of experience', weight: 10, check: (d) => d.yearsExperience != null && d.yearsExperience !== '' },
  { key: 'phone', label: 'Phone number', weight: 15, check: (d) => Boolean(d.phone?.trim()) },
  { key: 'email', label: 'Email', weight: 10, check: (d) => Boolean(d.email?.trim()) },
  { key: 'services', label: 'At least one service', weight: 15, check: (d) => (d.services || []).length > 0 },
  { key: 'statesCertified', label: 'Certified states', weight: 10, check: (d) => (d.statesCertified || []).length > 0 },
  { key: 'home', label: 'Home city and state', weight: 15, check: (d) => Boolean(d.homeCity?.trim() && d.homeState) },
  { key: 'description', label: 'Description', weight: 10, check: (d) => Boolean(d.description?.trim()) },
];

function listingCompletionFromData(data) {
  const normalized = normalizeListing(data || {});
  let score = 0;
  const missing = [];

  COMPLETION_FIELDS.forEach((field) => {
    if (field.check(normalized)) {
      score += field.weight;
    } else {
      missing.push(field.label);
    }
  });

  return {
    percent: Math.min(100, Math.round(score)),
    missing,
    isComplete: score >= 100,
  };
}

function listingCompletionFromForm(form) {
  if (!form) return listingCompletionFromData(null);

  const services = [...form.querySelectorAll('input[name="services"]:checked')].map((el) => el.value);
  const statesCertified = [...form.querySelectorAll('input[name="statesCertified"]:checked')].map((el) => el.value);

  return listingCompletionFromData({
    businessName: form.businessName?.value,
    yearsExperience: form.yearsExperience?.value,
    phone: form.phone?.value,
    email: form.email?.value,
    services,
    statesCertified,
    homeCity: form.homeCity?.value,
    homeState: form.homeState?.value,
    description: form.description?.value,
  });
}

function renderListingCompletion(container, completion) {
  if (!container) return;

  const pctEl = container.querySelector('[data-completion-pct]');
  const fillEl = container.querySelector('[data-completion-fill]');
  const tipsEl = container.querySelector('[data-completion-tips]');

  if (pctEl) pctEl.textContent = `${completion.percent}%`;
  if (fillEl) fillEl.style.width = `${completion.percent}%`;

  const barEl = container.querySelector('[data-completion-bar]');
  if (barEl) {
    barEl.setAttribute('aria-valuenow', String(completion.percent));
    barEl.setAttribute('aria-valuetext', `${completion.percent}% complete`);
  }

  if (tipsEl) {
    tipsEl.innerHTML = '';
    if (completion.isComplete) {
      const li = document.createElement('li');
      li.textContent = 'Your listing is complete — carriers see everything they need.';
      tipsEl.appendChild(li);
    } else if (completion.missing.length) {
      completion.missing.slice(0, 3).forEach((tip) => {
        const li = document.createElement('li');
        li.textContent = `Add ${tip.toLowerCase()}`;
        tipsEl.appendChild(li);
      });
    }
  }

  container.classList.toggle('is-complete', completion.isComplete);
}