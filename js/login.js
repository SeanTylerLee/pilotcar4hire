runWhenReady(() => {
  initNav('login');

  const user = getCurrentUser();
  if (user) {
    redirectAfterLogin();
    return;
  }

  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    message.hidden = true;
    message.classList.remove('is-error', 'is-success');

    try {
      const data = new FormData(form);
      await login(data.get('email'), data.get('password'));
      redirectAfterLogin();
    } catch (err) {
      message.textContent = err.message;
      message.classList.add('is-error');
      message.hidden = false;
      btn.disabled = false;
    }
  });
});