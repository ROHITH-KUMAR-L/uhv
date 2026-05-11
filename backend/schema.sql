-- ============================================================
-- ScamShield — Supabase PostgreSQL Schema
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────
-- 1. profiles
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         TEXT,
    phone             TEXT UNIQUE,
    email             TEXT UNIQUE,
    avatar_url        TEXT,
    auth_provider     TEXT NOT NULL DEFAULT 'email',  -- 'google' | 'phone' | 'email'
    role              TEXT NOT NULL DEFAULT 'user',    -- 'user' | 'admin'
    cyber_safety_score INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 2. otp_sessions
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT NOT NULL,
    otp_code    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_sessions(phone);

-- ─────────────────────────────────────────────────────────
-- 3. email_sessions
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_session ON email_sessions(email);

-- ─────────────────────────────────────────────────────────
-- 4. detection_logs
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS detection_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    input_type          TEXT NOT NULL,              -- text | url | file | image | mixed
    raw_input           TEXT,
    file_name           TEXT,
    file_hash           TEXT,                       -- SHA-256
    risk_score          INT NOT NULL DEFAULT 0,     -- 0-100
    risk_level          TEXT NOT NULL DEFAULT 'safe', -- safe|low|medium|high|critical
    gemini_summary      TEXT,
    gemini_raw          JSONB,
    virustotal_raw      JSONB,
    suspicious_phrases  TEXT[],
    recommended_actions TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_detection_user ON detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_detection_risk  ON detection_logs(risk_level);

-- ─────────────────────────────────────────────────────────
-- 5. scam_reports
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scam_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
    scam_type           TEXT NOT NULL,   -- phishing|upi|job_fraud|otp|identity_theft|tech_support|fake_banking|other
    platform            TEXT NOT NULL,   -- whatsapp|email|sms|instagram|facebook|telegram|phone_call|other
    description         TEXT NOT NULL,
    phone_email_used    TEXT,
    financial_loss_inr  INT,
    evidence_base64     TEXT,            -- Small screenshots only
    status              TEXT NOT NULL DEFAULT 'pending', -- pending|verified|rejected
    upvotes             INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_type   ON scam_reports(scam_type);
CREATE INDEX IF NOT EXISTS idx_report_status ON scam_reports(status);

-- ─────────────────────────────────────────────────────────
-- 6. awareness_hub
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS awareness_hub (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    TEXT NOT NULL,
    title       TEXT NOT NULL,
    summary     TEXT,
    content_md  TEXT,
    tags        TEXT[],
    view_count  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_awareness_category ON awareness_hub(category);

-- ─────────────────────────────────────────────────────────
-- 7. quiz_bank
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_bank (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    difficulty      TEXT NOT NULL DEFAULT 'medium', -- easy|medium|hard
    scenario_text   TEXT NOT NULL,
    image_url       TEXT,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    correct_option  TEXT NOT NULL,   -- 'a' or 'b'
    explanation     TEXT,
    category        TEXT
);

-- ─────────────────────────────────────────────────────────
-- 8. quiz_results
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score           INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL,
    percentage      FLOAT NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_results(user_id);

-- ─────────────────────────────────────────────────────────
-- 9. forum_posts
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    is_scam_query   BOOLEAN NOT NULL DEFAULT TRUE,
    evidence_base64 TEXT,
    upvotes         INT NOT NULL DEFAULT 0,
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_resolved ON forum_posts(is_resolved);

-- ─────────────────────────────────────────────────────────
-- 10. forum_replies
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    body            TEXT NOT NULL,
    is_expert_reply BOOLEAN NOT NULL DEFAULT FALSE,
    upvotes         INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reply_post ON forum_replies(post_id);