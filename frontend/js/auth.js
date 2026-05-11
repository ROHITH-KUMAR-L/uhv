/* ═══════ AUTH ═══════ */
const Auth = {
  _emailStep: 'send', // 'send' or 'verify'
  _phoneStep: 'send',

  isLoggedIn() { return !!localStorage.getItem('ss_token'); },
  getUser() { try { return JSON.parse(localStorage.getItem('ss_user') || 'null'); } catch { return null; } },

  updateUI() {
    const authEl = document.getElementById('navAuth');
    const userEl = document.getElementById('navUser');
    if (this.isLoggedIn()) {
      authEl.classList.add('hidden');
      userEl.classList.remove('hidden');
    } else {
      authEl.classList.remove('hidden');
      userEl.classList.add('hidden');
    }
  },

  logout() {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    this.updateUI();
    window.location.hash = '#/';
    Utils.toast('Logged out successfully', 'success');
  },

  async fetchProfile() {
    try {
      const res = await Api.get('/auth/me');
      if (res.data) localStorage.setItem('ss_user', JSON.stringify(res.data));
      return res.data;
    } catch { return null; }
  },

  init() {
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

    // Tab switching
    document.addEventListener('click', e => {
      if (!e.target.matches('.auth-tab')) return;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const tab = e.target.dataset.tab;
      document.getElementById('emailForm').classList.toggle('hidden', tab !== 'email');
      document.getElementById('phoneForm').classList.toggle('hidden', tab !== 'phone');
    });

    this.updateUI();
  },

  bindForms() {
    this._emailStep = 'send';
    this._phoneStep = 'send';

    const emailForm = document.getElementById('emailForm');
    const phoneForm = document.getElementById('phoneForm');
    const googleBtn = document.getElementById('googleLoginBtn');

    if (emailForm) {
      emailForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value.trim();
        const btn = document.getElementById('emailSubmitBtn');
        btn.disabled = true; btn.textContent = 'Please wait...';

        try {
          if (this._emailStep === 'send') {
            await Api.post('/auth/email/send-code', { email });
            document.getElementById('emailCodeGroup').classList.remove('hidden');
            btn.textContent = 'Verify & Login';
            this._emailStep = 'verify';
            Utils.toast('Verification code sent to your email!', 'success');
          } else {
            const code = document.getElementById('authEmailCode').value.trim();
            const res = await Api.post('/auth/email/verify', { email, code });
            localStorage.setItem('ss_token', res.data.access_token);
            await this.fetchProfile();
            this.updateUI();
            Utils.toast('Login successful!', 'success');
            window.location.hash = '#/dashboard';
          }
        } catch (err) { Utils.toast(err.message, 'error'); }
        finally { btn.disabled = false; if (this._emailStep === 'send') btn.textContent = 'Send Code'; }
      };
    }

    if (phoneForm) {
      phoneForm.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('authPhone').value.trim();
        const btn = document.getElementById('phoneSubmitBtn');
        btn.disabled = true; btn.textContent = 'Please wait...';

        try {
          if (this._phoneStep === 'send') {
            await Api.post('/auth/otp/send', { phone });
            document.getElementById('otpCodeGroup').classList.remove('hidden');
            btn.textContent = 'Verify & Login';
            this._phoneStep = 'verify';
            Utils.toast('OTP sent to your phone!', 'success');
          } else {
            const otp_code = document.getElementById('authOTP').value.trim();
            const res = await Api.post('/auth/otp/verify', { phone, otp_code });
            localStorage.setItem('ss_token', res.data.access_token);
            await this.fetchProfile();
            this.updateUI();
            Utils.toast('Login successful!', 'success');
            window.location.hash = '#/dashboard';
          }
        } catch (err) { Utils.toast(err.message, 'error'); }
        finally { btn.disabled = false; if (this._phoneStep === 'send') btn.textContent = 'Send OTP'; }
      };
    }

    if (googleBtn) {
      googleBtn.onclick = async () => {
        try {
          const res = await Api.get('/auth/google');
          if (res.url) window.location.href = res.url;
        } catch (err) { Utils.toast(err.message, 'error'); }
      };
    }
  }
};
