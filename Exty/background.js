// Exty Background Service Worker - Ultra Advanced Multi-Vector Scoring Engine

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.loan', '.win', '.bid', '.click', '.gdn', '.monster', '.icu', '.uno', '.tk', '.ml', '.ga', '.cf', '.gq'];
const POPULAR_DOMAINS = ['google.com', 'facebook.com', 'amazon.com', 'apple.com', 'microsoft.com', 'paypal.com', 'chase.com', 'bankofamerica.com', 'hdfcbank.com', 'apple.com', 'icloud.com'];
const GLOBAL_WHITELIST = ['google.com', 'google.co.in', 'youtube.com', 'facebook.com', 'amazon.in', 'amazon.com', 'microsoft.com', 'apple.com', 'github.com', 'stackoverflow.com', 'linkedin.com', 'twitter.com', 'wikipedia.org', 'netflix.com', 'brave.com'];

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

    // 0. Whitelist Bypass
    if (GLOBAL_WHITELIST.some(d => data.hostname.endsWith(d))) {
        return { score: 0, verdict: "Safe", reasons: ["Verified domain (Exty Whitelist)"], timestamp: Date.now() };
    }

    // 1. Domain & URL Analysis (Typosquatting/Homograph/TLD)
    if (data.hasNonAscii) {
        score += 60;
        reasons.push("HOMOGRAPH ATTACK: Domain uses non-standard characters to mimic a trusted site.");
    }
    if (data.isIPAddress) {
        score += 45;
        reasons.push("IP HOSTNAME: Site is hosted on a raw IP address, common for short-lived phishing nodes.");
    }
    const parts = data.hostname.split('.');
    const tld = '.' + parts[parts.length - 1];
    if (SUSPICIOUS_TLDS.includes(tld)) {
        score += 25;
        reasons.push(`SUSPICIOUS TLD: This site uses ${tld}, which is frequently used by malicious actors.`);
    }

    // 2. SSL & Reputation
    if (data.protocol !== 'https:') {
        score += 40;
        reasons.push("INSECURE PROTOCOL: Connection is not encrypted. Browsing data can be intercepted.");
    }

    // 3. Brand Impersonation Detection
    const mainDomain = parts.slice(-2).join('.');
    for (const popular of POPULAR_DOMAINS) {
        if (mainDomain !== popular) {
            const distance = calculateLevenshtein(mainDomain, popular);
            if (distance === 1) {
                score += 55;
                reasons.push(`TYPOSQUATTING: This domain mimics ${popular}.`);
            }
        }
    }
    if (data.brandImpersonation) {
        score += 50;
        reasons.push(`BRAND MISMATCH: Page claims to be ${data.detectedBrand} but is on an unauthorized domain.`);
    }

    // 4. Source Code & Script Inspection
    if (data.obfuscatedScripts > 0) {
        score += 20;
        reasons.push("OBFUSCATED CODE: Detected suspicious JavaScript patterns (eval/unescape/minification).");
    }
    if (data.hiddenElements > 50) {
        score += 15;
        reasons.push("SOURCE ANOMALY: Excessive hidden elements found, often used for SEO poisoning or overlay attacks.");
    }

    // 5. Form Field Sensitivity & Phishing Keywords
    if (data.sensitiveInputs.length > 0) {
        if (score > 30 || data.protocol !== 'https:' || data.brandImpersonation) {
            score += 40;
            reasons.push("DATA HARVESTING: Asking for sensitive info (OTP/PIN/Pass) on a suspicious page.");
        }
    }
    if (data.suspiciousKeywordsFound.length > 0) {
        score += Math.min(data.suspiciousKeywordsFound.length * 10, 30);
        reasons.push(`PHISHING LANGUAGE: Found urgency triggers: ${data.suspiciousKeywordsFound.slice(0, 3).join(', ')}.`);
    }

    // 6. Redirects & File Safety
    if (data.redirectLinks.length > 8) {
        score += 10;
        reasons.push("REDIRECT CHAINS: High number of redirect links; may lead to unintended destinations.");
    }
    if (data.dangerousDownloads.length > 0) {
        score += 35;
        reasons.push(`MALWARE RISK: Found links to executable/script files: ${data.dangerousDownloads[0]}...`);
    }

    // 7. Contact Validation
    if (data.suspiciousEmails.length > 0) {
        score += 20;
        reasons.push(`CONTACT ANOMALY: Official site using public email addresses: ${data.suspiciousEmails[0]}.`);
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
