runWhenReady(() => {
  initNav('login');

  const form = document.getElementById('forgot-form');
  const message = document.getElementById('forgot-message');

  if (useLocalDev()) {
    message.hidden = false;
    message.classList.add('is-error');
    message.textContent = 'Password reset requires Supabase. Disable DEV_MODE in config.js to use this feature.';
    form.hidden = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(form).get('email');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    message.hidden = false;
    message.classList.remove('is-error');

    try {
      await sendPasswordReset(email);
      message.textContent = 'If an account exists for that email, reset instructions have been sent.';
      message.classList.add('is-success');
    } catch (err) {
      message.textContent = err.message;
      message.classList.add('is-error');
      btn.disabled = false;
    }
  });
});
