// Exty Content Script - Smart Protection Engine (Intrusive only when unsafe)

const SUSPICIOUS_KEYWORDS = [
    "urgent", "action required", "suspended", "unauthorized access", "security breach",
    "verify your identity", "confirm your account", "limited time", "act now", "prize winner",
    "inheritance", "bank transfer", "password reset", "claim your reward", "aadhaar", "otp",
    "verify now", "immediate attention", "risk of closure", "click here to claim", "customer support"
];

const TRUSTED_BRANDS = [
    { name: 'google', domains: ['google.com', 'google.co.in'], keywords: ['google', 'gmail', 'youtube'] },
    { name: 'microsoft', domains: ['microsoft.com', 'outlook.com', 'live.com'], keywords: ['microsoft', 'outlook', 'office365'] },
    { name: 'amazon', domains: ['amazon.com', 'amazon.in'], keywords: ['amazon', 'prime'] },
    { name: 'hdfc', domains: ['hdfcbank.com'], keywords: ['hdfc'] },
    { name: 'paypal', domains: ['paypal.com'], keywords: ['paypal'] },
    { name: 'apple', domains: ['apple.com', 'icloud.com'], keywords: ['apple', 'icloud', 'iphone'] }
];

const DANGEROUS_EXTENSIONS = ['.exe', '.scr', '.vbs', '.bat', '.msi', '.ps1', '.zip', '.rar'];

function analyzePage() {
    const signals = {
        url: window.location.href,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        title: document.title,
        timestamp: Date.now(),
        suspiciousKeywordsFound: [],
        sensitiveInputs: [],
        isLoginPage: false,
        brandImpersonation: false,
        detectedBrand: null,
        hiddenElements: 0,
        suspiciousIframes: 0,
        obfuscatedScripts: 0,
        redirectLinks: [],
        dangerousDownloads: [],
        suspiciousEmails: [],
        hasNonAscii: /[^\x00-\x7F]/.test(window.location.hostname),
        isIPAddress: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname)
    };

    const bodyText = document.body.innerText.toLowerCase();
    signals.suspiciousKeywordsFound = SUSPICIOUS_KEYWORDS.filter(kw => bodyText.includes(kw.toLowerCase()));

    const inputs = document.querySelectorAll('input');
    signals.isLoginPage = Array.from(inputs).some(i => i.type === 'password') && (document.title.toLowerCase().includes('login') || document.title.toLowerCase().includes('sign in'));

    inputs.forEach(input => {
        const type = input.getAttribute('type');
        const name = (input.getAttribute('name') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const combined = `${name} ${placeholder}`;
        if (type === 'password' || combined.includes('card') || combined.includes('cvv') || combined.includes('ssn') || combined.includes('aadhaar') || combined.includes('otp') || combined.includes('pin') || combined.includes('pan')) {
            signals.sensitiveInputs.push({ type, context: combined.substring(0, 30) });
        }
    });

    const pageText = document.body.innerText.toLowerCase();
    for (const brand of TRUSTED_BRANDS) {
        const brandDetected = brand.keywords.some(kw => pageText.includes(kw) || signals.title.toLowerCase().includes(kw));
        const domainMatch = brand.domains.some(d => signals.hostname.endsWith(d));
        if (brandDetected && !domainMatch) {
            signals.brandImpersonation = true;
            signals.detectedBrand = brand.name;
            break;
        }
    }

    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') signals.hiddenElements++;
    });
    
    signals.suspiciousIframes = document.querySelectorAll('iframe[src*="redirect"], iframe[style*="position: absolute"]').length;
    
    document.querySelectorAll('script').forEach(script => {
        const content = script.innerText;
        if (content.includes('eval(') || content.includes('unescape(') || (content.length > 1000 && !content.includes(' '))) signals.obfuscatedScripts++;
    });

    document.querySelectorAll('a').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (href.includes('redirect') || href.includes('url=') || href.includes('next=')) signals.redirectLinks.push(href.substring(0, 50));
        if (DANGEROUS_EXTENSIONS.some(ext => href.endsWith(ext))) signals.dangerousDownloads.push(href.substring(0, 50));
    });

    const emails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(email => {
        if ((email.endsWith('@gmail.com') || email.endsWith('@outlook.com') || email.endsWith('@yahoo.com')) && (signals.brandImpersonation || signals.isLoginPage)) {
            signals.suspiciousEmails.push(email);
        }
    });

    return signals;
}

// --- UI Components ---

