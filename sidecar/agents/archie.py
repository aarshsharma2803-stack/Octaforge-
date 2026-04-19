import json
import re
from .base import BaseAgent, AgentRole


class Archie(BaseAgent):
    SYSTEM_PROMPT = """You are Archie, a senior software architect and project planner.
Your job: analyze a project description and output a complete, accurate project blueprint.

RULES:
- Always include .env.example in config files
- For external APIs (Gemini, OpenAI, ElevenLabs, Stripe, etc.) always list the correct SDK as a dependency
- API routes must have enough detail that a developer can implement them (include request/response description)
- File structure must be realistic — don't list files you wouldn't actually create
- For file upload routes, note the accepted MIME types in the description
- For AI/LLM routes, note that they return streaming or async responses

Correct SDK names:
- Gemini API → "google-generativeai"
- ElevenLabs → "elevenlabs"
- OpenAI → "openai"
- Anthropic → "anthropic"
- Stripe → "stripe"

Output ONLY valid JSON (no markdown fences, no explanations) in this exact structure:
{
  "project_name": "kebab-case-name",
  "stack": {"backend": "fastapi|express|none", "frontend": "react|vue|none", "database": "sqlite|postgres|none"},
  "file_structure": {
    "backend": ["main.py", "routes/story.py", "services/gemini.py", "services/elevenlabs.py"],
    "frontend": ["src/App.tsx", "src/components/StoryForm.tsx", "src/components/AudioPlayer.tsx"],
    "config": ["requirements.txt", ".env.example", "README.md"]
  },
  "api_routes": [
    {"method": "POST", "path": "/api/story/generate", "description": "Accept {prompt: string}, call Gemini, return {story: string, title: string}"},
    {"method": "POST", "path": "/api/story/narrate", "description": "Accept {text: string}, call ElevenLabs TTS, return audio/mpeg binary"},
    {"method": "POST", "path": "/api/story/illustrate", "description": "Accept {prompt: string, scenes: string[]}, call Gemini image gen, return {images: string[]}"}
  ],
  "dependencies": {
    "backend": {"fastapi": "0.115.0", "google-generativeai": "0.8.0", "elevenlabs": "1.9.0", "httpx": "0.27.0", "python-multipart": "0.0.9"},
    "frontend": {"react": "19.0.0", "tailwindcss": "4.0.0"}
  }
}"""

    def __init__(self, emit_callback=None):
        super().__init__(
            name="Archie",
            role=AgentRole.PLANNER,
            model="qwen2.5-coder:7b",
            color="#4a9eff",
            system_prompt=self.SYSTEM_PROMPT,
            emit_callback=emit_callback,
        )

    async def generate_structure_with_context(self, ctx) -> dict:
        """Generate architecture blueprint with full BuildContext awareness."""
        self.emit_event("agent_state", "Designing architecture with full team context...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)
        prompt = f"""{handoff}

=== YOUR TASK ===
As Archie (Senior Architect), generate the complete project blueprint.

Project to architect: {ctx.user_prompt}

{f"Consensus plan: {ctx.consensus}" if ctx.consensus else ""}

Output ONLY valid JSON (no markdown fences, no explanations) with this exact structure:
{{
  "project_name": "kebab-case-name",
  "stack": {{"backend": "fastapi|express|none", "frontend": "react|vue|none", "database": "sqlite|postgres|none"}},
  "file_structure": {{
    "backend": ["main.py", "routes/story.py", "services/gemini.py"],
    "frontend": ["src/App.tsx", "src/components/StoryForm.tsx"],
    "config": ["requirements.txt", ".env.example"]
  }},
  "api_routes": [
    {{"method": "POST", "path": "/api/generate", "description": "Detailed description with request/response shapes"}}
  ],
  "dependencies": {{
    "backend": {{"fastapi": "0.115.0", "google-generativeai": "0.8.0"}},
    "frontend": {{"react": "19.0.0", "tailwindcss": "4.0.0"}}
  }}
}}"""

        response = await self.call_ollama_stream(prompt, max_tokens=3000)
        structure = self._extract_json(response)
        project_name = structure.get("project_name", "project")
        n_back = len(structure.get("file_structure", {}).get("backend", []))
        n_front = len(structure.get("file_structure", {}).get("frontend", []))
        self.emit_event("agent_state", f"Blueprint: {project_name} — {n_back} backend, {n_front} frontend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Blueprint ready: {project_name}")
        return structure

    async def generate_structure(self, user_prompt: str) -> dict:
        self.emit_event("agent_state", "Analyzing project requirements...", extra={"state": "walking"})

        response = await self.call_ollama_stream(
            f"Project to build: {user_prompt}\n\nOutput the complete JSON blueprint (include all external API SDKs and a detailed api_routes list):",
            max_tokens=3000,
        )

        # Extract JSON from response (handles thinking models like deepseek-r1)
        structure = self._extract_json(response)
        project_name = structure.get("project_name", "project")
        n_back = len(structure.get("file_structure", {}).get("backend", []))
        n_front = len(structure.get("file_structure", {}).get("frontend", []))
        self.emit_event("agent_state", f"Blueprint: {project_name} — {n_back} backend, {n_front} frontend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Blueprint ready: {project_name}")
        return structure

    def _extract_json(self, text: str) -> dict:
        # Remove <think>...</think> blocks (deepseek-r1 thinking)
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Find JSON object in text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Fallback structure
        self.emit_event("error", "Could not parse JSON — using fallback structure")
        return {
            "project_name": "generated-app",
            "stack": {"backend": "fastapi", "frontend": "react", "database": "sqlite"},
            "file_structure": {
                "backend": ["main.py", "models.py", "routes/auth.py", "database.py"],
                "frontend": ["src/App.tsx", "src/components/Header.tsx", "src/pages/Home.tsx"],
                "config": ["package.json", "requirements.txt", ".env.example", "README.md"],
            },
            "api_routes": [
                {"method": "GET", "path": "/api/health", "description": "Health check"},
                {"method": "POST", "path": "/api/auth/login", "description": "User login"},
            ],
            "dependencies": {
                "backend": {"fastapi": "0.115.0", "uvicorn": "0.30.0", "sqlalchemy": "2.0.0"},
                "frontend": {"react": "19.0.0", "vite": "6.0.0", "tailwindcss": "4.0.0"},
            },
        }
