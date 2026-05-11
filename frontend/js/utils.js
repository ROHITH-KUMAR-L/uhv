/* ═══════ UTILS ═══════ */
const Utils = {
  /* Toast notifications */
  toast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-10px)'; setTimeout(() => t.remove(), 300); }, 3500);
  },

  /* Animated counter */
  animateCounters(container) {
    const nums = container.querySelectorAll('[data-target]');
    nums.forEach(el => {
      const target = +el.dataset.target;
      const step = target / 60;
      let current = 0;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.floor(current).toLocaleString();
      }, 25);
    });
  },

  /* Typing effect */
  typeWriter(el, text, speed = 40) {
    let i = 0;
    el.textContent = '';
    return new Promise(resolve => {
      const t = setInterval(() => {
        if (i < text.length) { el.textContent += text.charAt(i); i++; }
        else { clearInterval(t); resolve(); }
      }, speed);
    });
  },

  /* Intersection observer for scroll animations */
  observeElements(selector, className = 'animate-fade-up') {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add(className); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(selector).forEach(el => obs.observe(el));
  },

  /* Format date */
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  /* Escape HTML */
  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
};
