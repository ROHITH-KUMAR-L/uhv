// Exty Background Service Worker - Optimized Scoring Engine (Reduced False Positives)

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.loan', '.win', '.bid', '.click', '.gdn', '.monster', '.icu', '.uno', '.tk', '.ml', '.ga', '.cf', '.gq'];
const POPULAR_DOMAINS = ['google.com', 'facebook.com', 'amazon.com', 'apple.com', 'microsoft.com', 'paypal.com', 'chase.com', 'bankofamerica.com', 'hdfcbank.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'netflix.com', 'github.com'];

// Whitelist of domains that should NEVER be flagged as scams
const GLOBAL_WHITELIST = [
    'google.com', 'google.co.in', 'youtube.com', 'facebook.com', 'amazon.in', 'amazon.com', 
    'microsoft.com', 'apple.com', 'github.com', 'stackoverflow.com', 'linkedin.com', 
    'twitter.com', 'wikipedia.org', 'netflix.com', 'brave.com'
];

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

    // 0. Whitelist Check (Immediate bypass for known safe domains)
    const isWhitelisted = GLOBAL_WHITELIST.some(d => data.hostname.endsWith(d));
    if (isWhitelisted) {
        return { score: 0, verdict: "Safe", reasons: ["Domain verified via Exty Global Whitelist."], timestamp: Date.now() };
    }

    // 1. SSL Certificate Verification
    if (data.protocol !== 'https:') {
        score += 40;
        reasons.push("CRITICAL: Insecure connection (No SSL). Scammers often avoid encrypted connections.");
    }

    // 2. URL Patterns
    const parts = data.hostname.split('.');
    const tld = '.' + parts[parts.length - 1];
    
    if (SUSPICIOUS_TLDS.includes(tld)) {
        score += 20;
        reasons.push(`Suspicious TLD (${tld}) - Commonly used in malicious campaigns.`);
    }

    if (parts.length > 4) {
        score += 10;
        reasons.push("Multiple subdomains detected; often used to obscure the primary domain.");
    }

    // 3. Lookalike & Brand Impersonation
    const mainDomain = parts.slice(-2).join('.');
    for (const popular of POPULAR_DOMAINS) {
        if (mainDomain !== popular) {
            const distance = calculateLevenshtein(mainDomain, popular);
            // Only flag very close matches (1 char diff) to reduce false positives
            if (distance === 1) {
                score += 50;
                reasons.push(`LOOKALAKE ALERT: Domain visually mimics ${popular}.`);
            }
        }
    }

    if (data.brandImpersonation) {
        // Only add high score if not on a reputable domain
        score += 40;
        reasons.push(`BRAND MISMATCH: Page claims to be ${data.detectedBrand} but is on an unverified domain.`);
    }

    // 4. Phishing Keyword Detection (Weighted)
    if (data.suspiciousKeywordsFound && data.suspiciousKeywordsFound.length > 0) {
        // Keywords alone shouldn't trigger a scam verdict unless there are many or other signals
        const keywordScore = Math.min(data.suspiciousKeywordsFound.length * 8, 30);
        score += keywordScore;
        if (keywordScore > 15) {
            reasons.push(`SENSITIVE LANGUAGE: High-pressure keywords found: ${data.suspiciousKeywordsFound.slice(0, 2).join(', ')}.`);
        }
    }

    // 5. Form Field Sensitivity (Enhanced)
    if (data.sensitiveInputs && data.sensitiveInputs.length > 0) {
        // Only high risk if the domain is already suspicious or lacks SSL
        if (score > 25 || data.protocol !== 'https:') {
            score += 30;
            reasons.push("DATA HARVESTING: Sensitive fields (OTP/PIN/SSN) found on a low-trust page.");
        }
    }

    // 6. External Link & Redirect Analysis
    if (data.redirectLinks && data.redirectLinks.length > 10) {
        score += 10;
        reasons.push("UNUSUAL REDIRECTS: High volume of navigation redirects detected.");
    }

    // 7. REMOVED RANDOM MOCKS (To eliminate false positives)
    // In a real production environment, these would be replaced by actual API calls
    // For this build, we rely on deterministic heuristics.

    // Verdict calculation
    let verdict = "Safe";
    if (score >= 75) verdict = "Scam Detected";
    else if (score >= 40) verdict = "Suspicious";

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

            let color = "#4CAF50";
            if (results.verdict === "Suspicious") color = "#FF9800";
            if (results.verdict === "Scam Detected") color = "#F44336";

            chrome.action.setBadgeText({ text: results.verdict[0], tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });

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

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`results_${tabId}`);
});