function showStartUI() {
    const existing = document.getElementById('exty-start-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'exty-start-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;
        background: rgba(2, 2, 5, 0.95); backdrop-filter: blur(20px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Outfit', 'Inter', sans-serif; transition: opacity 0.5s;
    `;

    overlay.innerHTML = `
        <div style="text-align: center; max-width: 500px; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 40px; border: 1px solid rgba(0,242,255,0.1);">
            <img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 120px; height: 120px; margin-bottom: 20px;" />
            <h1 style="font-size: 42px; font-weight: 900; background: linear-gradient(135deg, #00f2ff 0%, #7000ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px;">EXTY SHIELD</h1>
            <p style="color: #666; margin-bottom: 40px;">ACTIVATE ENTERPRISE SECURITY PROTECTIONS</p>
            <button id="exty-start-btn" style="padding: 24px 80px; background: #fff; border: none; border-radius: 50px; color: #000; font-size: 18px; font-weight: 900; cursor: pointer;">ACTIVATE NOW</button>
        </div>
    `;

    document.documentElement.appendChild(overlay);
    document.getElementById('exty-start-btn').onclick = () => {
        chrome.storage.local.set({ protectionEnabled: true }, () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); startAnalysis(false); }, 500);
        });
    };
}

function startAnalysis(isBackground = false) {
    if (!isBackground) showScannerPanel();
    const data = analyzePage();
    chrome.runtime.sendMessage({ type: "ANALYZE_SIGNALS", data: data });
}

function showScannerPanel() {
    if (document.getElementById('exty-scanner-panel')) return;
    document.body.style.overflow = 'hidden';
    const panel = document.createElement('div');
    panel.id = 'exty-scanner-panel';
    panel.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; background: #020205; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: 'Outfit', sans-serif;`;
    panel.innerHTML = `
        <div style="width: 80px; height: 80px; border: 4px solid #00f2ff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 40px;"></div>
        <h2 style="letter-spacing: 8px; color: #00f2ff;">THREAT SCANNING...</h2>
    `;
    document.documentElement.appendChild(panel);
}

function injectLockOverlay(verdict, score, reasons, isManual = false) {
    if (document.getElementById('exty-lock-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'exty-lock-overlay';
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; background: #020205; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: 'Outfit', sans-serif; text-align: center; padding: 40px;`;
    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");
    overlay.innerHTML = `
        <div style="max-width: 700px; width: 100%;">
            <div style="font-size: 100px; margin-bottom: 20px;">🚫</div>
            <h1 style="font-size: 56px; color: ${color}; font-weight: 900;">${verdict.toUpperCase()}</h1>
            <p style="color: #666; margin-bottom: 50px;">Risk factor: <span style="color: ${color};">${score}%</span></p>
            <div style="background: rgba(255,255,255,0.03); border-radius: 30px; padding: 35px; text-align: left; border: 1px solid ${color}44; margin-bottom: 50px;">
                ${reasons.map(r => `<div style="margin-bottom: 10px; font-size: 14px;">🚩 ${r}</div>`).join('')}
            </div>
            <button id="exty-lock-close" style="padding: 20px 50px; border-radius: 50px; border: none; background: #fff; color: #000; font-weight: 900; cursor: pointer;">ABORT & LEAVE</button>
        </div>
    `;
    document.documentElement.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.getElementById('exty-lock-close').onclick = () => { window.history.back(); if (window.history.length <= 1) window.close(); };
}

function injectBadge(verdict, score, reasons) {
    const existing = document.getElementById('exty-badge');
    if (existing) existing.remove();
    const badge = document.createElement('div');
    badge.id = 'exty-badge';
    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");
    badge.style.cssText = `position: fixed; top: 25px; right: 25px; z-index: 2147483646; background: rgba(10, 10, 15, 0.9); color: white; padding: 14px 28px; border-radius: 16px; display: flex; align-items: center; gap: 15px; font-family: 'Outfit', sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,0.6); cursor: pointer; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);`;
    badge.innerHTML = `<div style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div><div style="font-weight: 800; font-size: 13px;">EXTY: ${verdict.toUpperCase()}</div>`;
    document.documentElement.appendChild(badge);
    badge.onclick = () => { if (verdict === "Safe") alert("Site Security Verified: 0% Risk"); else injectLockOverlay(verdict, score, reasons, true); };
}

// --- Message Handlers ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_SCAN_MANUAL") { startAnalysis(false); }
    else if (request.type === "SHOW_BADGE") {
        const scanner = document.getElementById('exty-scanner-panel');
        if (scanner) {
            scanner.style.opacity = '0';
            setTimeout(() => { 
                scanner.remove(); 
                document.body.style.overflow = '';
                if (request.score >= 60) injectLockOverlay(request.verdict, request.score, request.reasons);
                injectBadge(request.verdict, request.score, request.reasons);
            }, 500);
        } else {
            // Background scan result
            if (request.score >= 60) injectLockOverlay(request.verdict, request.score, request.reasons);
            injectBadge(request.verdict, request.score, request.reasons);
        }
    }
});

// Initialization
chrome.storage.local.get(['protectionEnabled'], (result) => {
    if (result.protectionEnabled) startAnalysis(true); // Run in background automatically
    else showStartUI(); // First time activation
});
