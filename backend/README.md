# ScamShield Backend

AI-Powered Scam Detection Platform — FastAPI + Supabase + Gemini + VirusTotal

## Quick Start

### 1. Activate conda environment
```bash
conda activate uhv
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up environment variables
Copy `.env.example` to `.env` and fill in your keys:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
GEMINI_API_KEY=
VIRUSTOTAL_API_KEY=
SMS_GATEWAY_URL=http://192.168.x.x:PORT/send
...
```

### 4. Run the Supabase schema
Copy `schema.sql` and run it in your **Supabase SQL Editor**.

### 5. Start the server
```bash
# From the /backend directory
uvicorn app.main:app --reload --port 8000
```

### 6. API Docs
- Swagger UI: http://localhost:8000/docs
- ReDoc:       http://localhost:8000/redoc

---

## Endpoint Summary

| Group | Base Path | # Endpoints |
|---|---|---|
| Auth | `/api/v1/auth` | 8 |
| Detection Engine | `/api/v1/detect` | 5 |
| Scam Reports | `/api/v1/reports` | 6 |
| Analytics | `/api/v1/analytics` | 5 |
| Awareness Hub | `/api/v1/awareness` | 5 |
| Quiz | `/api/v1/quiz` | 4 |
| Forum | `/api/v1/forum` | 7 |

## Project Structure
```
backend/
├── app/
│   ├── main.py              # Entry point + CORS
│   ├── api/                 # All route handlers
│   ├── services/            # Gemini, VirusTotal, SMS, Email, File
│   ├── core/                # Config, Supabase client, JWT security
│   └── schemas/             # Pydantic models
├── schema.sql               # Run in Supabase SQL Editor
└── requirements.txt
```
