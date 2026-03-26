# Pinyin Translator — Backend API

A FastAPI backend that takes toneless pinyin input and returns multiple likely Mandarin Chinese phrase interpretations, powered by **Groq (llama-3.3-70b-versatile)** — free tier, very fast.

## Endpoints

### `GET /`
Health check. Returns `{ "status": "ok" }`.

### `POST /translate`
**Request body:**
```json
{ "pinyin": "ni hao ni chi fan le ma" }
```

**Response:**
```json
{
  "input": "ni hao ni chi fan le ma",
  "results": [
    {
      "characters": "你好，你吃饭了吗？",
      "pinyin_toned": "Nǐ hǎo, nǐ chī fàn le ma?",
      "english": "Hello, have you eaten yet?",
      "likelihood": "very likely",
      "notes": "A common casual greeting in Chinese culture."
    }
  ]
}
```

---

## Local Development

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Get a free Groq API key
Sign up at https://console.groq.com — it's free, no credit card needed.

### 3. Set your API key
```bash
export GROQ_API_KEY=gsk_...
```

### 4. Run the server
```bash
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` for the interactive Swagger UI.

---

## Deploy to Render (Free Tier)

1. Push this folder to a **GitHub repository**
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and configure everything
5. In the Render dashboard → **Environment** tab, add:
   - Key: `GROQ_API_KEY`
   - Value: your key from console.groq.com
6. Click **Deploy**

> ⚠️ Free tier Render services spin down after ~15 min of inactivity. First request after cold start may take 30–60s. Normal behaviour.

Your live URL will look like: `https://pinyin-translator-api.onrender.com`
