runWhenReady(async () => {
  const admin = await getAdminSession();
  if (!admin) {
    window.location.href = 'admin.html';
    return;
  }

  const dashboardMessage = document.getElementById('admin-dashboard-message');
  const adminEmailEl = document.getElementById('admin-email');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const listingsBody = document.getElementById('admin-listings-body');
  const listingsEmpty = document.getElementById('admin-listings-empty');
  const statListings = document.getElementById('admin-stat-listings');
  const statProfiles = document.getElementById('admin-stat-profiles');

  if (adminEmailEl) adminEmailEl.textContent = admin.email;

  function showError(message) {
    if (!dashboardMessage) return;
    dashboardMessage.textContent = message;
    dashboardMessage.classList.add('is-error');
    dashboardMessage.hidden = false;
  }

  function formatServices(services) {
    return (services || [])
      .map((code) => getServiceLabel(code))
      .join(', ') || '—';
  }

  function formatDate(timestamp) {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadDashboard() {
    if (dashboardMessage) dashboardMessage.hidden = true;

    try {
      const [listings, profilesRes] = await Promise.all([
        getAllListingsWithUsers(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      if (profilesRes.error) throw new Error(profilesRes.error.message);

      if (statListings) statListings.textContent = String(listings.length);
      if (statProfiles) statProfiles.textContent = String(profilesRes.count ?? 0);

      if (!listingsBody) return;

      listingsBody.innerHTML = '';
      if (!listings.length) {
        if (listingsEmpty) listingsEmpty.hidden = false;
        return;
      }

      if (listingsEmpty) listingsEmpty.hidden = true;

      listings.forEach((listing) => {
        const data = normalizeListing(listing);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <strong>${escapeHtml(data.businessName || '—')}</strong>
            <span class="admin-table-sub">${escapeHtml(data.email || '')}</span>
          </td>
          <td>${escapeHtml(formatHomeLocation(data.homeCity, data.homeState))}</td>
          <td>${escapeHtml(formatServices(data.services))}</td>
          <td>${escapeHtml(formatDate(data.updatedAt))}</td>
        `;
        listingsBody.appendChild(row);
      });
    } catch (err) {
      showError(err.message || 'Failed to load admin data.');
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      adminLogout();
    });
  }

  await loadDashboard();
});
