import re
from .base import BaseAgent, AgentRole


class Faye(BaseAgent):
    SYSTEM_PROMPT = """You are Faye, a senior frontend engineer specializing in React + TypeScript + Tailwind CSS.

CRITICAL RULES — NEVER BREAK THESE:
1. Every component must be COMPLETE — no truncation, no "// TODO", no "// implement this"
2. Wire up EVERY API route shown — use fetch() or axios for each one
3. Handle ALL states: loading spinner, error message, success, empty
4. Use TypeScript interfaces for all API response shapes
5. Tailwind CSS only — no inline styles, no CSS files (except globals)
6. Dark theme by default (bg-gray-900 / bg-slate-900)
7. For file uploads: use FormData and show upload progress
8. For audio: use <audio> element with controls, handle blob URLs
9. For images: lazy load, show skeleton while loading
10. For long operations (AI generation): show a progress indicator / streaming text

OUTPUT FORMAT — use this exactly:
=== FILE: relative/path/to/file.tsx ===
<complete component code — never truncate>
=== END ===

Generate EVERY file completely."""

    def __init__(self, emit_callback=None):
        super().__init__(
            name="Faye",
            role=AgentRole.FRONTEND,
            model="qwen2.5-coder:7b",
            color="#bb86fc",
            system_prompt=self.SYSTEM_PROMPT,
            emit_callback=emit_callback,
        )

    async def generate_frontend_with_context(self, ctx) -> dict:
        """Generate complete frontend with FULL context — knows Byron's exact API shapes."""
        self.emit_event("agent_state", "Building frontend with full backend context...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)  # includes Byron's full code for Faye
        blueprint = ctx.blueprint
        frontend_files = blueprint.get("file_structure", {}).get("frontend", [])
        api_routes = blueprint.get("api_routes", [])
        deps = blueprint.get("dependencies", {}).get("frontend", {})

        # Extract API shapes from Byron's actual code
        backend_context = self._extract_api_context(ctx.backend_files, api_routes)

        prompt = f"""{handoff}

=== YOUR TASK ===
As Faye (Senior Frontend Engineer), generate COMPLETE React + TypeScript + Tailwind CSS frontend.

Project: {ctx.user_prompt}

Backend API (connect to http://localhost:8000):
{backend_context}

Frontend files to generate (generate ALL of these):
{chr(10).join(f"  - {f}" for f in frontend_files)}

CRITICAL RULES:
- Wire up EVERY API route shown above with real fetch() calls
- Match the exact request body shapes from Byron's backend code above
- Handle audio blob responses with URL.createObjectURL()
- Handle image base64/URL responses in <img> tags
- Dark theme (bg-gray-900), modern UI, fully responsive
- Show loading spinners during AI generation (calls take 5-30 seconds)
- COMPLETE code for every file — no truncation, no TODO
- TypeScript interfaces for ALL API response shapes
- Handle ALL states: loading, error, success, empty

Generate all files now:"""

        response = await self.call_ollama_stream(prompt, max_tokens=7000)
        files = self._parse_files(response)

        # Add boilerplate files
        files["package.json"] = self._generate_package_json(blueprint.get("project_name", "app"), deps)
        files["index.html"] = self._generate_index_html(blueprint.get("project_name", "App"))
        files["vite.config.ts"] = self._generate_vite_config()

        self.emit_event("agent_state", f"Generated {len(files)} frontend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Frontend ready: {len(files)} files")
        return files

    async def apply_security_fixes(self, ctx, fix_prompt: str) -> dict:
        """Re-generate only frontend files affected by security issues."""
        self.emit_event("agent_state", "Applying frontend security fixes...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)
        prompt = f"""{handoff}

=== SECURITY FIX TASK ===
{fix_prompt}

Current frontend files available for reference:
{chr(10).join(f"--- {path} ---" for path in ctx.frontend_files.keys())}

Generate ONLY the fixed versions of the affected files.
Use exact same === FILE: path === ... === END === format.
Do not regenerate unaffected files."""

        response = await self.call_ollama_stream(prompt, max_tokens=7000)
        fixed = self._parse_files(response)
        self.emit_event("feedback", f"Frontend security fixes: {len(fixed)} files patched")
        return fixed

    async def generate_frontend(self, user_prompt: str, structure: dict, backend_files: dict) -> dict:
        self.emit_event("agent_state", "Reading backend API shape...", extra={"state": "walking"})

        frontend_files = structure.get("file_structure", {}).get("frontend", [])
        api_routes = structure.get("api_routes", [])
        deps = structure.get("dependencies", {}).get("frontend", {})

        # Extract backend API shape from actual generated code (not just route names)
        backend_context = self._extract_api_context(backend_files, api_routes)

        prompt = f"""Project: {user_prompt}

Backend API (connect to http://localhost:8000):
{backend_context}

Frontend files to generate (generate ALL of these):
{chr(10).join(f"  - {f}" for f in frontend_files)}

IMPORTANT:
- Wire up EVERY API route shown above with real fetch() calls
- Match the exact request body shapes shown in the backend code
- Handle audio blob responses with URL.createObjectURL()
- Handle image base64/URL responses in <img> tags
- Dark theme, modern UI, responsive layout
- Show loading spinners during AI generation (these calls take 5-30 seconds)
- COMPLETE code for every file — no truncation

Generate all files now:"""

        response = await self.call_ollama_stream(prompt, max_tokens=7000)
        files = self._parse_files(response)

        # Add package.json
        files["package.json"] = self._generate_package_json(structure.get("project_name", "app"), deps)
        files["index.html"] = self._generate_index_html(structure.get("project_name", "App"))
        files["vite.config.ts"] = self._generate_vite_config()

        self.emit_event("agent_state", f"Generated {len(files)} frontend files", extra={"state": "celebrating"})
        self.emit_event("feedback", f"Frontend ready: {len(files)} files")
        return files

    def _extract_api_context(self, backend_files: dict, api_routes: list) -> str:
        """Extract relevant API shape from backend files for Faye to use."""
        lines = []

        # Always include route signatures
        for r in api_routes:
            lines.append(f"  {r['method']} {r['path']} — {r['description']}")

        # Extract Pydantic models and function signatures from backend files
        for path, content in backend_files.items():
            if not content or path in ('requirements.txt', '.env.example'):
                continue
            relevant_lines = []
            for line in content.split('\n'):
                stripped = line.strip()
                # Pydantic models (request/response shapes)
                if stripped.startswith('class ') and ('BaseModel' in stripped or 'Model' in stripped):
                    relevant_lines.append(line)
                elif relevant_lines and (stripped.startswith('    ') or stripped == ''):
                    relevant_lines.append(line)
                    if stripped == '' and len(relevant_lines) > 2:
                        break
                # Route decorators + function signatures
                elif stripped.startswith('@app.') or stripped.startswith('@router.'):
                    relevant_lines.append(line)
                elif relevant_lines and stripped.startswith('async def ') or stripped.startswith('def '):
                    relevant_lines.append(line)
                    break

            if relevant_lines:
                lines.append(f"\n# From {path}:")
                lines.extend(relevant_lines[:40])  # max 40 lines per file

        return '\n'.join(lines) if lines else '\n'.join(
            f"  {r['method']} {r['path']} — {r['description']}" for r in api_routes
        )

    def _parse_files(self, response: str) -> dict:
        files = {}

        # Primary: === FILE: path === ... === END ===
        pattern = r"=== FILE: (.+?) ===\n([\s\S]*?)=== END ==="
        for path, content in re.findall(pattern, response):
            files[path.strip()] = content.strip()

        if not files:
            # Fallback: markdown code blocks with filename hints
            block_pattern = r"(?:(?:#+\s*|`{1,3}|__|\*\*)?(?:FILE:|file:)?\s*)([\w./\-]+\.(?:tsx?|jsx?|json|css|html))\s*(?:\*\*|__|`{0,3})?\s*\n```(?:\w*)\n([\s\S]*?)```"
            for path, content in re.findall(block_pattern, response):
                clean = path.strip().lstrip('#').strip()
                if clean:
                    files[clean] = content.strip()

        if not files:
            self.emit_event("agent_state", "Using fallback frontend template", extra={"state": "confused"})
            files = self._generate_fallback_frontend()

        return files

    def _generate_package_json(self, name: str, deps: dict) -> str:
        import json
        pkg = {
            "name": name,
            "version": "1.0.0",
            "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
            "dependencies": deps or {"react": "^19.0.0", "react-dom": "^19.0.0"},
            "devDependencies": {
                "@vitejs/plugin-react": "^4.0.0",
                "typescript": "^5.0.0",
                "vite": "^6.0.0",
                "tailwindcss": "^4.0.0",
                "@tailwindcss/vite": "^4.0.0",
            },
        }
        return json.dumps(pkg, indent=2)

    def _generate_index_html(self, name: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{name}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>"""

    def _generate_vite_config(self) -> str:
        return """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:8000' } }
})"""

    def _generate_fallback_frontend(self) -> dict:
        return {
            "src/main.tsx": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)""",
            "src/App.tsx": """import { useState, useEffect } from 'react'

export default function App() {
  const [status, setStatus] = useState<string>('Checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setStatus(d.status))
      .catch(() => setStatus('Backend offline'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">App</h1>
        <p className="text-gray-400">Backend: {status}</p>
      </div>
    </div>
  )
}""",
            "src/index.css": "@import 'tailwindcss';\n",
        }
