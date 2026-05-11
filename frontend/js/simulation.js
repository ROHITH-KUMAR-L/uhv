/* ═══════ SIMULATION ENGINE ═══════ */
const Simulation = {
  init() {
    document.querySelectorAll('.sim-card').forEach(card => {
      card.onclick = () => this.load(card.dataset.sim);
    });
  },

  load(type) {
    document.getElementById('simPicker').classList.add('hidden');
    const container = document.getElementById('simContainer');
    container.classList.remove('hidden');

    const sims = { phishing: this.phishing, banking: this.banking, otp: this.otp, social: this.social };
    container.innerHTML = `<button class="btn btn-ghost sim-back" id="simBackBtn">← Back to Simulations</button><div id="simContent"></div>`;
    document.getElementById('simBackBtn').onclick = () => this.back();

    if (sims[type]) sims[type].call(this);
  },

  back() {
    document.getElementById('simPicker').classList.remove('hidden');
    document.getElementById('simContainer').classList.add('hidden');
  },

  showFeedback(container, title, flags) {
    const html = `<div class="sim-feedback"><div class="glass-card">
      <h3>${title}</h3>
      <ul>${flags.map(f => `<li>${f}</li>`).join('')}</ul>
    </div></div>`;
    container.insertAdjacentHTML('beforeend', html);
    container.querySelector('.sim-feedback').scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  /* ─── PHISHING EMAIL ─── */
  phishing() {
    const el = document.getElementById('simContent');
    el.innerHTML = `
      <h2 style="margin-bottom:1rem">📧 Phishing Email Simulation</h2>
      <p class="text-muted" style="margin-bottom:1.5rem">Examine this email carefully. Can you spot the red flags?</p>
      <div class="sim-email">
        <div class="email-toolbar">📥 Inbox — 1 unread message</div>
        <div class="email-header">
          <h3>🚨 Urgent: Your Account Has Been Compromised!</h3>
          <div class="email-meta">
            <span><strong>From:</strong> security@paypa1-support.com</span>
            <span><strong>To:</strong> you@email.com</span>
            <span><strong>Date:</strong> Today, 2:34 AM</span>
          </div>
        </div>
        <div class="email-body">
          <p>Dear Valued Customer,</p>
          <p>We have detected <span class="red-flag" title="🚩 Creating urgency is a classic phishing tactic">suspicious activity</span> on your account. Your account will be <span class="red-flag" title="🚩 Threatening account suspension pressures you to act fast">permanently suspended</span> within 24 hours unless you verify your identity.</p>
          <p style="margin:1rem 0">Click the button below to verify your account immediately:</p>
          <p><a class="suspicious-link" id="phishLink" href="javascript:void(0)">[Verify My Account Now →]</a></p>
          <p style="margin-top:1rem;font-size:.85rem;color:#666">If you did not make this request, please <span class="red-flag" title="🚩 Ironic — the entire email IS the unauthorized request">ignore this email</span>.</p>
          <p style="margin-top:1rem">Sincerely,<br><span class="red-flag" title="🚩 'paypa1' uses number 1 instead of letter l">PayPa1 Security Team</span></p>
        </div>
      </div>
      <div class="sim-actions">
        <button class="btn btn-outline" id="phishReport">🚩 Report as Phishing</button>
        <button class="btn btn-ghost" id="phishClick">Click the Link</button>
      </div>`;

    document.getElementById('phishReport').onclick = () => {
      this.showFeedback(el, '✅ Correct! This is a phishing email.', [
        'Sender domain "paypa1-support.com" uses "1" instead of "l"',
        'Urgency tactics: "permanently suspended within 24 hours"',
        'Sent at 2:34 AM — unusual time for legitimate emails',
        'Generic greeting "Dear Valued Customer" instead of your name',
        'Suspicious link that doesn\'t go to the real PayPal domain',
        'Threatening language to pressure you into immediate action'
      ]);
    };
    document.getElementById('phishLink').onclick = () => {
      Utils.toast('⚠️ This link would lead to a fake login page!', 'error');
    };
    document.getElementById('phishClick').onclick = () => {
      this.showFeedback(el, '❌ Careful! This was a phishing email.', [
        'Never click links in suspicious emails — hover to check the URL first',
        'The sender "paypa1-support.com" is NOT the real PayPal',
        'Always go directly to the official website by typing the URL yourself',
        'Real companies never threaten to suspend your account via email urgency',
        'Check for generic greetings, spelling tricks, and unusual send times'
      ]);
    };
  },

  /* ─── FAKE BANKING ─── */
  banking() {
    const el = document.getElementById('simContent');
    el.innerHTML = `
      <h2 style="margin-bottom:1rem">🏦 Fake Banking Site Simulation</h2>
      <p class="text-muted" style="margin-bottom:1.5rem">You clicked a link from an SMS. This login page appeared. Spot the issues!</p>
      <div class="sim-bank">
        <div class="bank-header">
          <span style="font-size:1.5rem">🏦</span>
          <div>
            <h3>State Bank of lndia</h3>
            <div style="font-size:.7rem;opacity:.7">URL: http://sbi-online-banking.netlify.app/login</div>
          </div>
        </div>
        <div class="bank-body">
          <div class="form-group"><label>Account Number / Username</label><input type="text" placeholder="Enter your account number"></div>
          <div class="form-group"><label>Password</label><input type="password" placeholder="Enter password"></div>
          <div class="form-group"><label>ATM PIN (for verification)</label><input type="password" placeholder="Enter 4-digit ATM PIN" maxlength="4"></div>
          <button class="bank-submit" id="bankSubmit">Secure Login</button>
          <p class="bank-notice">🔒 Your connection is secure and encrypted</p>
        </div>
      </div>
      <div class="sim-actions" style="margin-top:1.5rem">
        <button class="btn btn-outline" id="bankSpot">🚩 I Spotted the Red Flags</button>
        <button class="btn btn-ghost" id="bankLogin">Try to Login</button>
      </div>`;

    document.getElementById('bankSubmit').onclick = (e) => {
      e.preventDefault();
      Utils.toast('🚨 STOP! This is a fake banking site!', 'error');
      this.showFeedback(el, '❌ You almost entered credentials on a fake site!', [
        'URL is "sbi-online-banking.netlify.app" — NOT the real SBI domain (onlinesbi.sbi)',
        '"State Bank of lndia" uses lowercase L instead of uppercase I',
        'Real banks NEVER ask for your ATM PIN during online login',
        'The page uses HTTP, not HTTPS — no real encryption',
        'Reached via SMS link — banks never send login links via SMS'
      ]);
    };
    document.getElementById('bankLogin').onclick = () => {
      Utils.toast('🚨 This is a fake site!', 'error');
    };
    document.getElementById('bankSpot').onclick = () => {
      this.showFeedback(el, '✅ Great awareness! Here are all the red flags:', [
        'Fake URL: "sbi-online-banking.netlify.app" (real: onlinesbi.sbi)',
        'Misspelled name: "lndia" with lowercase L',
        'Asks for ATM PIN — banks never ask this online',
        'Uses HTTP instead of HTTPS',
        'Arrived via SMS — always type bank URLs manually'
      ]);
    };
  },

  /* ─── OTP SCAM CHAT ─── */
  otp() {
    const el = document.getElementById('simContent');
    const steps = [
      { msg: "Hello! I'm calling from SBI Bank. We've detected a suspicious transaction of ₹49,999 from your account.", choices: null },
      { msg: "To block this transaction immediately, I need to verify your identity. An OTP has been sent to your registered mobile number.", choices: null },
      { msg: "Please share the OTP so I can cancel the fraudulent transaction right away. Time is running out!", choices: [
        { text: "Sure, the OTP is 847291", safe: false },
        { text: "I won't share my OTP. I'll call my bank directly.", safe: true }
      ]}
    ];

    el.innerHTML = `
      <h2 style="margin-bottom:1rem">💬 OTP Scam Simulation</h2>
      <p class="text-muted" style="margin-bottom:1.5rem">You receive a call from someone claiming to be your bank. How will you respond?</p>
      <div class="sim-chat">
        <div class="chat-window">
          <div class="chat-header">
            <div class="chat-avatar">📞</div>
            <div class="chat-name">+91 98XXX XXXXX (Unknown)</div>
          </div>
          <div class="chat-messages" id="chatMsgs"></div>
          <div class="chat-choices" id="chatChoices"></div>
        </div>
      </div>`;

    let stepIdx = 0;
    const msgsEl = document.getElementById('chatMsgs');
    const choicesEl = document.getElementById('chatChoices');

    const showStep = () => {
      if (stepIdx >= steps.length) return;
      const step = steps[stepIdx];
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg incoming';
      msgDiv.textContent = step.msg;
      msgsEl.appendChild(msgDiv);
      msgsEl.scrollTop = msgsEl.scrollHeight;

      if (step.choices) {
        choicesEl.innerHTML = '';
        step.choices.forEach(c => {
          const btn = document.createElement('button');
          btn.className = 'chat-choice';
          btn.textContent = c.text;
          btn.onclick = () => {
            // Show user reply
            const reply = document.createElement('div');
            reply.className = 'chat-msg outgoing';
            reply.textContent = c.text;
            msgsEl.appendChild(reply);
            choicesEl.innerHTML = '';
            msgsEl.scrollTop = msgsEl.scrollHeight;

            if (c.safe) {
              this.showFeedback(el, '✅ Smart move! You protected yourself.', [
                'Banks NEVER ask for OTPs over the phone',
                'Scammers create urgency to make you panic',
                'Always hang up and call your bank\'s official number',
                'OTPs are meant only for transactions YOU initiate',
                'If someone calls about "suspicious transactions," verify independently'
              ]);
            } else {
              const scamReply = document.createElement('div');
              scamReply.className = 'chat-msg incoming';
              scamReply.textContent = 'Thank you! Processing... [The scammer now has access to your OTP and can complete a fraudulent transaction]';
              msgsEl.appendChild(scamReply);
              this.showFeedback(el, '❌ You shared your OTP with a scammer!', [
                'NEVER share OTPs with anyone, even if they claim to be from your bank',
                'This is a social engineering attack — the caller is a scammer',
                'Banks will never call you asking for OTPs or passwords',
                'The "suspicious transaction" was fabricated to create panic',
                'Always hang up and call the bank\'s official helpline yourself'
              ]);
            }
          };
          choicesEl.appendChild(btn);
        });
      } else {
        stepIdx++;
        setTimeout(showStep, 1500);
      }
    };
    showStep();
  },

  /* ─── SOCIAL MEDIA ─── */
  social() {
    const el = document.getElementById('simContent');
    el.innerHTML = `
      <h2 style="margin-bottom:1rem">📱 Social Media Scam Simulation</h2>
      <p class="text-muted" style="margin-bottom:1.5rem">You received this Instagram DM. Is it legitimate?</p>
      <div class="sim-social">
        <div class="social-header">
          <div class="social-pfp">👤</div>
          <div class="social-info">
            <h4>@official_iphone_giveaway_2026</h4>
            <p>12 followers · Following you</p>
          </div>
        </div>
        <div class="social-body">
          <p>🎉🎉 CONGRATULATIONS!! 🎉🎉</p>
          <p style="margin:.75rem 0">You've been randomly selected as our <strong>LUCKY WINNER</strong> of a brand new iPhone 16 Pro Max! 📱✨</p>
          <p>To claim your prize, simply:</p>
          <p>1️⃣ Follow our account<br>2️⃣ Share this post to your story<br>3️⃣ Pay a small shipping fee of ₹999 via the link below</p>
          <p style="margin-top:.75rem"><a href="javascript:void(0)" style="color:#0095f6">👉 Claim-Your-iPhone.free-gifts.xyz 👈</a></p>
          <p style="margin-top:.75rem;font-size:.85rem;color:#999">⏰ Offer expires in 1 hour! Don't miss out!</p>
        </div>
      </div>
      <div class="sim-actions" style="margin-top:1.5rem">
        <button class="btn btn-outline" id="socialReport">🚩 This is a Scam</button>
        <button class="btn btn-ghost" id="socialClaim">Claim Prize</button>
      </div>`;

    document.getElementById('socialReport').onclick = () => {
      this.showFeedback(el, '✅ Correct! This is a classic social media scam.', [
        'Username "@official_iphone_giveaway_2026" is not a verified brand account',
        'Only 12 followers — real brand accounts have millions',
        'Asking for a "shipping fee" is a common advance-fee scam tactic',
        'Suspicious domain "free-gifts.xyz" is not Apple\'s website',
        'Urgency tactic: "expires in 1 hour" pressures you to act fast',
        'Excessive emojis and ALL CAPS are common in scam messages'
      ]);
    };
    document.getElementById('socialClaim').onclick = () => {
      Utils.toast('⚠️ This link leads to a scam payment page!', 'error');
      this.showFeedback(el, '❌ This was a scam! Here\'s what to watch for:', [
        'No legitimate company gives away iPhones via random Instagram DMs',
        'The "shipping fee" is the scam — they collect your money and card details',
        'Always verify giveaways on the brand\'s official verified account',
        'Check follower count — 12 followers is a massive red flag',
        'Urgency and pressure ("1 hour") are manipulation tactics'
      ]);
    };
  }
};
