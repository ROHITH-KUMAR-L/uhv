/* ═══════ SPA ROUTER ═══════ */
const App = {
  routes: {
    '/':           { tpl: 'tpl-landing',     init: () => Landing.init(),     title: 'ScamShield — Stay Safe Online' },
    '/login':      { tpl: 'tpl-login',       init: () => Auth.bindForms(),   title: 'Login — ScamShield' },
    '/dashboard':  { tpl: 'tpl-dashboard',   init: () => Dashboard.init(),   title: 'Dashboard — ScamShield', auth: true },
    '/quiz':       { tpl: 'tpl-quiz',        init: () => Quiz.init(),        title: 'Quiz — ScamShield' },
    '/simulate':   { tpl: 'tpl-simulate',    init: () => Simulation.init(),  title: 'Simulations — ScamShield' },
    '/leaderboard':{ tpl: 'tpl-leaderboard', init: () => Leaderboard.init(), title: 'Leaderboard — ScamShield' },
  },

  navigate(path) {
    const route = this.routes[path];
    if (!route) { this.navigate('/'); return; }

    // Auth guard
    if (route.auth && !Auth.isLoggedIn()) {
      Utils.toast('Please login to access the dashboard', 'info');
      window.location.hash = '#/login';
      return;
    }

    // Render template
    const tpl = document.getElementById(route.tpl);
    const app = document.getElementById('app');
    app.style.opacity = '0';
    app.style.transform = 'translateY(10px)';

    setTimeout(() => {
      app.innerHTML = '';
      app.appendChild(tpl.content.cloneNode(true));
      document.title = route.title;

      // Update active nav link
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${path}`);
      });

      // Fade in
      requestAnimationFrame(() => {
        app.style.transition = 'opacity .35s ease, transform .35s ease';
        app.style.opacity = '1';
        app.style.transform = 'translateY(0)';
      });

      // Init page
      route.init();
    }, 150);
  },

  init() {
    Auth.init();

    // Mobile nav toggle
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (toggle) {
      toggle.onclick = () => navLinks.classList.toggle('open');
    }
    // Close mobile nav on link click
    navLinks.addEventListener('click', (e) => {
      if (e.target.matches('.nav-link')) navLinks.classList.remove('open');
    });

    // Hash router
    const onRoute = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      this.navigate(hash);
    };
    window.addEventListener('hashchange', onRoute);
    onRoute();
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
