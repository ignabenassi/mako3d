// --- Menú en celular ---
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));
}

// --- Aparición suave al bajar (el contenido está en el HTML; solo se anima) ---
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: .12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// --- Contadores del hero ---
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const co = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / 1100, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
    co.unobserve(el);
  }), { threshold: .6 });
  counters.forEach(c => co.observe(c));
}

// --- Deslizador antes / después ---
const ba = document.getElementById('ba');
if (ba) {
  const after = ba.querySelector('.after'), handle = ba.querySelector('.handle');
  let dragging = false;
  const setPos = x => {
    const r = ba.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, (x - r.left) / r.width * 100));
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = pct + '%';
  };
  ba.addEventListener('pointerdown', e => { dragging = true; ba.setPointerCapture(e.pointerId); setPos(e.clientX); });
  ba.addEventListener('pointermove', e => { if (dragging) setPos(e.clientX); });
  ba.addEventListener('pointerup', () => { dragging = false; });
  ba.addEventListener('keydown', e => {
    const cur = parseFloat(handle.style.left) || 50;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const r = ba.getBoundingClientRect();
      setPos(r.left + r.width * Math.max(0, Math.min(100, cur + (e.key === 'ArrowLeft' ? -5 : 5))) / 100);
    }
  });
}

// --- Analytics: contactos (WhatsApp / email) como leads ---
const where = el => {
  if (el.classList.contains('wa-float')) return 'boton_flotante';
  const s = el.closest('section, header, footer');
  return s ? (s.id || s.tagName.toLowerCase()) : 'otro';
};
document.querySelectorAll('a[href^="https://wa.me"], a[href^="mailto:"]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof gtag !== 'function') return;
    gtag('event', 'generate_lead', {
      method: link.href.startsWith('mailto:') ? 'email' : 'whatsapp',
      location: where(link)
    });
  });
});

// --- Analytics: desde qué botón entran al cotizador online ---
document.querySelectorAll('a[href="/cotizar"], a[href="cotizar"]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof gtag !== 'function') return;
    gtag('event', 'ir_al_cotizador', { location: where(link) });
  });
});
