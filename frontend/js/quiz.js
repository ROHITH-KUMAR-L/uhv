/* ═══════ QUIZ ENGINE ═══════ */
const Quiz = {
  scenarios: [],
  current: 0,
  answers: [],
  timer: null,
  timeLeft: 30,

  // Fallback scenarios when API unavailable
  _fallback: [
    { id:'f1',scenario_text:'You receive an email from "support@amaz0n.com" asking you to verify your account by clicking a link. What do you do?',option_a:'Click the link and verify your account immediately',option_b:'Ignore the email — the sender domain looks suspicious',correct:'b',explanation:'The domain "amaz0n.com" uses a zero instead of "o" — a classic phishing tactic. Always check sender domains carefully.' },
    { id:'f2',scenario_text:'A stranger on WhatsApp says you won ₹50,000 in a lottery. They need your bank details to send the prize. What should you do?',option_a:'Share your bank details to receive the prize money',option_b:'Block and report — legitimate lotteries never ask for bank details via WhatsApp',correct:'b',explanation:'This is a classic advance-fee scam. Real lotteries never contact winners via WhatsApp or ask for bank details.' },
    { id:'f3',scenario_text:'You find a USB drive in the parking lot. What is the safest action?',option_a:'Plug it into your computer to check what\'s on it',option_b:'Don\'t plug it in — hand it to security or discard it',correct:'b',explanation:'Unknown USB drives can contain malware that auto-executes when plugged in. This is called a "USB drop attack."' },
    { id:'f4',scenario_text:'Your bank calls and asks you to share your OTP to "cancel a fraudulent transaction." What do you do?',option_a:'Share the OTP quickly to stop the fraud',option_b:'Hang up and call your bank directly — banks never ask for OTPs',correct:'b',explanation:'Banks will NEVER ask for your OTP, PIN, or password over the phone. This is a social engineering attack.' },
    { id:'f5',scenario_text:'A job posting offers ₹1,00,000/month for "data entry work from home" with no experience needed and asks for a ₹5,000 registration fee. Is this legitimate?',option_a:'Pay the fee — it seems like a great opportunity',option_b:'Skip it — unrealistic salary and upfront fees are red flags',correct:'b',explanation:'Job scams use unrealistic salaries and upfront fees to lure victims. Legitimate employers never charge registration fees.' },
    { id:'f6',scenario_text:'You see a social media ad for an investment scheme promising 50% returns monthly. A friend has also shared it. Should you invest?',option_a:'Invest since a friend recommended it and returns look great',option_b:'Avoid it — guaranteed high returns are a hallmark of Ponzi schemes',correct:'b',explanation:'No legitimate investment guarantees 50% monthly returns. Even if a friend shares it, it\'s likely a Ponzi/pyramid scheme.' },
    { id:'f7',scenario_text:'A pop-up on your screen says "Your computer is infected! Call this number immediately for support." What should you do?',option_a:'Call the number to get help fixing the virus',option_b:'Close the browser — this is a tech support scam',correct:'b',explanation:'These are "tech support scam" pop-ups. Real security software never asks you to call a phone number.' },
    { id:'f8',scenario_text:'You receive an SMS with a link saying "Your SBI account is blocked. Click here to reactivate." The link goes to sbi-secure-login.xyz. Is it safe?',option_a:'Click the link to reactivate your account before it\'s too late',option_b:'Don\'t click — the URL is not SBI\'s official domain',correct:'b',explanation:'Official SBI websites use "onlinesbi.sbi" or "sbi.co.in". Random domains like ".xyz" are phishing sites.' },
    { id:'f9',scenario_text:'Someone on a dating app asks you to send money for a medical emergency after chatting for 2 weeks. What do you do?',option_a:'Send the money — they seem genuine and are in trouble',option_b:'Don\'t send money — this is a common romance scam pattern',correct:'b',explanation:'Romance scammers build trust over weeks before asking for money. Never send money to someone you haven\'t met in person.' },
    { id:'f10',scenario_text:'A QR code at a restaurant table directs you to a payment page that looks slightly different from usual UPI apps. Should you pay?',option_a:'Pay anyway — it\'s just a minor UI change',option_b:'Verify with staff and check the URL carefully before paying',correct:'b',explanation:'QR code scams replace legitimate codes with fraudulent ones. Always verify the payee name and URL before completing payment.' },
  ],

  async init() {
    // Difficulty card clicks
    document.querySelectorAll('.diff-card').forEach(card => {
      card.onclick = () => this.startQuiz(card.dataset.diff);
    });
    // Retry button
    const retry = document.getElementById('retryQuiz');
    if (retry) retry.onclick = () => this.reset();
  },

  async startQuiz(difficulty) {
    this.current = 0;
    this.answers = [];
    this.scenarios = [];

    // Try API first, fallback to local
    try {
      const res = await Api.get(`/quiz/scenarios?count=10&difficulty=${difficulty}`);
      if (res.data && res.data.length > 0) {
        this.scenarios = res.data.map(s => ({
          id: s.id, scenario_text: s.scenario_text,
          option_a: s.option_a, option_b: s.option_b,
          correct: null, explanation: null // server evaluates
        }));
      }
    } catch {}

    if (this.scenarios.length === 0) {
      // Use fallback and shuffle
      let pool = [...this._fallback];
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      this.scenarios = pool.slice(0, 10);
    }

    document.getElementById('quizPicker').classList.add('hidden');
    document.getElementById('quizInterface').classList.remove('hidden');
    document.getElementById('quizResult').classList.add('hidden');
    this.showQuestion();
  },

  showQuestion() {
    const q = this.scenarios[this.current];
    const total = this.scenarios.length;
    document.getElementById('quizCounter').textContent = `${this.current + 1} / ${total}`;
    document.getElementById('quizProgressBar').style.width = `${((this.current) / total) * 100}%`;
    document.getElementById('quizScenario').textContent = q.scenario_text;
    document.getElementById('optAText').textContent = q.option_a;
    document.getElementById('optBText').textContent = q.option_b;

    // Reset option states
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(o => { o.className = 'quiz-opt'; o.disabled = false; });
    document.getElementById('quizFeedback').classList.add('hidden');

    // Bind clicks
    opts.forEach(o => { o.onclick = () => this.selectAnswer(o.dataset.opt); });

    // Start timer
    this.timeLeft = 30;
    this.updateTimer();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimer();
      if (this.timeLeft <= 0) { clearInterval(this.timer); this.selectAnswer(null); }
    }, 1000);
  },

  updateTimer() {
    const el = document.getElementById('quizTimer');
    el.textContent = `⏱ ${this.timeLeft}s`;
    el.style.color = this.timeLeft <= 5 ? 'var(--accent-red)' : this.timeLeft <= 10 ? 'var(--accent-amber)' : 'var(--accent-amber)';
  },

  selectAnswer(selected) {
    clearInterval(this.timer);
    const q = this.scenarios[this.current];
    const correct = q.correct || 'b';
    const isCorrect = selected === correct;

    this.answers.push({ question_id: q.id, selected_option: selected || 'none', is_correct: isCorrect });

    // Visual feedback
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(o => {
      o.disabled = true;
      o.classList.add('disabled');
      if (o.dataset.opt === correct) o.classList.add('correct');
      if (o.dataset.opt === selected && !isCorrect) o.classList.add('wrong');
    });

    // Show explanation
    const fb = document.getElementById('quizFeedback');
    fb.classList.remove('hidden', 'correct-fb', 'wrong-fb');
    if (!selected) {
      fb.className = 'quiz-feedback wrong-fb';
      fb.innerHTML = `⏰ <strong>Time's up!</strong> ${q.explanation || 'The correct answer was highlighted.'}`;
    } else if (isCorrect) {
      fb.className = 'quiz-feedback correct-fb';
      fb.innerHTML = `✅ <strong>Correct!</strong> ${q.explanation || 'Great job!'}`;
    } else {
      fb.className = 'quiz-feedback wrong-fb';
      fb.innerHTML = `❌ <strong>Wrong!</strong> ${q.explanation || 'See the correct answer highlighted above.'}`;
    }

    // Next question after delay
    setTimeout(() => {
      this.current++;
      if (this.current < this.scenarios.length) this.showQuestion();
      else this.showResult();
    }, 2500);
  },

  async showResult() {
    document.getElementById('quizInterface').classList.add('hidden');
    document.getElementById('quizResult').classList.remove('hidden');

    const score = this.answers.filter(a => a.is_correct).length;
    const total = this.answers.length;
    const pct = Math.round((score / total) * 100);

    // Try submitting to API
    try {
      await Api.post('/quiz/submit', { answers: this.answers.map(a => ({ question_id: a.question_id, selected_option: a.selected_option })) });
    } catch {}

    document.getElementById('resultScore').textContent = pct;
    document.getElementById('resultMsg').textContent = `You scored ${score} out of ${total}`;
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');

    if (pct >= 80) { icon.textContent = '🏆'; title.textContent = 'Excellent!'; }
    else if (pct >= 60) { icon.textContent = '👏'; title.textContent = 'Good Job!'; }
    else if (pct >= 40) { icon.textContent = '📚'; title.textContent = 'Keep Learning!'; }
    else { icon.textContent = '💪'; title.textContent = 'Try Again!'; }

    document.getElementById('quizProgressBar').style.width = '100%';
  },

  reset() {
    this.current = 0; this.answers = []; this.scenarios = [];
    document.getElementById('quizPicker').classList.remove('hidden');
    document.getElementById('quizInterface').classList.add('hidden');
    document.getElementById('quizResult').classList.add('hidden');
  }
};
