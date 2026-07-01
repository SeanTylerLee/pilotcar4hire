(async function initAdminLogin() {
  const form = document.getElementById('admin-login-form');
  const message = document.getElementById('admin-login-message');
  if (!form || !message) return;

  const params = new URLSearchParams(window.location.search);
  const urlError = params.get('error');
  if (urlError) {
    message.textContent = urlError;
    message.classList.add('is-error');
    message.hidden = false;
  }

  try {
    const admin = await getAdminSession();
    if (admin) {
      window.location.href = 'admin-dashboard.html';
      return;
    }
  } catch (err) {
    message.textContent = err.message || 'Could not check login status.';
    message.classList.add('is-error');
    message.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    message.hidden = true;
    message.classList.remove('is-error');

    try {
      const data = new FormData(form);
      await adminLogin(data.get('email'), data.get('password'));
      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      message.textContent = err.message;
      message.classList.add('is-error');
      message.hidden = false;
      btn.disabled = false;
    }
  });
})();
