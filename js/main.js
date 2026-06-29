initNav('index');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const welcomeSection = document.getElementById('welcome-section');
const authSections = document.getElementById('auth-sections');
const welcomeName = document.getElementById('welcome-name');
const welcomeRole = document.getElementById('welcome-role');
const welcomePrimary = document.getElementById('welcome-primary');

const heroSection = document.getElementById('hero-section');
const featuresSection = document.getElementById('features-section');

const user = getCurrentUser();
if (user && welcomeSection && authSections) {
  if (heroSection) heroSection.hidden = true;
  if (featuresSection) featuresSection.hidden = true;
  welcomeSection.hidden = false;
  authSections.hidden = true;
  welcomeName.textContent = user.name;
  welcomeRole.textContent = user.role === 'pilot-car'
    ? 'Manage your pilot car listing.'
    : 'Search for certified pilot car escorts.';
  welcomePrimary.href = user.role === 'pilot-car' ? 'pilot-car.html' : 'browse.html';
  welcomePrimary.textContent = user.role === 'pilot-car' ? 'My listing' : 'Find pilot cars';
}

function showFormError(form, text) {
  let el = form.querySelector('.form-message');
  if (!el) {
    el = document.createElement('p');
    el.className = 'form-message is-error';
    form.appendChild(el);
  }
  el.textContent = text;
  el.hidden = false;
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const data = new FormData(loginForm);
      const loggedIn = login(data.get('email'), data.get('password'));
      redirectForRole(loggedIn.role);
    } catch (err) {
      showFormError(loginForm, err.message);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const data = new FormData(signupForm);
      const newUser = signup({
        name: data.get('name'),
        email: data.get('email'),
        password: data.get('password'),
        role: data.get('role'),
      });
      redirectForRole(newUser.role);
    } catch (err) {
      showFormError(signupForm, err.message);
    }
  });
}
