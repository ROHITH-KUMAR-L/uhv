// Exty Content Script - Advanced Scam Analysis Engine

const SUSPICIOUS_KEYWORDS = [
    "urgent", "action required", "suspended", "unauthorized access", "security breach",
    "verify your identity", "confirm your account", "limited time", "act now", "prize winner",
    "inheritance", "bank transfer", "password reset", "claim your reward", "aadhaar", "otp",
    "verify now", "immediate attention", "risk of closure", "click here to claim"
];

const TRUSTED_BRANDS = [
    { name: 'google', domains: ['google.com', 'google.co.in'], colors: ['#4285f4', '#34a853', '#fbbc05', '#ea4335'] },
    { name: 'microsoft', domains: ['microsoft.com', 'outlook.com', 'live.com'], colors: ['#f25022', '#7fba00', '#00a4ef', '#ffb900'] },
    { name: 'amazon', domains: ['amazon.com', 'amazon.in'], colors: ['#ff9900', '#000000'] },
    { name: 'hdfc', domains: ['hdfcbank.com'], colors: ['#004c8f', '#ed1c24'] },
    { name: 'paypal', domains: ['paypal.com'], colors: ['#003087', '#009cde'] }
];

function analyzePage() {
    const signals = {
        url: window.location.href,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        title: document.title,
        timestamp: Date.now(),
        suspiciousKeywordsFound: [],
        sensitiveInputs: [],
        brandImpersonation: false,
        detectedBrand: null,
        redirectLinks: []
    };

    // 1. Phishing Keyword Detection
    const bodyText = document.body.innerText.toLowerCase();
    signals.suspiciousKeywordsFound = SUSPICIOUS_KEYWORDS.filter(kw => bodyText.includes(kw.toLowerCase()));

    // 2. Form Field Sensitivity Scanning (Enhanced)
    document.querySelectorAll('input').forEach(input => {
        const type = input.getAttribute('type');
        const name = (input.getAttribute('name') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const combined = `${name} ${placeholder} ${id}`;

        if (type === 'password' || 
            combined.includes('card') || combined.includes('cvv') || 
            combined.includes('ssn') || combined.includes('aadhaar') || 
            combined.includes('otp') || combined.includes('pin') ||
            combined.includes('pan') || combined.includes('account')) {
            signals.sensitiveInputs.push({ type, name: combined.substring(0, 50) });
        }
    });

    // 3. Brand Impersonation Detection (Visual Heuristics)
    const pageContent = document.body.innerHTML.toLowerCase();
    const pageTitle = document.title.toLowerCase();
    
    for (const brand of TRUSTED_BRANDS) {
        // If the brand name appears in title or content, but domain doesn't match
        const brandMatchInTitle = pageTitle.includes(brand.name);
        const domainMatch = brand.domains.some(d => window.location.hostname.endsWith(d));

        if (brandMatchInTitle && !domainMatch) {
            signals.brandImpersonation = true;
            signals.detectedBrand = brand.name;
            break;
        }
    }

    // 4. External Link & Redirect Analysis
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes('redirect') || href.includes('url=') || href.includes('next=')) {
            signals.redirectLinks.push(href.substring(0, 100));
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
        background: rgba(5, 5, 5, 0.9); backdrop-filter: blur(15px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Inter', sans-serif; transition: opacity 0.5s;
    `;

    const logoUrl = chrome.runtime.getURL('icons/icon128.png');

    overlay.innerHTML = `
        <div style="text-align: center;">
            <img src="${logoUrl}" style="width: 120px; height: 120px; margin-bottom: 20px; filter: drop-shadow(0 0 30px #00f2ff);" onerror="console.log('Logo failed to load:', this.src)"/>
            <h1 style="font-size: 42px; letter-spacing: 3px; font-weight: 900; background: linear-gradient(to right, #00f2ff, #7000ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 40px;">EXTY SHIELD</h1>
            <button id="exty-start-btn" style="
                padding: 24px 80px; background: #ffffff; border: none; border-radius: 50px;
                color: #000; font-size: 20px; font-weight: 800; cursor: pointer;
                box-shadow: 0 10px 40px rgba(255, 255, 255, 0.2); transition: all 0.3s;
            ">INITIATE SECURITY SCAN</button>
            <p style="margin-top: 30px; color: #555; font-size: 13px; letter-spacing: 2px;">V1.0.7 | ADVANCED THREAT ENGINE</p>
        </div>
    `;

    document.documentElement.appendChild(overlay);

    const btn = document.getElementById('exty-start-btn');
    btn.onclick = () => {
        chrome.storage.local.set({ protectionEnabled: true }, () => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                startAnalysis();
            }, 500);
        });
    };
}

function startAnalysis() {
    showScannerPanel();
    const data = analyzePage();
    chrome.runtime.sendMessage({ type: "ANALYZE_SIGNALS", data: data });
}

function showScannerPanel() {
    document.body.style.overflow = 'hidden';
    const panel = document.createElement('div');
    panel.id = 'exty-scanner-panel';
    panel.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;
        background: #050505; display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Inter', sans-serif; transition: opacity 0.5s;
    `;

    panel.innerHTML = `
        <style>
            .exty-glow { text-shadow: 0 0 20px #00f2ff; }
            .exty-progress-bar { width: 320px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin: 30px 0; }
            .exty-progress-fill { width: 0%; height: 100%; background: #00f2ff; transition: width 1s linear; }
            @keyframes extyScanLine { from { top: 0%; } to { top: 100%; } }
        </style>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #00f2ff; box-shadow: 0 0 20px #00f2ff; animation: extyScanLine 4s infinite linear;"></div>
        <h1 class="exty-glow" style="font-size: 32px; letter-spacing: 5px; font-weight: 900;">DEEP SCAN IN PROGRESS</h1>
        <div class="exty-progress-bar"><div class="exty-progress-fill" id="exty-fill"></div></div>
        <div id="exty-status-steps" style="width: 380px; font-size: 14px; color: #555;">
            <div id="step-1">▹ Probing WHOIS & Domain Age...</div>
            <div id="step-2">▹ Analyzing SSL Trust Chain...</div>
            <div id="step-3">▹ Checking PhishTank & Safe Browsing...</div>
            <div id="step-4">▹ Tracing Redirect Loops...</div>
        </div>
    `;

    document.documentElement.appendChild(panel);
    setTimeout(() => document.getElementById('exty-fill').style.width = '100%', 100);

    const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
    steps.forEach((id, i) => {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = `<span style="color: #00f2ff;">✓</span> <span style="color: #fff;">${el.innerText.substring(2)}</span>`; }
        }, (i + 1) * 400);
    });
}

