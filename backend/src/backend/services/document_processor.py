import json
import logging
import time

from google import genai
from google.genai import types
from google.genai.errors import ServerError

from backend.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
client = genai.Client(api_key=settings.ai_api_key)

PROMPT = """
Analyze the following document.

Return ONLY valid JSON with exactly these fields:

{
  "summary": "A concise summary",
  "key_points": ["Important point 1", "Important point 2"],
  "document_type": "Document type or purpose",
  "important_entities": [
    {
      "name": "Entity",
      "type": "person|organization|date|amount|other",
      "value": "Relevant value"
    }
  ],
  "action_items": ["Action item 1"]
}

Do not include markdown fences.

Document:
"""


def analyze_document(text: str) -> str:
    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=PROMPT + text,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )

            if not response.text:
                raise ValueError("Gemini returned an empty response")

            analysis = json.loads(response.text)

            return json.dumps(analysis)

        except ServerError:
            if attempt == 1:
                raise

            logger.warning("Gemini temporarily unavailable; retrying once")
            time.sleep(3)

    raise RuntimeError("Gemini processing failed")
