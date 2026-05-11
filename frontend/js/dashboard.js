/* ═══════ DASHBOARD ═══════ */
const Dashboard = {
  async init() {
    const user = Auth.getUser();
    const nameEl = document.getElementById('dashName');
    if (nameEl && user) nameEl.textContent = user.full_name || user.email || user.phone || 'User';

    // Load safety score
    if (user) {
      const safetyEl = document.getElementById('dashSafety');
      if (safetyEl) safetyEl.textContent = user.cyber_safety_score || 0;
    }

    // Try loading stats from API (graceful fallback)
    try {
      const history = await Api.get('/detect/history?page=1&page_size=1');
      document.getElementById('dashScans').textContent = history.total || 0;
    } catch { document.getElementById('dashScans').textContent = '—'; }

    // Scan button
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
      scanBtn.onclick = async () => {
        const input = document.getElementById('scanInput').value.trim();
        if (!input) { Utils.toast('Enter text or URL to scan', 'error'); return; }
        scanBtn.disabled = true; scanBtn.textContent = '⏳ Analyzing...';
        const resultDiv = document.getElementById('scanResult');

        try {
          const isUrl = /^https?:\/\//.test(input);
          const body = isUrl ? { url: input } : { text: input };
          const res = await Api.post('/detect/analyze', body);
          const d = res.data;
          resultDiv.innerHTML = `
            <div class="result-box">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                <h3 style="margin:0">Scan Result</h3>
                <span class="risk-badge risk-${d.risk_level}">${d.risk_level}</span>
              </div>
              <div class="risk-score-bar"><div class="risk-score-fill" style="width:${d.risk_score}%;background:${d.risk_score > 60 ? 'var(--accent-red)' : d.risk_score > 35 ? 'var(--accent-amber)' : 'var(--accent-green)'}"></div></div>
              <p style="margin:.75rem 0;font-size:.95rem"><strong>Risk Score:</strong> ${d.risk_score}/100</p>
              <p style="font-size:.9rem">${d.summary || 'No summary available.'}</p>
              ${d.suspicious_phrases?.length ? `<p style="margin-top:.75rem;font-size:.85rem;color:var(--accent-amber)"><strong>⚠ Suspicious:</strong> ${d.suspicious_phrases.join(', ')}</p>` : ''}
              ${d.recommended_actions?.length ? `<p style="margin-top:.5rem;font-size:.85rem;color:var(--accent-green)"><strong>✅ Actions:</strong> ${d.recommended_actions.join(' • ')}</p>` : ''}
            </div>`;
          resultDiv.classList.remove('hidden');
        } catch (err) {
          resultDiv.innerHTML = `<div class="result-box"><p style="color:var(--accent-red)">❌ ${err.message}</p></div>`;
          resultDiv.classList.remove('hidden');
        }
        scanBtn.disabled = false; scanBtn.textContent = '🔍 Analyze';
      };
    }
  }
};
