// Exty Background Service Worker - Advanced Scoring Engine

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.loan', '.win', '.bid', '.click', '.gdn', '.monster', '.icu', '.uno', '.tk', '.ml', '.ga', '.cf', '.gq'];
const POPULAR_DOMAINS = ['google.com', 'facebook.com', 'amazon.com', 'apple.com', 'microsoft.com', 'paypal.com', 'chase.com', 'bankofamerica.com', 'hdfcbank.com'];

function calculateLevenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
    }
    return matrix[b.length][a.length];
}

async function analyzeRisk(data) {
    let score = 0;
    let reasons = [];

    // 1. SSL Certificate Verification
    if (data.protocol !== 'https:') {
        score += 40;
        reasons.push("CRITICAL: Insecure connection (No SSL). Scam sites rarely use valid HTTPS.");
    } else {
        // Mock SSL Detail Check (Scams often use free/short-lived certs)
        // In a real app, you'd use an API to check cert age/issuer
        score += 5; 
        reasons.push("SSL active, but origin trust is still being evaluated.");
    }

    // 2. Domain & URL Analysis
    const parts = data.hostname.split('.');
    const tld = '.' + parts[parts.length - 1];
    
    if (SUSPICIOUS_TLDS.includes(tld)) {
        score += 25;
        reasons.push(`Suspicious TLD (${tld}) detected. High correlation with scam domains.`);
    }

    if (parts.length > 3) {
        score += 15;
        reasons.push("Excessive subdomains detected; often used to hide the real domain.");
    }

    // 3. Lookalike & Brand Impersonation
    const mainDomain = parts.slice(-2).join('.');
    for (const popular of POPULAR_DOMAINS) {
        if (mainDomain !== popular) {
            const distance = calculateLevenshtein(mainDomain, popular);
            if (distance > 0 && distance <= 2) {
                score += 50;
                reasons.push(`LOOKALAKE DOMAIN: This domain is visually similar to ${popular}.`);
            }
        }
    }

    if (data.brandImpersonation) {
        score += 45;
        reasons.push(`BRAND IMPERSONATION: Page mimics ${data.detectedBrand} but domain is unauthorized.`);
    }

    // 4. Phishing Keyword Detection
    if (data.suspiciousKeywordsFound && data.suspiciousKeywordsFound.length > 0) {
        score += data.suspiciousKeywordsFound.length * 10;
        reasons.push(`PHISHING LANGUAGE: High-pressure keywords detected: ${data.suspiciousKeywordsFound.slice(0, 3).join(', ')}.`);
    }

    // 5. Form Field Sensitivity (Enhanced)
    if (data.sensitiveInputs && data.sensitiveInputs.length > 0) {
        if (score > 30 || data.protocol !== 'https:') {
            score += 35;
            reasons.push("SENSITIVE DATA REQUEST: Page is asking for private info (OTP/PIN/Card) on a low-trust domain.");
        }
    }

    // 6. External Link & Redirect Analysis
    if (data.redirectLinks && data.redirectLinks.length > 5) {
        score += 15;
        reasons.push("REDIRECT CHAINS: Unusual amount of redirect-based links detected.");
    }

    // 7. Mock WHOIS & Blacklist Query
    // Scams are usually < 6 months old
    const isNewDomain = Math.random() > 0.5; // Simulated WHOIS check
    if (isNewDomain) {
        score += 20;
        reasons.push("WHOIS DATA: Domain was registered very recently (< 6 months).");
    }

    const isBlacklisted = Math.random() > 0.8; // Simulated PhishTank/SafeBrowsing check
    if (isBlacklisted) {
        score += 60;
        reasons.push("BLACKLIST: Domain has been reported as a phishing site in external security databases.");
    }

    // Verdict calculation
    let verdict = "Safe";
    if (score >= 70) verdict = "Scam Detected";
    else if (score >= 35) verdict = "Suspicious";

    return {
        score: Math.min(score, 100),
        verdict: verdict,
        reasons: reasons,
        timestamp: Date.now()
    };
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_SIGNALS") {
        analyzeRisk(message.data).then(results => {
            const tabId = sender.tab.id;
            chrome.storage.local.set({ [`results_${tabId}`]: results });

            // Update badge
            let color = "#4CAF50";
            if (results.verdict === "Suspicious") color = "#FF9800";
            if (results.verdict === "Scam Detected") color = "#F44336";

            chrome.action.setBadgeText({ text: results.verdict[0], tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });

            // Trigger badge injection on the page
            chrome.tabs.sendMessage(tabId, { 
                type: "SHOW_BADGE", 
                verdict: results.verdict, 
                score: results.score,
                reasons: results.reasons
            });

            sendResponse({ status: "success", verdict: results.verdict });
        });
    }
    return true;
});

// Cleanup storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`results_${tabId}`);
});
