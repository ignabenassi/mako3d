// Menú en celular
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
}

// Analytics: contactos y visitas al cotizador desde las guías
document.querySelectorAll('a[href^="https://wa.me"], a[href^="mailto:"], a[href="/cotizar"]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof gtag !== 'function') return;
    const page = location.pathname;
    if (link.getAttribute('href') === '/cotizar') {
      gtag('event', 'ir_al_cotizador', { location: 'guia', page_path: page });
    } else {
      gtag('event', 'generate_lead', { method: link.href.startsWith('mailto:') ? 'email' : 'whatsapp', location: 'guia', page_path: page });
    }
  });
});
