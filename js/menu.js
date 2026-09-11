function initNav() {
  const toggle = document.getElementById('footer-menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!toggle || !menu) return;
  if (toggle.dataset.bound === 'true') return;
  toggle.dataset.bound = 'true';

  const sheet = menu.querySelector('.site-menu-sheet');
  const closeBtns = menu.querySelectorAll('[data-close-menu]');

  function openMenu() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    sheet?.focus();
  }

  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    toggle.focus();
  }

  function isOpen() {
    return !menu.hidden;
  }

  toggle.addEventListener('click', () => {
    if (isOpen()) closeMenu();
    else openMenu();
  });

  closeBtns.forEach((btn) => btn.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) closeMenu();
  });

  const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  menu.querySelectorAll('.site-menu-nav a[href]').forEach((link) => {
    const href = (link.getAttribute('href') || '').split('#')[0].split('?')[0].toLowerCase();
    if (href && href === path) link.setAttribute('aria-current', 'page');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initNav());
} else {
  initNav();
}
