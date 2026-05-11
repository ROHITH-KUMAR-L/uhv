// Exty Popup Script

document.addEventListener('DOMContentLoaded', () => {
    updateUI();

    document.getElementById('rescan-btn').addEventListener('click', () => {
        chrome.storage.local.set({ protectionEnabled: true }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "START_SCAN_MANUAL" });
                    setTimeout(updateUI, 100);
                }
            });
        });
    });
});

function updateUI() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        const tabId = tabs[0].id;

        chrome.storage.local.get([`results_${tabId}`], (result) => {
            const data = result[`results_${tabId}`];
            renderResults(data);
        });
    });
}

function renderResults(data) {
    const scoreVal = document.getElementById('score-val');
    const verdictText = document.getElementById('verdict-text');
    const reasonsContainer = document.getElementById('reasons-container');
    const reasonsItems = document.getElementById('reasons-items');
    const scoreFill = document.querySelector('.score-fill');
    const scanningOverlay = document.getElementById('scanning-overlay');

    if (!data) {
        scanningOverlay.style.display = 'flex';
        scanningOverlay.querySelector('div:last-child').innerText = 'AWAITING SYSTEM INITIATION...';
        return;
    }

    scanningOverlay.style.display = 'none';

    // Update Score
    scoreVal.innerText = data.score;
    const offset = 283 - (283 * data.score) / 100;
    scoreFill.style.strokeDashoffset = offset;

    // Update Verdict
    verdictText.innerText = data.verdict;
    verdictText.className = 'verdict ' + data.verdict.toLowerCase().replace(' ', '-');

    // Update Reasons
    reasonsItems.innerHTML = '';
    if (data.reasons && data.reasons.length > 0) {
        reasonsContainer.style.display = 'block';
        data.reasons.forEach((reason, index) => {
            const div = document.createElement('div');
            div.className = 'reason-item';
            div.style.animationDelay = `${index * 0.1}s`;
            div.innerText = reason;
            reasonsItems.appendChild(div);
        });
    } else {
        reasonsContainer.style.display = 'none';
        const div = document.createElement('div');
        div.className = 'reason-item';
        div.innerText = "No immediate threats detected.";
        reasonsItems.appendChild(div);
        reasonsContainer.style.display = 'block';
    }

    // Dynamic Color
    let color = "#00f2ff"; 
    if (data.verdict === "Suspicious") color = "#FF9800";
    if (data.verdict === "Scam Detected") color = "#F44336";
    if (data.verdict === "Safe") color = "#4CAF50";
    
    scoreFill.style.stroke = color;
}
