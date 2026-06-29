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
}

if (!user) {
  guest.hidden = false;
} else {
  content.hidden = false;
  profileForm.name.value = user.name;
  profileForm.email.value = user.email;
  profileForm.role.value = user.role === 'pilot-car' ? 'Pilot car' : 'Carrier';
  dashboardLink.href = user.role === 'pilot-car' ? 'pilot-car.html' : 'browse.html';
  dashboardLink.textContent = user.role === 'pilot-car' ? 'My listing' : 'Find pilot cars';
  roleHint.textContent = user.role === 'pilot-car'
    ? 'Your listing is visible to carriers on the browse page.'
    : 'You can search pilot cars without an account.';

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    profileMessage.hidden = true;
    try {
      const current = getCurrentUser();
      updateUser(current.id, { name: profileForm.name.value.trim() });
      showMessage(profileMessage, 'Profile updated.', false);
      const navUser = document.getElementById('nav-user');
      if (navUser) navUser.textContent = profileForm.name.value.trim();
    } catch (err) {
      showMessage(profileMessage, err.message, true);
    }
  });

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    passwordMessage.hidden = true;
    const data = new FormData(passwordForm);
    const current = getCurrentUser();

    if (current.password !== data.get('currentPassword')) {
      showMessage(passwordMessage, 'Current password is incorrect.', true);
      return;
    }

    updateUser(current.id, { password: data.get('newPassword') });
    showMessage(passwordMessage, 'Password updated.', false);
    passwordForm.reset();
  });

  logoutBtn.addEventListener('click', logout);
}
