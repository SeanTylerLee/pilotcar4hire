runWhenReady(() => {
  initNav('index');

  const welcomeSection = document.getElementById('welcome-section');
  const welcomeName = document.getElementById('welcome-name');
  const welcomeRole = document.getElementById('welcome-role');
  const welcomePrimary = document.getElementById('welcome-primary');
  const heroSection = document.getElementById('hero-section');
  const driverSection = document.getElementById('driver-section');

  const user = getCurrentUser();

  if (user && welcomeSection) {
    if (heroSection) heroSection.hidden = true;
    welcomeSection.hidden = false;
    if (driverSection) driverSection.hidden = true;
    welcomeName.textContent = user.name;
    welcomeRole.textContent = 'Manage your pilot car listing.';
    welcomePrimary.href = 'pilot-car.html';
    welcomePrimary.textContent = 'My listing';
  }
});