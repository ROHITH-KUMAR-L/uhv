/* ═══════ LEADERBOARD ═══════ */
const Leaderboard = {
  _fallback: [
    { rank:1, full_name:'Arjun Mehta', cyber_safety_score:2450 },
    { rank:2, full_name:'Priya Sharma', cyber_safety_score:2180 },
    { rank:3, full_name:'Rahul K', cyber_safety_score:1950 },
    { rank:4, full_name:'Sneha Reddy', cyber_safety_score:1720 },
    { rank:5, full_name:'Vikram Singh', cyber_safety_score:1580 },
    { rank:6, full_name:'Ananya Patel', cyber_safety_score:1340 },
    { rank:7, full_name:'Karthik R', cyber_safety_score:1210 },
    { rank:8, full_name:'Divya Nair', cyber_safety_score:1050 },
    { rank:9, full_name:'Amit Kumar', cyber_safety_score:890 },
    { rank:10, full_name:'Neha Gupta', cyber_safety_score:720 },
  ],

  async init() {
    let entries = [];
    try {
      const res = await Api.get('/quiz/leaderboard?limit=10');
      if (res.data && res.data.length > 0) entries = res.data;
    } catch {}
    if (entries.length === 0) entries = this._fallback;

    this.renderPodium(entries.slice(0, 3));
    this.renderList(entries);
  },

  renderPodium(top3) {
    const podium = document.getElementById('podium');
    if (!podium || top3.length < 3) return;
    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];
    podium.innerHTML = top3.map((e, i) => `
      <div class="podium-item ${classes[i]}" style="animation:fadeInUp .6s ease ${i * 150}ms both">
        <div class="podium-rank">${medals[i]}</div>
        <div class="podium-name">${Utils.escapeHtml(e.full_name || 'Anonymous')}</div>
        <div class="podium-score">${(e.cyber_safety_score || 0).toLocaleString()}</div>
      </div>
    `).join('');
  },

  renderList(entries) {
    const list = document.getElementById('lbList');
    if (!list) return;
    if (entries.length === 0) { list.innerHTML = '<div class="lb-loading">No entries yet</div>'; return; }
    list.innerHTML = entries.map((e, i) => `
      <div class="lb-row" style="animation:slideIn .4s ease ${i * 60}ms both">
        <span class="lb-rank">#${e.rank || i + 1}</span>
        <span class="lb-name">${Utils.escapeHtml(e.full_name || 'Anonymous')}</span>
        <span class="lb-pts">${(e.cyber_safety_score || 0).toLocaleString()} pts</span>
      </div>
    `).join('');
  }
};
