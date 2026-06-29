initNav('forgot-password');

const form = document.getElementById('forgot-form');
const message = document.getElementById('forgot-message');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = new FormData(form).get('email');
  const user = getUserByEmail(email);

  message.hidden = false;
  message.classList.remove('is-error');

  if (!user) {
    message.textContent = 'If an account exists for that email, reset instructions will be sent.';
    return;
  }

  message.textContent = 'Reset link sent (demo). Check your email when the backend is connected.';
  form.querySelector('button').disabled = true;
});
