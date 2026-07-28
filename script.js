  // --- Barra de progreso de scroll ---
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      scrollProgress.style.width = pct + '%';
    }, { passive: true });
  }

  // --- Borde giratorio en fotos del portfolio (manejado por JS a propósito) ---
  document.querySelectorAll('.p-card').forEach(card => {
    let angle = 0;
    let rafId = null;
    function tick() {
      angle = (angle + 1) % 360;
      card.style.borderColor = 'transparent';
      card.style.background = `conic-gradient(from ${angle}deg, var(--blue), transparent 60deg) border-box`;
      rafId = requestAnimationFrame(tick);
    }
    card.addEventListener('mouseenter', () => {
      if (!rafId) tick();
    });
    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(rafId);
      rafId = null;
      card.style.borderColor = '';
      card.style.background = '';
    });
  });

  // --- Logo: volver arriba ---
  const logoTop = document.getElementById('logoTop');
  if (logoTop) {
    logoTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Botón flotante: volver arriba ---
  const toTop = document.getElementById('toTop');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Menú hamburguesa (móvil) ---
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      hamburger.textContent = isOpen ? '✕' : '☰';
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.textContent = '☰';
      });
    });
  }

// --- Contadores animados al entrar en viewport ---
  function animateCount(el){
    const raw = el.textContent.trim();
    const match = raw.match(/[\d.]+/);
    if(!match) return;
    const target = parseFloat(match[0]);
    const suffix = raw.replace(match[0], '');
    const isDecimalFree = !raw.includes('.') || raw.includes('×');
    if(raw.includes('×')) return; // "80×80×100" no se anima, se muestra directo
    let current = 0;
    const duration = 900;
    const start = performance.now();
    function tick(now){
      const p = Math.min((now - start) / duration, 1);
      current = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const revealTargets = document.querySelectorAll('.hero-stats div, .about-stats div');
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        const num = entry.target.querySelector('span');
        if(num) animateCount(num);
        revealObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.4});
  revealTargets.forEach(t => revealObserver.observe(t));

  // --- Revelado "impreso" de las tarjetas del portfolio ---
  const pCards = document.querySelectorAll('.p-card');
  const cardObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        cardObserver.unobserve(entry.target);
      }
    });
  }, {threshold:.15});
  pCards.forEach(card => cardObserver.observe(card));

  // --- Parallax sutil en portfolio ---
  const pImgs = document.querySelectorAll('.p-card img');
  function updateParallax(){
    const vh = window.innerHeight;
    pImgs.forEach(img=>{
      const rect = img.parentElement.getBoundingClientRect();
      const center = rect.top + rect.height/2 - vh/2;
      const offset = Math.max(-20, Math.min(20, center * -0.04));
      img.style.transform = `scale(1.08) translateY(${offset}px)`;
    });
  }
  window.addEventListener('scroll', updateParallax, {passive:true});
  window.addEventListener('resize', updateParallax);
  updateParallax();

  // --- Lightbox ---
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCap = document.getElementById('lbCap');
  document.querySelectorAll('.p-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const img = card.querySelector('img');
      const cap = card.querySelector('.cap p');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = cap ? cap.textContent : '';
      lightbox.classList.add('open');
    });
  });
  function closeLb(){ lightbox.classList.remove('open'); }
  document.getElementById('lbClose').addEventListener('click', closeLb);
  lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) closeLb(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeLb(); });
