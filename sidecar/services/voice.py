"""
Voice service — ElevenLabs TTS with natural speech rewriting via Ollama.
Each agent gets a distinct voice and personality for natural-sounding discussion.
"""

import os
import base64
import httpx

OLLAMA_BASE = "http://localhost:11434"
ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
SPEECH_REWRITE_MODEL = "phi4-mini"

# ElevenLabs voice IDs — distinct voices per agent personality
# These are default ElevenLabs voices; user can override via env vars
AGENT_VOICES = {
    "archie": {
        "voice_id": os.environ.get("VOICE_ARCHIE", "pNInz6obpgDQGcFmaJgB"),  # Adam — deep, thoughtful
        "personality": "Thoughtful senior architect. Speaks slowly, pauses to think. Uses 'hmm', 'so', 'let me think about this'. Measured and deliberate.",
        "stability": 0.5,
        "similarity_boost": 0.75,
    },
    "byron": {
        "voice_id": os.environ.get("VOICE_BYRON", "ErXwobaYiN019PkySvjV"),  # Antoni — confident, direct
        "personality": "Confident backend engineer. Direct and assertive. Uses 'right', 'so basically', 'what I'm gonna do'. No-nonsense but friendly.",
        "stability": 0.6,
        "similarity_boost": 0.8,
    },
    "faye": {
        "voice_id": os.environ.get("VOICE_FAYE", "EXAVITQu4vr4xnSDxMaL"),  # Bella — energetic, warm
        "personality": "Energetic frontend developer. Fast talker, excited. Uses 'okay okay', 'ooh', 'so like', 'I love this'. Enthusiastic about design.",
        "stability": 0.4,
        "similarity_boost": 0.7,
    },
    "sentry": {
        "voice_id": os.environ.get("VOICE_SENTRY", "VR6AewLTigWG4xSOukaG"),  # Arnold — serious, measured
        "personality": "Serious security engineer. Measured, careful. Uses 'hold on', 'wait', 'I need to flag something', 'let me check'. Slightly tense.",
        "stability": 0.7,
        "similarity_boost": 0.85,
    },
    "orchestrator": {
        "voice_id": os.environ.get("VOICE_ORCHESTRATOR", "onwK4e9ZLuTAKqWW03F9"),  # Daniel — authoritative
        "personality": "Team lead orchestrating the discussion. Authoritative but warm. Uses 'alright team', 'so here's what we're doing', 'let's move on to'. Keeps things on track.",
        "stability": 0.6,
        "similarity_boost": 0.8,
    },
}


async def rewrite_as_speech(agent_name: str, technical_message: str) -> str:
    """
    Rewrite a technical agent message as natural spoken dialogue.
    Adds personality, filler words, and conversational tone.
    """
    agent_key = agent_name.lower()
    config = AGENT_VOICES.get(agent_key, AGENT_VOICES["orchestrator"])

    prompt = f"""Rewrite this technical update as natural spoken dialogue for {agent_name}.

PERSONALITY: {config['personality']}

RULES:
- Max 2-3 sentences, keep it SHORT
- Add filler words naturally (um, so, right, okay, like, hmm, well)
- Add speech disfluencies (pauses with "...", self-corrections "I mean", restarts)
- Keep ALL technical accuracy — don't lose any real information
- Sound like a real person talking in a meeting, not reading a report
- Reference other agents by name when relevant ("Byron's API looks good")
- Show emotion — excitement, concern, confidence as appropriate

TECHNICAL MESSAGE:
{technical_message[:500]}

SPOKEN VERSION (just the dialogue, nothing else):"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={
                    "model": SPEECH_REWRITE_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.8, "num_predict": 200},
                },
            )
            resp.raise_for_status()
            result = resp.json().get("response", "").strip()
            # Clean up — remove quotes if wrapped
            result = result.strip('"\'')
            if result:
                return result
    except Exception:
        pass

    # Fallback: return original with minimal personality prefix
    prefixes = {
        "archie": "Hmm, so... ",
        "byron": "Right, so basically ",
        "faye": "Okay okay, so ",
        "sentry": "Hold on — ",
        "orchestrator": "Alright team, ",
    }
    return prefixes.get(agent_key, "") + technical_message[:200]


async def text_to_speech(agent_name: str, text: str) -> bytes | None:
    """
    Convert text to speech via ElevenLabs API.
    Returns raw MP3 bytes, or None if API unavailable.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        return None

    agent_key = agent_name.lower()
    config = AGENT_VOICES.get(agent_key, AGENT_VOICES["orchestrator"])
    voice_id = config["voice_id"]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {
                        "stability": config["stability"],
                        "similarity_boost": config["similarity_boost"],
                    },
                },
            )
            resp.raise_for_status()
            return resp.content
    except Exception:
        return None


async def generate_voice_event(agent_name: str, technical_message: str) -> dict | None:
    """
    Full pipeline: rewrite → TTS → base64 audio event.
    Returns SSE-ready dict with audio data, or None if TTS unavailable.
    """
    # Step 1: Rewrite as natural speech
    spoken = await rewrite_as_speech(agent_name, technical_message)

    # Step 2: Convert to speech
    audio_bytes = await text_to_speech(agent_name, spoken)
    if not audio_bytes:
        # Return speech text without audio (frontend can show as subtitle)
        return {
            "event": "voice_text",
            "agent": agent_name.lower(),
            "spoken_text": spoken,
            "has_audio": False,
        }

    # Step 3: Encode as base64
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

    return {
        "event": "voice_stream",
        "agent": agent_name.lower(),
        "spoken_text": spoken,
        "audio_b64": audio_b64,
        "audio_format": "mp3",
        "has_audio": True,
    }


async def check_voice_available() -> dict:
    """Check if ElevenLabs API key is configured and valid."""
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        return {"available": False, "reason": "ELEVENLABS_API_KEY not set"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{ELEVENLABS_BASE}/user",
                headers={"xi-api-key": api_key},
            )
            resp.raise_for_status()
            data = resp.json()
            chars_remaining = data.get("subscription", {}).get("character_count", 0)
            chars_limit = data.get("subscription", {}).get("character_limit", 0)
            return {
                "available": True,
                "characters_remaining": chars_limit - chars_remaining,
                "tier": data.get("subscription", {}).get("tier", "free"),
            }
    except Exception as e:
        return {"available": False, "reason": str(e)}
