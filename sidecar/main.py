import asyncio
import json
import os
import subprocess
import httpx
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Load .env if present (ANTHROPIC_API_KEY etc.)
try:
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(_env_path):
        with open(_env_path) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip('"').strip("'")
                    if _v:  # override empty env values
                        os.environ[_k] = _v
except Exception:
    pass

app = FastAPI(title="OctoForge Sidecar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE = "http://localhost:11434"
REQUIRED_MODELS = ["phi4-mini", "qwen2.5-coder:7b"]

# Model assignment map (used by UI for display)
MODEL_ASSIGNMENTS = {
    "orchestrator": "phi4-mini",
    "archie": "qwen2.5-coder:7b",
    "byron": "qwen2.5-coder:7b",
    "faye": "qwen2.5-coder:7b",
    "sentry": "qwen2.5-coder:7b",
}


async def _prewarm_model(model: str) -> None:
    """Load model into VRAM with keep_alive so first real call is instant."""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            await client.post(
                f"{OLLAMA_BASE}/api/generate",
                json={
                    "model": model,
                    "prompt": "ok",
                    "stream": False,
                    "keep_alive": -1,
                    "options": {"num_predict": 1, "num_ctx": 4096},
                },
            )
    except Exception:
        pass


@app.on_event("startup")
async def _startup_prewarm():
    asyncio.create_task(_prewarm_model("qwen2.5-coder:7b"))
    asyncio.create_task(_prewarm_model("phi4-mini"))


@app.get("/health")
async def health():
    return {"status": "ready"}


@app.get("/ollama/health")
async def ollama_health():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            models = resp.json().get("models", [])
            names = [m.get("name", "") for m in models]

            available = [m for m in REQUIRED_MODELS if any(m in n for n in names)]
            missing = [m for m in REQUIRED_MODELS if m not in available]

            return {
                "ollama_running": True,
                "available_models": available,
                "missing_models": missing,
                "model_assignments": MODEL_ASSIGNMENTS,
                "ready": len(missing) == 0,
            }
    except Exception as e:
        return {
            "ollama_running": False,
            "available_models": [],
            "missing_models": REQUIRED_MODELS,
            "model_assignments": MODEL_ASSIGNMENTS,
            "ready": False,
            "error": str(e),
        }


@app.get("/models/pull")
async def pull_model_stream(model: str = Query(...)):
    """SSE endpoint that streams ollama pull progress for a given model."""

    async def pull_generator():
        proc = await asyncio.create_subprocess_exec(
            "ollama", "pull", model,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )

        yield f"data: {json.dumps({'event': 'pull_start', 'model': model, 'message': f'Pulling {model}...'})}\n\n"

        assert proc.stdout is not None
        async for line in proc.stdout:
            text = line.decode("utf-8", errors="replace").strip()
            if text:
                # Parse progress from ollama output
                progress = 0
                if "%" in text:
                    try:
                        pct = text.split("%")[0].split()[-1]
                        progress = int(pct)
                    except (ValueError, IndexError):
                        pass
                yield f"data: {json.dumps({'event': 'pull_progress', 'model': model, 'message': text, 'progress': progress})}\n\n"

        await proc.wait()
        success = proc.returncode == 0
        yield f"data: {json.dumps({'event': 'pull_complete' if success else 'pull_error', 'model': model, 'message': f'{model} ready!' if success else f'Failed to pull {model}'})}\n\n"

    return StreamingResponse(
        pull_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/build/stream")
async def build_stream(
    prompt: str = Query(..., description="User's app description"),
    folder: str = Query(..., description="Output project folder"),
):
    """SSE endpoint — streams build events from orchestrator to frontend."""

    async def event_generator():
        from orchestrator import Orchestrator

        queue: asyncio.Queue = asyncio.Queue()

        def emit(event: dict):
            # Called from within the async context — put_nowait is safe here
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass

        orch = Orchestrator(emit_callback=emit)

        async def run_orch():
            try:
                # Consume the generator (it emits directly via emit callback)
                async for _ in orch.run(prompt, folder):
                    pass
            except Exception as e:
                queue.put_nowait({"event": "error", "agent": "system", "message": str(e)})
            finally:
                queue.put_nowait(None)  # sentinel — tells reader loop to stop

        task = asyncio.create_task(run_orch())

        # Read from queue until sentinel
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

        await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/project/inspect")
async def project_inspect(folder: str = Query(...)):
    """Detect if a folder already has an OctoForge build (vault + arch doc)."""
    if not folder or not os.path.isdir(folder):
        return {"exists": False}
    brain = os.path.join(folder, ".brain")
    arch = os.path.join(folder, "ARCHITECTURE.md")
    readme = os.path.join(folder, "README.md")
    has_brain = os.path.isdir(brain)
    return {
        "exists": has_brain or os.path.isfile(arch),
        "has_brain": has_brain,
        "has_architecture": os.path.isfile(arch),
        "has_readme": os.path.isfile(readme),
        "suggested_prompt_prefix": (
            "Before making changes, read the Obsidian vault at .brain/ to understand "
            "the existing architecture, API routes, and security audit. Then: "
        ) if has_brain else "",
    }


@app.get("/voice/health")
async def voice_health():
    """Check if ElevenLabs voice is available."""
    try:
        from services.voice import check_voice_available
        return await check_voice_available()
    except Exception as e:
        return {"available": False, "reason": str(e)}


@app.get("/analytics/embedding-health")
async def embedding_health():
    """Check if embedding model is available."""
    try:
        from services.embeddings import get_embedding
        emb = await get_embedding("test")
        return {"available": emb is not None, "model": "nomic-embed-text"}
    except Exception as e:
        return {"available": False, "model": "nomic-embed-text", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
