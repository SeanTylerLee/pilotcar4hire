runWhenReady(() => {
  initNav('index');

  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const welcomeSection = document.getElementById('welcome-section');
  const authSections = document.getElementById('auth-sections');
  const welcomeName = document.getElementById('welcome-name');
  const welcomeRole = document.getElementById('welcome-role');
  const welcomePrimary = document.getElementById('welcome-primary');
  const heroSection = document.getElementById('hero-section');
  const driverSection = document.getElementById('driver-section');

  let user = getCurrentUser();

  if (user && welcomeSection) {
    if (heroSection) heroSection.hidden = true;
    welcomeSection.hidden = false;
    if (authSections) authSections.hidden = true;
    if (driverSection) {
      const driverHead = driverSection.querySelector('.driver-section-head');
      if (driverHead) driverHead.hidden = true;
    }
    welcomeName.textContent = user.name;
    welcomeRole.textContent = 'Manage your pilot car listing.';
    welcomePrimary.href = 'pilot-car.html';
    welcomePrimary.textContent = 'My listing';
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

  function setFormLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = loading;
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = loading ? 'Please wait…' : btn.dataset.originalText;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFormLoading(loginForm, true);
      try {
        const data = new FormData(loginForm);
        await login(data.get('email'), data.get('password'));
        redirectAfterLogin();
      } catch (err) {
        showFormError(loginForm, err.message);
      } finally {
        setFormLoading(loginForm, false);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFormLoading(signupForm, true);
      try {
        const data = new FormData(signupForm);
        await signup({
          name: data.get('name'),
          email: data.get('email'),
          password: data.get('password'),
        });
        redirectAfterLogin();
      } catch (err) {
        showFormError(signupForm, err.message);
      } finally {
        setFormLoading(signupForm, false);
      }
    });
  }
});
