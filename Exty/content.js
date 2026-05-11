// Exty Content Script - Ultra Advanced Scam Analysis Engine

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
        
        // 1. Phishing Keywords
        suspiciousKeywordsFound: SUSPICIOUS_KEYWORDS.filter(kw => document.body.innerText.toLowerCase().includes(kw.toLowerCase())),
        
        // 2. Form Sensitivity & Fake Logins
        sensitiveInputs: [],
        isLoginPage: false,
        
        // 3. Brand & Visuals
        brandImpersonation: false,
        detectedBrand: null,
        
        // 4. Source Code Inspection
        hiddenElements: 0,
        suspiciousIframes: 0,
        obfuscatedScripts: 0,
        
        // 5. Links & Downloads
        redirectLinks: [],
        dangerousDownloads: [],
        
        // 6. Contact Info
        suspiciousEmails: [],
        
        // 7. Adware/Popups
        popupAttempts: 0,
        
        // 8. Typosquatting/Homograph
        hasNonAscii: /[^\x00-\x7F]/.test(window.location.hostname),
        isIPAddress: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(window.location.hostname)
    };

    // Analyze Forms & Login Patterns
    const inputs = document.querySelectorAll('input');
    const hasPassword = Array.from(inputs).some(i => i.type === 'password');
    signals.isLoginPage = hasPassword && (document.title.toLowerCase().includes('login') || document.title.toLowerCase().includes('sign in'));

    inputs.forEach(input => {
        const type = input.getAttribute('type');
        const name = (input.getAttribute('name') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const combined = `${name} ${placeholder}`;

        if (type === 'password' || combined.includes('card') || combined.includes('cvv') || 
            combined.includes('ssn') || combined.includes('aadhaar') || combined.includes('otp') || 
            combined.includes('pin') || combined.includes('pan')) {
            signals.sensitiveInputs.push({ type, context: combined.substring(0, 30) });
        }
    });

    // Brand Impersonation (Expanded)
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

    // Source Code & Script Inspection
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            signals.hiddenElements++;
        }
    });
    
    signals.suspiciousIframes = document.querySelectorAll('iframe[src*="redirect"], iframe[style*="position: absolute"]').length;
    
    // Scan for suspicious script patterns (eval, obfuscation markers)
    document.querySelectorAll('script').forEach(script => {
        const content = script.innerText;
        if (content.includes('eval(') || content.includes('unescape(') || (content.length > 1000 && !content.includes(' '))) {
            signals.obfuscatedScripts++;
        }
    });

    // Links & File Safety
    document.querySelectorAll('a').forEach(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        if (href.includes('redirect') || href.includes('url=') || href.includes('next=')) {
            signals.redirectLinks.push(href.substring(0, 50));
        }
        if (DANGEROUS_EXTENSIONS.some(ext => href.endsWith(ext))) {
            signals.dangerousDownloads.push(href.substring(0, 50));
        }
    });

    // Contact Validation
    const emails = document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(email => {
        if (email.endsWith('@gmail.com') || email.endsWith('@outlook.com') || email.endsWith('@yahoo.com')) {
            // Suspicious if on a "official" corporate site
            if (signals.brandImpersonation || signals.isLoginPage) {
                signals.suspiciousEmails.push(email);
            }
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
            <div style="position: relative; margin-bottom: 30px;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 150px; height: 150px; background: #00f2ff; filter: blur(60px); opacity: 0.2; border-radius: 50%;"></div>
                <img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 120px; height: 120px; position: relative; z-index: 1;" />
            </div>
            <h1 style="font-size: 42px; letter-spacing: 4px; font-weight: 900; background: linear-gradient(135deg, #00f2ff 0%, #7000ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px;">EXTY SHIELD</h1>
            <p style="color: #666; font-size: 14px; letter-spacing: 2px; margin-bottom: 40px; font-weight: 600;">ENTERPRISE THREAT INTELLIGENCE</p>
            <button id="exty-start-btn" style="
                padding: 24px 80px; background: #ffffff; border: none; border-radius: 50px;
                color: #000; font-size: 18px; font-weight: 900; cursor: pointer;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); transition: all 0.3s;
            ">ACTIVATE PROTECTION</button>
            <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center; color: #444; font-size: 11px;">
                <span>✓ REAL-TIME SCAN</span>
                <span>✓ AI HEURISTICS</span>
                <span>✓ ANTI-PHISH</span>
            </div>
        </div>
    `;

    document.documentElement.appendChild(overlay);

    document.getElementById('exty-start-btn').onclick = () => {
        chrome.storage.local.set({ protectionEnabled: true }, () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); startAnalysis(); }, 500);
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
        background: #020205; display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Outfit', sans-serif;
    `;

    panel.innerHTML = `
        <style>
            @keyframes extyPulse { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.5; } }
            .exty-step { margin-bottom: 12px; font-size: 13px; color: #444; display: flex; align-items: center; gap: 10px; transition: color 0.3s; }
            .exty-step.active { color: #fff; font-weight: 600; }
            .exty-step.done { color: #00f2ff; }
        </style>
        <div style="width: 80px; height: 80px; border: 4px solid #00f2ff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 40px;"></div>
        <h2 style="letter-spacing: 8px; font-weight: 900; margin-bottom: 40px; color: #00f2ff;">THREAT SCANNING</h2>
        <div id="exty-steps-container" style="width: 350px; background: rgba(255,255,255,0.02); padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05);">
            <div class="exty-step" id="s1">▹ DNS & Hosting Intelligence</div>
            <div class="exty-step" id="s2">▹ Typosquatting & Homograph Check</div>
            <div class="exty-step" id="s3">▹ Page Source Code Inspection</div>
            <div class="exty-step" id="s4">▹ Real-time Threat Monitoring</div>
            <div class="exty-step" id="s5">▹ Reputation Database Query</div>
        </div>
    `;

    document.documentElement.appendChild(panel);

    const steps = ['s1', 's2', 's3', 's4', 's5'];
    steps.forEach((id, i) => {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('active');
                setTimeout(() => {
                    el.classList.replace('active', 'done');
                    el.innerHTML = `✓ ${el.innerText.substring(2)}`;
                }, 400);
            }
        }, (i + 1) * 350);
    });
}

