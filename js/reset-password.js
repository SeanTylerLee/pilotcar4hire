runWhenReady(async () => {
  initNav('login');

  const form = document.getElementById('reset-form');
  const message = document.getElementById('reset-message');

  if (useLocalDev()) {
    message.hidden = false;
    message.classList.add('is-error');
    message.textContent = 'Password reset requires Supabase. Disable DEV_MODE in config.js to use this feature.';
    form.hidden = true;
    return;
  }

  await initAuth();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    message.hidden = false;
    message.classList.add('is-error');
    message.textContent = 'This reset link is invalid or has expired. Request a new one.';
    form.hidden = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.hidden = true;

    const data = new FormData(form);
    const password = data.get('password');
    const confirm = data.get('confirmPassword');

    if (password !== confirm) {
      message.hidden = false;
      message.classList.add('is-error');
      message.textContent = 'Passwords do not match.';
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      await updatePassword(password);
      message.hidden = false;
      message.classList.remove('is-error');
      message.classList.add('is-success');
      message.textContent = 'Password updated. Redirecting to log in…';
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (err) {
      message.hidden = false;
      message.classList.add('is-error');
      message.textContent = err.message;
      btn.disabled = false;
    }
  });
});
