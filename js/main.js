const menuBtn = document.querySelector('.menu-btn');

if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    const isOpen = menuBtn.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', isOpen);
    menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
}

document.querySelectorAll('.auth-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });
});