function injectLockOverlay(verdict, score, reasons, isManual = false) {
    const existing = document.getElementById('exty-lock-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exty-lock-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647;
        background: #020205; display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Outfit', sans-serif; text-align: center; padding: 40px;
    `;

    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");
    
    overlay.innerHTML = `
        <div style="max-width: 700px; width: 100%;">
            <div style="font-size: 100px; margin-bottom: 20px; animation: extyPulse 2s infinite;">${verdict === "Safe" ? '🛡️' : '🚫'}</div>
            <h1 style="font-size: 56px; font-weight: 900; color: ${color}; margin-bottom: 10px;">${verdict.toUpperCase()}</h1>
            <p style="color: #666; font-size: 18px; margin-bottom: 50px;">Security analysis complete. Total risk factor: <span style="color: ${color}; font-weight: 900;">${score}%</span></p>
            
            <div style="background: rgba(255,255,255,0.03); border-radius: 30px; padding: 35px; text-align: left; border: 1px solid ${color}44; margin-bottom: 50px; max-height: 300px; overflow-y: auto;">
                <h3 style="font-size: 12px; letter-spacing: 3px; color: ${color}; margin-bottom: 20px;">DETECTION LOGS</h3>
                ${reasons.map(r => `<div style="margin-bottom: 15px; display: flex; gap: 15px; font-size: 14px; line-height: 1.5; color: #ccc;"><span style="color:${color}">[!]</span> ${r}</div>`).join('') || '<div>No critical anomalies detected.</div>'}
            </div>

            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="exty-lock-close" style="padding: 20px 50px; border-radius: 50px; border: none; background: #fff; color: #000; font-weight: 900; cursor: pointer; transition: 0.3s;">${isManual ? 'CONTINUE' : 'ABORT & LEAVE'}</button>
                ${!isManual && verdict !== "Safe" ? '<button id="exty-lock-proceed" style="padding: 20px 50px; border-radius: 50px; border: 1px solid #333; background: transparent; color: #fff; font-weight: 900; cursor: pointer;">PROCEED (DANGEROUS)</button>' : ''}
            </div>
        </div>
    `;

    document.documentElement.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('exty-lock-close').onclick = () => {
        if (isManual || verdict === "Safe") { overlay.remove(); document.body.style.overflow = ''; }
        else { window.history.back(); if (window.history.length <= 1) window.close(); }
    };

    const proceed = document.getElementById('exty-lock-proceed');
    if (proceed) proceed.onclick = () => { if (confirm("DANGER: High risk of data theft. Proceed?")) { overlay.remove(); document.body.style.overflow = ''; } };
}

function injectBadge(verdict, score, reasons) {
    const existing = document.getElementById('exty-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'exty-badge';
    const color = verdict === "Safe" ? "#4CAF50" : (verdict === "Suspicious" ? "#FF9800" : "#F44336");

    badge.style.cssText = `
        position: fixed; top: 25px; right: 25px; z-index: 2147483646;
        background: rgba(10, 10, 15, 0.9); color: white; padding: 14px 28px; border-radius: 16px;
        display: flex; align-items: center; gap: 15px; font-family: 'Outfit', sans-serif;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05);
        cursor: pointer; backdrop-filter: blur(10px);
    `;

    badge.innerHTML = `
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; box-shadow: 0 0 15px ${color}"></div>
        <div style="font-weight: 800; font-size: 13px; letter-spacing: 1px;">EXTY: ${verdict.toUpperCase()}</div>
        <div id="exty-badge-close" style="opacity: 0.3; font-size: 20px;">&times;</div>
    `;

    document.documentElement.appendChild(badge);
    badge.onclick = (e) => { if (e.target.id === 'exty-badge-close') badge.remove(); else injectLockOverlay(verdict, score, reasons, true); };
}

// --- Message Handlers ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "START_SCAN_MANUAL") { startAnalysis(); }
    else if (request.type === "SHOW_BADGE") {
        const scanner = document.getElementById('exty-scanner-panel');
        if (scanner) {
            setTimeout(() => {
                scanner.style.opacity = '0';
                setTimeout(() => {
                    scanner.remove();
                    document.body.style.overflow = '';
                    if (request.score >= 60) injectLockOverlay(request.verdict, request.score, request.reasons);
                    injectBadge(request.verdict, request.score, request.reasons);
                }, 500);
            }, 800);
        } else {
            if (request.score >= 60) injectLockOverlay(request.verdict, request.score, request.reasons);
            injectBadge(request.verdict, request.score, request.reasons);
        }
    }
});

// Initialization
chrome.storage.local.get(['protectionEnabled'], (result) => {
    if (result.protectionEnabled) startAnalysis();
    else showStartUI();
});