function injectLockOverlay(verdict, score, reasons, isManual = false) {
    const existing = document.getElementById('exty-lock-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exty-lock-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;
        background: rgba(0, 0, 0, 0.98); backdrop-filter: blur(25px); display: flex; flex-direction: column;
        align-items: center; justify-content: center; color: white; font-family: 'Inter', sans-serif;
        text-align: center; padding: 40px; animation: extyFadeIn 0.5s ease-out;
    `;

    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");
    
    overlay.innerHTML = `
        <style>@keyframes extyFadeIn { from { opacity: 0; } to { opacity: 1; } }</style>
        <div style="max-width: 650px; background: rgba(255,255,255,0.03); padding: 50px; border-radius: 30px; border: 1px solid ${color}44;">
            <div style="font-size: 80px; margin-bottom: 20px;">${verdict === "Safe" ? '🛡️' : '⚠️'}</div>
            <h1 style="font-size: 48px; margin-bottom: 10px; color: ${color}; font-weight: 900;">${isManual ? 'SECURITY REPORT' : verdict.toUpperCase()}</h1>
            <p style="color: #888; font-size: 18px; margin-bottom: 40px;">Risk Level: <span style="color: ${color}; font-weight: bold;">${score}%</span></p>
            
            <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 30px; border-radius: 20px; margin-bottom: 40px; max-height: 250px; overflow-y: auto;">
                <div style="font-size: 12px; color: ${color}; font-weight: bold; margin-bottom: 15px; letter-spacing: 2px;">DETECTED SIGNALS</div>
                ${reasons.map(r => `<div style="margin-bottom: 10px; display: flex; gap: 12px; font-size: 14px; line-height: 1.4;"><span>🚩</span> <span>${r}</span></div>`).join('') || '<div style="color: #4CAF50;">✓ No suspicious signals found.</div>'}
            </div>

            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="exty-lock-close" style="padding: 18px 45px; border-radius: 40px; border: none; background: #fff; color: #000; font-weight: 800; cursor: pointer;">${isManual ? 'BACK TO SITE' : 'SAFETY REDIRECT'}</button>
                ${!isManual && verdict !== "Safe" ? '<button id="exty-lock-proceed" style="padding: 18px 45px; border-radius: 40px; border: 1px solid #444; background: transparent; color: #fff; cursor: pointer;">PROCEED ANYWAY</button>' : ''}
            </div>
        </div>
    `;

    document.documentElement.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('exty-lock-close').onclick = () => {
        if (isManual || verdict === "Safe") {
            overlay.remove();
            document.body.style.overflow = '';
        } else {
            window.history.back();
            if (window.history.length <= 1) window.close();
        }
    };

    if (!isManual && verdict !== "Safe") {
        const proceedBtn = document.getElementById('exty-lock-proceed');
        if (proceedBtn) {
            proceedBtn.onclick = () => {
                if (confirm("Proceeding may expose your data. Are you sure?")) {
                    overlay.remove();
                    document.body.style.overflow = '';
                }
            };
        }
    }
}

function injectBadge(verdict, score, reasons) {
    const existing = document.getElementById('exty-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'exty-badge';
    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");

    badge.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 2147483646;
        background: #0a0a0c; color: white; padding: 12px 24px; border-radius: 12px;
        display: flex; align-items: center; gap: 12px; font-family: 'Inter', sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer; transition: transform 0.3s; animation: extySlideIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    `;

    badge.innerHTML = `
        <style>@keyframes extySlideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }</style>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color}"></div>
        <div style="font-weight: 700; font-size: 14px;">EXTY: ${verdict.toUpperCase()}</div>
        <div style="font-size: 11px; opacity: 0.5;">Risk ${score}%</div>
        <div id="exty-badge-close" style="margin-left: 10px; opacity: 0.3; font-size: 18px;">&times;</div>
    `;

    document.documentElement.appendChild(badge);

    badge.onclick = (e) => {
        if (e.target.id === 'exty-badge-close') {
            badge.remove();
        } else {
            injectLockOverlay(verdict, score, reasons, true);
        }
    };
}

// --- Message Handlers ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_DATA") {
        sendResponse(analyzePage());
    } else if (request.type === "START_SCAN_MANUAL") {
        startAnalysis();
    } else if (request.type === "SHOW_BADGE") {
        const scanner = document.getElementById('exty-scanner-panel');
        if (scanner) {
            setTimeout(() => {
                scanner.style.opacity = '0';
                setTimeout(() => {
                    scanner.remove();
                    document.body.style.overflow = '';
                    if (request.score >= 60) {
                        injectLockOverlay(request.verdict, request.score, request.reasons);
                    }
                    injectBadge(request.verdict, request.score, request.reasons);
                }, 500);
            }, 800);
        } else {
            if (request.score >= 60) {
                injectLockOverlay(request.verdict, request.score, request.reasons);
            }
            injectBadge(request.verdict, request.score, request.reasons);
        }
    }
});

// Initialization: Check if global protection is active
chrome.storage.local.get(['protectionEnabled'], (result) => {
    if (result.protectionEnabled) {
        // Automatic scan for redirects and new pages
        startAnalysis();
    } else {
        // Show start UI for first-time activation
        showStartUI();
    }
});
