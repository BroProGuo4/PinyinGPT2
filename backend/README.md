# PinyinGPT2 — Backend

FastAPI backend that takes toneless pinyin input and returns multiple likely Mandarin Chinese phrase interpretations, powered by Groq (llama-3.3-70b-versatile) — free tier, very fast.

---

## Folder Structure

```
pinyinGPT2/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── render.yaml
│   ├── runtime.txt
│   ├── .env          ← local only, never committed
│   ├── .gitignore
│   └── README.md
└── frontend/
```

---

## Prerequisites

- Python 3.11+
- A free Groq API key from [console.groq.com](https://console.groq.com) — no credit card needed, key starts with `gsk_...`

---

## Running Locally

### 1. Navigate to the backend folder
```bash
cd ~/path/to/pinyinGPT2/backend
```

### 2. Create and activate a virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```
You'll know it worked when your terminal prompt shows `(venv)` at the start.

> Every time you open a new terminal session, you need to re-run `source venv/bin/activate` before starting the server.

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create your .env file
Create a file called `.env` in the `backend/` folder with your Groq API key:
```
GROQ_API_KEY=gsk_...
```
This file is gitignored and will never be committed to GitHub.

### 5. Start the server
```bash
uvicorn main:app --reload
```
The server runs at `http://localhost:8000`. The `--reload` flag automatically restarts the server when you make code changes.

---

## Testing Locally

### Option 1 — Swagger UI (easiest)
Open your browser and go to:
```
http://localhost:8000/docs
```
FastAPI auto-generates an interactive UI. Click **POST /translate → Try it out**, paste in some pinyin, and hit **Execute**.

### Option 2 — curl
```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"pinyin": "ni hao ni chi fan le ma"}'
```

### Option 3 — Health check
Open in browser to confirm the server is running:
```
http://localhost:8000/
```
Expected response: `{"status":"ok","message":"Pinyin Translator API is running"}`

### Example input / output
Request:
```json
{ "pinyin": "wo xiang ni" }
```
Response:
```json
{
  "input": "wo xiang ni",
  "results": [
    {
      "characters": "我想你",
      "pinyin_toned": "wǒ xiǎng nǐ",
      "english": "I miss you",
      "likelihood": "very likely",
      "notes": "Most common interpretation, used to express missing someone."
    }
  ]
}
```

---

## Deploying to Render

### First time setup

1. Push the repo to GitHub if you haven't already:
```bash
cd ~/path/to/pinyinGPT2
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOURUSERNAME/pinyinGPT2.git
git branch -M main
git push -u origin main
```

2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub account and select the `pinyinGPT2` repo
4. Set **Root Directory** to `backend`
5. Set **Build Command** to:
```
pip install -r requirements.txt
```
6. Set **Start Command** to:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```
7. Go to **Settings** and set **Python Version** to `3.11.0`. If that field doesn't exist, go to the **Environment** tab and add:
   - Key: `PYTHON_VERSION` / Value: `3.11.0`
8. Go to the **Environment** tab and add your Groq API key:
   - Key: `GROQ_API_KEY` / Value: `gsk_...`
9. Click **Deploy** — takes about 2 minutes

Your live URL will look like: `https://pinyin-translator-api.onrender.com`

### Deploying after making changes

Just push to GitHub and Render auto-deploys:
```bash
git add .
git commit -m "your message here"
git push
```
Render detects the new commit and redeploys automatically. You can watch the build logs live in the Render dashboard.

To trigger a manual redeploy without a code change (e.g. after changing an environment variable):
- Go to your Render service → top right → **Manual Deploy → Deploy latest commit**

---

## Testing on Render

### Health check
Open in browser (also wakes up the server if it's cold):
```
https://your-service-name.onrender.com/
```

### Swagger UI
```
https://your-service-name.onrender.com/docs
```

### curl
```bash
curl -X POST https://your-service-name.onrender.com/translate \
  -H "Content-Type: application/json" \
  -d '{"pinyin": "ni hao"}'
```

> ⚠️ **Cold starts:** Render's free tier spins the server down after 15 minutes of inactivity. The first request after that will take 30–60 seconds to respond — this is normal. Subsequent requests are fast.

---

## Troubleshooting

**Build fails with pydantic-core / Rust error**
Render is using the wrong Python version. Go to **Settings → Python Version** and set it to `3.11.0`, or add `PYTHON_VERSION=3.11.0` in the Environment tab, then redeploy.

**Characters field is empty in response**
Restart the server and try again. If it persists, check the terminal logs for the raw Groq response — there is a `print()` statement in `main.py` that shows exactly what the model returned.

**Failed to parse AI response (JSON error)**
The model occasionally returns malformed JSON. The server automatically retries up to 3 times, so this should be rare. If it keeps happening, check the terminal logs.

**Server not responding on Render**
Check the build logs in the Render dashboard for errors. Make sure `GROQ_API_KEY` is set in the Environment tab.