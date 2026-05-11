/* ═══════ LANDING ═══════ */
const Landing = {
  init() {
    const hero = document.getElementById('heroTyping');
    if (hero) {
      Utils.typeWriter(hero, 'Detect phishing, learn scam tactics, and test your cyber awareness with AI-powered tools.', 30);
    }
    // Animate stat counters when visible
    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { Utils.animateCounters(statsBar); obs.unobserve(e.target); }
        });
      }, { threshold: 0.3 });
      obs.observe(statsBar);
    }
    // Animate feature cards with stagger
    document.querySelectorAll('.feature-card').forEach((card, i) => {
      card.style.animationDelay = `${i * 100}ms`;
    });
  }
};
