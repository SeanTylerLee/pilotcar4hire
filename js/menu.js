const NAV = `
  <ul class="nav-links">
    <li><a href="index.html" data-nav="index">Home</a></li>
    <li><a href="index.html#map" data-nav="browse">Find pilot cars</a></li>
    <li><a href="pilot-car.html" data-nav="pilot-car">My listing</a></li>
    <li><a href="login.html" data-nav="login">Log in</a></li>
    <li><a href="signup.html" data-nav="signup">Sign up</a></li>
    <li><a href="account.html" data-nav="account">Account</a></li>
  </ul>
  <p class="nav-user" id="nav-user" hidden></p>
  <button type="button" class="nav-logout" id="logout-btn" hidden>Log out</button>
`;

function initNav(currentPage) {
  const navPanel = document.querySelector('.nav-panel');
  if (!navPanel) return;

  navPanel.innerHTML = NAV;

  const currentLink = navPanel.querySelector(`[data-nav="${currentPage}"]`);
  if (currentLink) currentLink.setAttribute('aria-current', 'page');

  refreshNavUser();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const isOpen = menuBtn.classList.toggle('is-open');
      navPanel.hidden = !isOpen;
      menuBtn.setAttribute('aria-expanded', isOpen);
      menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    navPanel.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.id === 'logout-btn') return;
        menuBtn.classList.remove('is-open');
        navPanel.hidden = true;
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Open menu');
      });
    });
  }
}
