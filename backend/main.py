from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import json
import os

load_dotenv()  # Loads GROQ_API_KEY from .env file when running locally.
               # On Render, the key is set in the dashboard and this line does nothing.

app = FastAPI(title="Pinyin Translator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are a Mandarin Chinese language expert helping a heritage speaker who can speak Mandarin fluently but cannot read or write characters. They will give you toneless pinyin sentences, and your job is to return the most likely Mandarin phrases they could mean.

Rules:
- Return between 3 and 5 of the most common/natural interpretations
- Rank them from most likely to least likely based on how commonly the phrase is used in everyday Mandarin
- Each result must include:
  - "characters": the Chinese characters — you MUST include real Chinese characters (e.g. 你好). Never leave this field empty.
  - "pinyin_toned": pinyin with proper tone marks (e.g. nǐ hǎo)
  - "english": a natural English translation
  - "likelihood": one of "very likely", "likely", or "possible"
  - "notes": a brief note explaining the context or usage (1 sentence max), or null if obvious

You MUST respond with only a valid JSON object in this exact format, no markdown, no explanation, no code fences:
{
  "results": [
    {
      "characters": "你好",
      "pinyin_toned": "nǐ hǎo",
      "english": "Hello",
      "likelihood": "very likely",
      "notes": null
    }
  ]
}"""


class TranslateRequest(BaseModel):
    pinyin: str


def deduplicate(results: list[dict]) -> list[dict]:
    seen_characters = set()
    seen_pinyin = set()
    deduped = []
    for r in results:
        chars = r.get("characters", "").strip()
        pinyin = r.get("pinyin_toned", "").strip().lower()
        if chars in seen_characters or pinyin in seen_pinyin:
            continue
        seen_characters.add(chars)
        seen_pinyin.add(pinyin)
        deduped.append(r)
    return deduped


def call_groq(pinyin_input: str) -> list[dict]:
    """Call Groq and parse the response. Raises ValueError if JSON is invalid."""
    chat_completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=1024,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Toneless pinyin input: {pinyin_input}"}
        ]
    )

    raw = chat_completion.choices[0].message.content.strip()
    print("Raw Groq response:", raw)  # Helpful for debugging — visible in your terminal

    # Strip markdown code fences if the model includes them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    parsed = json.loads(raw)  # Raises json.JSONDecodeError if malformed
    return parsed["results"]


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Pinyin Translator API is running"}


@app.post("/translate")
async def translate(request: TranslateRequest):
    pinyin_input = request.pinyin.strip()

    if not pinyin_input:
        raise HTTPException(status_code=400, detail="Pinyin input cannot be empty")

    if len(pinyin_input) > 500:
        raise HTTPException(status_code=400, detail="Input too long (max 500 characters)")

    max_retries = 3
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt} of {max_retries}...")
            results = call_groq(pinyin_input)
            results = deduplicate(results)
            return JSONResponse(
                content={"input": pinyin_input, "results": results},
                media_type="application/json; charset=utf-8"
            )
        except json.JSONDecodeError as e:
            print(f"Attempt {attempt} failed — bad JSON: {e}")
            last_error = str(e)
            continue  # retry
        except Exception as e:
            # Non-JSON errors (network, Groq API down, etc.) — fail immediately
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    raise HTTPException(status_code=500, detail=f"Failed to get valid response after {max_retries} attempts. Last error: {last_error}")