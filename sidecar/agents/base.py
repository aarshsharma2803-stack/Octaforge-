import httpx
import json
import re
from enum import Enum
from typing import Callable, Optional


class AgentRole(Enum):
    ORCHESTRATOR = "orchestrator"
    PLANNER = "planner"
    BACKEND = "backend"
    FRONTEND = "frontend"
    SECURITY = "security"


class BaseAgent:
    """Base class for all agents. Supports live token streaming to frontend."""

    def __init__(
        self,
        name: str,
        role: AgentRole,
        model: str,
        color: str,
        system_prompt: str,
        emit_callback: Optional[Callable] = None,
    ):
        self.name = name
        self.role = role
        self.model = model
        self.color = color
        self.system_prompt = system_prompt
        self.emit_callback = emit_callback or (lambda e: None)
        self.ollama_base = "http://localhost:11434"

    async def call_ollama_stream(self, user_message: str, max_tokens: int = 5000) -> str:
        """
        Stream tokens from Ollama in real time.
        Emits `code_stream` events per token so the agent terminal
        shows live code being written.
        Returns the full response when done.
        """
        url = f"{self.ollama_base}/api/generate"
        payload = {
            "model": self.model,
            "system": self.system_prompt,  # separate field — not prepended, saves tokens
            "prompt": user_message,
            "stream": True,
            "keep_alive": -1,  # keep resident until process exits  # keep model resident in VRAM between calls
            "options": {
                "temperature": 0.4,
                "num_predict": max_tokens,
                "num_ctx": 4096,       # halve KV cache — big speedup on 7B
                "num_batch": 1024,     # larger batch prompt eval
                "num_thread": 8,       # use M-series perf cores
                "top_k": 10,           # tighter/faster sampling
                "top_p": 0.9,
                "repeat_penalty": 1.05,
            },
        }

        self.emit_event("agent_state", "Generating code...", extra={"state": "working"})
        self.emit_event("code_stream_start", f"● {self.model} streaming...")

        full_response: list[str] = []
        in_think = False  # suppress deepseek-r1 <think> blocks from display

        try:
            async with httpx.AsyncClient(timeout=600) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            if token:
                                full_response.append(token)
                                if "<think>" in token:
                                    in_think = True
                                if not in_think:
                                    self.emit_event("code_stream", token, extra={"token": token})
                                if "</think>" in token:
                                    in_think = False
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            self.emit_event("error", f"Ollama stream error ({self.model}): {e}")
            raise

        result = "".join(full_response).strip()
        result = re.sub(r"<think>.*?</think>", "", result, flags=re.DOTALL).strip()
        self.emit_event("code_stream_end", "Done.")
        return result

    async def call_ollama(self, user_message: str, max_tokens: int = 2000) -> str:
        """Non-streaming call — for short responses (feedback, consensus)."""
        url = f"{self.ollama_base}/api/generate"
        payload = {
            "model": self.model,
            "system": self.system_prompt,  # separate field — not prepended
            "prompt": user_message,
            "stream": False,
            "keep_alive": -1,  # keep resident until process exits
            "options": {
                "temperature": 0.4,
                "num_predict": max_tokens,
                "num_ctx": 4096,
                "num_batch": 1024,
                "num_thread": 8,
                "top_k": 10,
                "top_p": 0.9,
                "repeat_penalty": 1.05,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=600) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                response = resp.json().get("response", "").strip()
                response = re.sub(r"<think>.*?</think>", "", response, flags=re.DOTALL).strip()
                return response
        except Exception as e:
            self.emit_event("error", f"Ollama error ({self.model}): {e}")
            raise

    def emit_event(self, event_type: str, message: str, extra: Optional[dict] = None) -> None:
        event = {
            "event": event_type,
            "agent": self.name.lower(),
            "color": self.color,
            "message": message,
        }
        if extra:
            event.update(extra)
        self.emit_callback(event)

    async def respond_to_brief(self, brief: str, others_feedback: list = None) -> str:
        """Round 2: Feedback on brief, aware of what others said."""
        others_context = ""
        if others_feedback:
            others_context = "\n\nOther agents already said:\n" + "\n".join(
                f"- {f}" for f in others_feedback
            )

        prompt = f"""Project brief:
{brief}{others_context}

As {self.name} ({self.role.value}), give your feedback:
1. What you will specifically build — files and approach (2 sentences)
2. What you need from other agents (1 sentence)
3. Any concerns (1 sentence, or "None")

Be concise and technical."""

        self.emit_event("agent_state", "Reviewing brief...", extra={"state": "working"})
        response = await self.call_ollama(prompt, max_tokens=400)
        self.emit_event("feedback", response[:400])
        return response
