runWhenReady(async () => {
  const admin = await getAdminSession();
  if (admin) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  const form = document.getElementById('admin-login-form');
  const message = document.getElementById('admin-login-message');

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
});
