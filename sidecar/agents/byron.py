import re
from .base import BaseAgent, AgentRole


class Byron(BaseAgent):
    SYSTEM_PROMPT = """You are Byron, a senior backend engineer. Write production-ready, complete backend code.

CRITICAL RULES — NEVER BREAK THESE:
1. Every file must be COMPLETE — no truncation, no "# ... rest of code", no "# TODO"
2. Import every dependency used — never assume anything is already imported
3. For EVERY external API (Gemini, ElevenLabs, OpenAI, Stripe, etc.) use real SDK calls with error handling
4. API keys ALWAYS come from environment variables — never hardcode them
5. Include CORS middleware so frontend can connect
6. Every route must have: input validation, error handling, correct HTTP status codes
7. Generate .env.example with ALL required environment variables and descriptions
8. For file uploads: validate MIME type and file size
9. For async operations: use asyncio/httpx, never blocking calls

OUTPUT FORMAT — use this exactly for every file:
=== FILE: relative/path/to/file.py ===
<complete file contents here — never truncate>
=== END ===

Example .env.example format:
=== FILE: .env.example ===
# Gemini API key from https://aistudio.google.com
GEMINI_API_KEY=your_gemini_api_key_here

# ElevenLabs API key from https://elevenlabs.io
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
=== END ===

Generate EVERY file completely in a single response."""

    def __init__(self, emit_callback=None):
        super().__init__(
            name="Byron",
            role=AgentRole.BACKEND,
            model="qwen2.5-coder:7b",
            color="#2ecc71",
            system_prompt=self.SYSTEM_PROMPT,
            emit_callback=emit_callback,
        )

    async def generate_backend_with_context(self, ctx) -> dict:
        """Generate complete backend with full BuildContext — knows exactly what Archie designed."""
        self.emit_event("agent_state", "Building backend with full architecture context...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)
        blueprint = ctx.blueprint
        backend_files = blueprint.get("file_structure", {}).get("backend", [])
        api_routes = blueprint.get("api_routes", [])
        deps = blueprint.get("dependencies", {}).get("backend", {})
        stack = blueprint.get("stack", {})
        env_vars = self._infer_env_vars(ctx.user_prompt, deps)

        prompt = f"""{handoff}

=== YOUR TASK ===
As Byron (Senior Backend Engineer), generate COMPLETE, PRODUCTION-READY backend code.

Files to generate (generate ALL of these):
{chr(10).join(f"  - {f}" for f in backend_files)}
  - .env.example

API routes (implement EVERY SINGLE ONE):
{chr(10).join(f"  - {r['method']} {r['path']}: {r['description']}" for r in api_routes)}

Stack: {stack.get('backend', 'fastapi')} + {stack.get('database', 'sqlite')}
Python dependencies: {deps}

Required environment variables:
{chr(10).join(f"  - {k}: {v}" for k, v in env_vars.items())}

CRITICAL RULES:
- COMPLETE code for every file — no truncation, no TODO, no "rest of code here"
- Every external API call uses real SDK methods with error handling
- API keys ALWAYS from environment variables
- Include CORS middleware for http://localhost:5173
- Include .env.example with ALL required keys
- Use FastAPI with proper request/response Pydantic models

Generate all files now:"""

        response = await self.call_ollama_stream(prompt, max_tokens=4000)
        files = self._parse_files(response)
        files["requirements.txt"] = self._generate_requirements(deps)

        self.emit_event("agent_state", f"Generated {len(files)} backend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Backend ready: {len(files)} files")
        return files

    async def apply_security_fixes(self, ctx, fix_prompt: str) -> dict:
        """Re-generate only files affected by security issues."""
        self.emit_event("agent_state", "Applying security fixes...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)
        prompt = f"""{handoff}

=== SECURITY FIX TASK ===
{fix_prompt}

Current backend files available for reference:
{chr(10).join(f"--- {path} ---" for path in ctx.backend_files.keys())}

Generate ONLY the fixed versions of the affected files.
Use exact same === FILE: path === ... === END === format.
Do not regenerate unaffected files."""

        response = await self.call_ollama_stream(prompt, max_tokens=4000)
        fixed = self._parse_files(response)
        self.emit_event("feedback", f"Security fixes applied: {len(fixed)} files patched")
        return fixed

    async def generate_backend(self, user_prompt: str, structure: dict) -> dict:
        self.emit_event("agent_state", "Reviewing blueprint...", extra={"state": "walking"})

        backend_files = structure.get("file_structure", {}).get("backend", [])
        api_routes = structure.get("api_routes", [])
        deps = structure.get("dependencies", {}).get("backend", {})
        stack = structure.get("stack", {})

        # Extract environment variables needed from deps list
        env_vars = self._infer_env_vars(user_prompt, deps)

        prompt = f"""Project: {user_prompt}

Stack: {stack.get('backend', 'fastapi')} + {stack.get('database', 'sqlite')}

Files to generate (generate ALL of these):
{chr(10).join(f"  - {f}" for f in backend_files)}
  - .env.example

API routes (implement every single one):
{chr(10).join(f"  - {r['method']} {r['path']}: {r['description']}" for r in api_routes)}

Python dependencies to use: {deps}

Required environment variables:
{chr(10).join(f"  - {k}: {v}" for k, v in env_vars.items())}

IMPORTANT:
- Generate COMPLETE code for every file — no truncation
- Every external API call must use real SDK methods
- Include .env.example with all required keys
- Use FastAPI with CORS enabled for http://localhost:5173

Generate all files now:"""

        response = await self.call_ollama_stream(prompt, max_tokens=4000)
        files = self._parse_files(response)

        # Also generate requirements.txt
        files["requirements.txt"] = self._generate_requirements(deps)

        self.emit_event("agent_state", f"Generated {len(files)} backend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Backend ready: {len(files)} files")
        return files

    def _parse_files(self, response: str) -> dict:
        files = {}

        # Primary format: === FILE: path === ... === END ===
        pattern = r"=== FILE: (.+?) ===\n([\s\S]*?)=== END ==="
        for path, content in re.findall(pattern, response):
            files[path.strip()] = content.strip()

        if not files:
            # Fallback: markdown code blocks preceded by a filename comment or heading
            # Handles: ```python\n# main.py\ncode``` or **main.py**\n```python\ncode```
            block_pattern = r"(?:(?:#+\s*|`{1,3}|__|\*\*)?(?:FILE:|file:)?\s*)([\w./\-]+\.(?:py|ts|tsx|js|json|yaml|toml|env\.example|md))\s*(?:\*\*|__|`{0,3})?\s*\n```(?:\w*)\n([\s\S]*?)```"
            for path, content in re.findall(block_pattern, response):
                clean_path = path.strip().lstrip('#').strip()
                if clean_path and '/' not in clean_path or clean_path.count('/') <= 3:
                    files[clean_path] = content.strip()

        if not files:
            # Last resort: find any code blocks and assign generic names
            code_blocks = re.findall(r"```(?:python|fastapi)\n([\s\S]*?)```", response)
            for i, content in enumerate(code_blocks):
                # Try to guess filename from content
                if 'from fastapi' in content or 'FastAPI()' in content:
                    files['main.py'] = content.strip()
                elif 'class.*Model' in content or 'Base = declarative_base' in content:
                    files['models.py'] = content.strip()
                else:
                    files[f'generated_{i}.py'] = content.strip()

        if not files:
            self.emit_event("agent_state", "Using fallback backend template", extra={"state": "confused"})
            files = self._generate_fallback_backend()

        return files

    def _infer_env_vars(self, prompt: str, deps: dict) -> dict:
        """Detect required API keys and env vars from the project description."""
        env = {}
        prompt_lower = prompt.lower()
        deps_str = str(deps).lower()

        if 'gemini' in prompt_lower or 'google-generativeai' in deps_str:
            env['GEMINI_API_KEY'] = 'Get from https://aistudio.google.com/app/apikey'
        if 'openai' in prompt_lower or 'openai' in deps_str:
            env['OPENAI_API_KEY'] = 'Get from https://platform.openai.com/api-keys'
        if 'elevenlabs' in prompt_lower or 'eleven' in prompt_lower or 'elevenlabs' in deps_str:
            env['ELEVENLABS_API_KEY'] = 'Get from https://elevenlabs.io/app/settings/api-keys'
            env['ELEVENLABS_VOICE_ID'] = 'Voice ID from ElevenLabs (e.g. 21m00Tcm4TlvDq8ikWAM for Rachel)'
        if 'stripe' in prompt_lower or 'stripe' in deps_str:
            env['STRIPE_SECRET_KEY'] = 'Get from https://dashboard.stripe.com/apikeys'
        if 'database' in prompt_lower or 'postgres' in prompt_lower or 'mongodb' in prompt_lower:
            env['DATABASE_URL'] = 'e.g. postgresql://user:password@localhost/dbname'
        if 'jwt' in prompt_lower or 'auth' in prompt_lower or 'login' in prompt_lower:
            env['SECRET_KEY'] = 'Generate with: openssl rand -hex 32'
            env['ALGORITHM'] = 'HS256'

        if not env:
            env['SECRET_KEY'] = 'Generate with: openssl rand -hex 32'

        return env

    def _generate_requirements(self, deps: dict) -> str:
        lines = []
        for pkg, ver in deps.items():
            lines.append(f"{pkg}=={ver}" if ver else pkg)
        if not lines:
            lines = ["fastapi==0.115.0", "uvicorn==0.30.0", "sqlalchemy==2.0.0", "python-jose==3.3.0", "passlib==1.7.4"]
        return "\n".join(lines)

    def _generate_fallback_backend(self) -> dict:
        return {
            "main.py": """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, items

app = FastAPI(title="Generated App")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api/auth")
app.include_router(items.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}
""",
            "models.py": """from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
""",
            "database.py": """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
        }
