runWhenReady(async () => {
  initNav('account');

  const guest = document.getElementById('account-guest');
  const content = document.getElementById('account-content');
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const profileMessage = document.getElementById('profile-message');
  const passwordMessage = document.getElementById('password-message');
  const dashboardLink = document.getElementById('account-dashboard');
  const logoutBtn = document.getElementById('account-logout');
  const roleHint = document.getElementById('account-role-hint');

  const user = getCurrentUser();

  function showMessage(el, text, isError) {
    el.textContent = text;
    el.hidden = false;
    el.classList.toggle('is-error', isError);
    el.classList.toggle('is-success', !isError);
  }

  if (!user) {
    guest.hidden = false;
    return;
  }

  content.hidden = false;
  profileForm.name.value = user.name;
  profileForm.email.value = user.email;
  profileForm.role.value = 'Pilot car';
  dashboardLink.href = 'pilot-car.html';
  dashboardLink.textContent = 'My listing';
  roleHint.textContent = 'Your listing is visible to carriers on the browse page.';

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileMessage.hidden = true;
    try {
      await updateProfileName(profileForm.name.value);
      showMessage(profileMessage, 'Profile updated.', false);
    } catch (err) {
      showMessage(profileMessage, err.message, true);
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordMessage.hidden = true;
    const data = new FormData(passwordForm);

    try {
      await updatePassword(data.get('newPassword'));
      showMessage(passwordMessage, 'Password updated.', false);
      passwordForm.reset();
    } catch (err) {
      showMessage(passwordMessage, err.message, true);
    }
  });

  logoutBtn.addEventListener('click', logout);
});
