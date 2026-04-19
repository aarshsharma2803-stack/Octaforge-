import asyncio
import os
import time
import json
import httpx
import re
from dataclasses import dataclass, field
from typing import Callable, AsyncIterator
from agents.archie import Archie
from agents.byron import Byron
from agents.faye import Faye
from agents.sentry import Sentry
from services.embeddings import compute_consensus_matrix, compute_quality_scores
from services.voice import generate_voice_event, check_voice_available

import os

OLLAMA_BASE = "http://localhost:11434"
ORCHESTRATOR_MODEL = "phi4-mini"
CLAUDE_MODEL = "claude-haiku-4-5-20251001"  # fast + smart for planning


@dataclass
class BuildContext:
    """
    Single source of truth that grows through every round.
    Every agent reads from this and writes back to it.
    This is what makes coordination "next level" —
    no agent is ever working blind.
    """
    user_prompt: str
    project_folder: str

    # Populated sequentially — each round enriches the context
    brief: str = ""
    agent_intentions: dict = field(default_factory=dict)   # agentName → their stated plan
    consensus: str = ""
    blueprint: dict = field(default_factory=dict)           # Archie's architecture doc
    backend_files: dict = field(default_factory=dict)       # Byron's output
    frontend_files: dict = field(default_factory=dict)      # Faye's output
    security_issues: list = field(default_factory=list)     # Sentry's findings
    security_score: int = 100
    deployment_files: dict = field(default_factory=dict)    # Dockerfile, compose, README
    all_files: dict = field(default_factory=dict)           # merged final output

    def handoff_for(self, agent_name: str) -> str:
        """
        Build a complete situational briefing for any agent at any point.
        Every agent knows: the goal, what every other agent decided,
        what has been built so far, and exactly what they need to do.
        """
        parts = [f"=== PROJECT GOAL ===\n{self.user_prompt}\n"]

        if self.brief:
            parts.append(f"=== ORCHESTRATOR ANALYSIS ===\n{self.brief}\n")

        if self.consensus:
            parts.append(f"=== CONSENSUS BUILD PLAN ===\n{self.consensus}\n")

        if self.agent_intentions:
            lines = ["=== WHAT EACH AGENT HAS PLANNED ==="]
            for name, intention in self.agent_intentions.items():
                marker = " ← (that's you)" if name.lower() == agent_name.lower() else ""
                lines.append(f"  [{name}]{marker}: {intention[:300]}")
            parts.append('\n'.join(lines) + '\n')

        if self.blueprint:
            parts.append(
                f"=== ARCHITECTURE BLUEPRINT (by Archie) ===\n"
                f"Project: {self.blueprint.get('project_name', '')}\n"
                f"Stack: {json.dumps(self.blueprint.get('stack', {}))}\n"
                f"Backend files: {self.blueprint.get('file_structure', {}).get('backend', [])}\n"
                f"Frontend files: {self.blueprint.get('file_structure', {}).get('frontend', [])}\n"
                f"API routes:\n" +
                '\n'.join(f"  {r.get('method')} {r.get('path')}: {r.get('description')}"
                          for r in self.blueprint.get('api_routes', [])) + '\n'
            )

        if self.backend_files and agent_name.lower() in ('faye', 'sentry'):
            # Give Faye the full backend code so she knows every model, every response
            contract_parts = ["=== BACKEND CODE (by Byron — read every model and route signature) ==="]
            for path, content in self.backend_files.items():
                if content and path not in ('.env.example', 'requirements.txt'):
                    contract_parts.append(f"\n--- {path} ---\n{content[:2000]}")
            parts.append('\n'.join(contract_parts) + '\n')

        if self.security_issues and agent_name.lower() in ('byron', 'faye'):
            parts.append("=== SECURITY ISSUES TO FIX (from Sentry) ===\n" +
                '\n'.join(f"  [{i.get('severity','?').upper()}] {i.get('file','?')}: {i.get('issue','')} → Fix: {i.get('fix','')}"
                          for i in self.security_issues) + '\n')

        return '\n'.join(parts)

    def api_routes_summary(self) -> str:
        routes = self.blueprint.get('api_routes', [])
        return '\n'.join(f"  {r.get('method')} {r.get('path')}: {r.get('description')}" for r in routes)


class Orchestrator:
    """
    Coordinates all agents through a shared BuildContext.
    Every agent gets full situational awareness at every step.
    """

    def __init__(self, emit_callback: Callable):
        self._emit = emit_callback
        self.archie = Archie(self._emit)
        self.byron = Byron(self._emit)
        self.faye = Faye(self._emit)
        self.sentry = Sentry(self._emit)
        self._voice_enabled = False

    def _log(self, event: str, agent: str, message: str, **extra):
        self._emit({"event": event, "agent": agent, "message": message, **extra})

    async def _speak(self, agent_name: str, message: str):
        """Generate and emit a voice event. Always fire-and-forget via _speak_bg."""
        await self._speak_bg(agent_name, message)

    async def _speak_bg(self, agent_name: str, message: str):
        """Background voice — never blocks. Emits text subtitles even without ElevenLabs key."""
        try:
            voice_event = await generate_voice_event(agent_name, message)
            if voice_event:
                self._emit(voice_event)
        except Exception:
            pass

    async def _init_voice_bg(self):
        """Check voice availability in background — never blocks build start."""
        try:
            voice_status = await check_voice_available()
            self._voice_enabled = voice_status.get("available", False)
            self._log("voice_status", "orchestrator",
                f"Voice {'enabled' if self._voice_enabled else 'disabled'}",
                **voice_status)
        except Exception:
            self._voice_enabled = False

    async def _compute_matrix_bg(self, ctx: BuildContext):
        """Compute consensus matrix in background — UI-only, never blocks build."""
        try:
            matrix = await compute_consensus_matrix(ctx.agent_intentions)
            self._log("consensus_matrix", "orchestrator", "Agent alignment computed", **matrix)
        except Exception:
            pass

    async def _compute_quality_bg(self, ctx: BuildContext):
        """Compute code quality scores in background — never blocks."""
        try:
            quality = await compute_quality_scores(ctx.all_files)
            self._log("quality_scores", "orchestrator", f"Code quality: {quality.get('overall', 0)}/100", **quality)
        except Exception:
            pass

    async def _call_phi4(self, prompt: str, max_tokens: int = 1024) -> str:
        payload = {
            "model": ORCHESTRATOR_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.6, "num_predict": max_tokens},
        }
        try:
            async with httpx.AsyncClient(timeout=600) as client:
                resp = await client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
                resp.raise_for_status()
                return resp.json().get("response", "").strip()
        except Exception as e:
            self._log("error", "orchestrator", f"phi4 error: {e}")
            return ""

    async def _prewarm_models(self):
        """Warm up Ollama models so first real call is fast. Fire-and-forget."""
        models = ["qwen2.5-coder:7b", "phi4-mini"]
        async with httpx.AsyncClient(timeout=60) as client:
            for m in models:
                try:
                    await client.post(
                        f"{OLLAMA_BASE}/api/generate",
                        json={"model": m, "prompt": "ok", "stream": False,
                              "keep_alive": -1,
                              "options": {"num_predict": 1}},
                    )
                except Exception:
                    pass

    async def run(self, user_prompt: str, project_folder: str) -> AsyncIterator[dict]:
        ctx = BuildContext(user_prompt=user_prompt, project_folder=project_folder)

        # ── Timing instrumentation ─────────────────────────────────────────
        t0 = time.monotonic()
        phase_times: dict[str, float] = {}

        def tick(label: str):
            elapsed = time.monotonic() - t0
            phase_times[label] = elapsed
            self._emit({
                "event": "timing",
                "agent": "orchestrator",
                "label": label,
                "elapsed_s": round(elapsed, 2),
                "phases": {k: round(v, 2) for k, v in phase_times.items()},
                "message": f"⏱ {label}: {elapsed:.1f}s",
            })

        # ── Pre-warm models so first code-gen call is fast ─────────────────
        asyncio.create_task(self._prewarm_models())

        # ── Voice check: fire-and-forget, never block build ────────────────
        asyncio.create_task(self._init_voice_bg())

        tick("start")

        # ── Round 1: Fast Analysis (short prompt → fast first token) ───────
        self._log("round_start", "orchestrator", "🔍 Analyzing project requirements...", round=1, title="Analysis")
        await self._round_1_analysis(ctx)
        tick("analysis")
        asyncio.create_task(self._speak_bg("orchestrator", ctx.brief[:200]))

        # ── Round 2: ALL agents in PARALLEL (3-4× faster than sequential) ──
        self._log("round_start", "orchestrator", "💬 Agents aligning in parallel...", round=2, title="Discussion")
        await self._round_2_intentions(ctx)
        tick("discussion")

        # Voice + consensus matrix: both fire-and-forget
        for name, intention in ctx.agent_intentions.items():
            asyncio.create_task(self._speak_bg(name, intention[:200]))
        asyncio.create_task(self._compute_matrix_bg(ctx))

        # ── Round 3: Consensus (fast, 200 token budget) ────────────────────
        self._log("round_start", "orchestrator", "🤝 Building consensus plan...", round=3, title="Consensus")
        await self._round_3_consensus(ctx)
        tick("consensus")
        asyncio.create_task(self._speak_bg("orchestrator", ctx.consensus[:200]))

        # ── Round 4a: Archie — Architecture Blueprint ────────────────────
        self._log("round_start", "orchestrator", "📐 Archie designing architecture...", round=4, title="Architecture")
        await self._round_4a_architecture(ctx)
        tick("architecture")
        await self._speak("archie", f"Blueprint ready. Project {ctx.blueprint.get('project_name', 'app')} with {len(ctx.blueprint.get('api_routes', []))} API routes.")

        # ── Round 4b: Byron — Full Backend ───────────────────────────────
        self._log("round_start", "orchestrator", "⚙️ Byron building backend...", round=5, title="Backend")
        await self._round_4b_backend(ctx)
        tick("backend")
        await self._speak("byron", f"Backend done. {len(ctx.backend_files)} files generated.")

        # ── Round 4c: Faye — Full Frontend ───────────────────────────────
        self._log("round_start", "orchestrator", "🎨 Faye building frontend...", round=6, title="Frontend")
        await self._round_4c_frontend(ctx)
        tick("frontend")
        await self._speak("faye", f"Frontend complete. {len(ctx.frontend_files)} components built, connected to Byron's API.")

        # ── Round 5: Sentry — Security Review + Fix Loop ─────────────────
        self._log("round_start", "orchestrator", "🛡️ Sentry auditing codebase...", round=7, title="Security")
        tick("reached_security")  # key KPI — how fast did we get to audit?
        await self._round_5_security(ctx)
        tick("security")
        await self._speak("sentry", f"Security audit done. Score {ctx.security_score} out of 100. Found {len(ctx.security_issues)} issues.")

        # ── Round 6: Deployment Files ─────────────────────────────────────
        self._log("round_start", "orchestrator", "🐳 Generating deployment files...", round=8, title="Deployment")
        await self._round_6_deployment(ctx)

        # ── Round 7: Write Everything + ARCHITECTURE.md ───────────────────
        self._log("round_start", "orchestrator", "✍️ Writing project to disk...", round=9, title="Finalize")
        files_written = await self._round_7_finalize(ctx)

        # ── AI Analytics: Quality Scores (background, never blocks) ─────────
        asyncio.create_task(self._compute_quality_bg(ctx))

        tick("complete")
        self._log(
            "build_complete", "orchestrator",
            f"🎉 Build complete! {files_written} files written to {project_folder}",
            files_generated=files_written,
            project_path=project_folder,
            phase_times={k: round(v, 2) for k, v in phase_times.items()},
            total_s=round(time.monotonic() - t0, 2),
            time_to_security_s=round(phase_times.get("reached_security", 0), 2),
        )

        return
        yield  # async generator

    # ── Round implementations ────────────────────────────────────────────────

    async def _claude_requirements(self, ctx: BuildContext) -> bool:
        """
        Deep multi-phase requirements analysis via Claude Haiku.
        Rich technical brief → per-agent plans → consensus directive.
        Paced emissions so the UI shows real reasoning, not a flash.
        Returns True on success, False to fall back to rule-based.
        """
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            return False
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)

            # ─── Phase A: deep technical analysis ────────────────────────────
            self._log("feedback", "orchestrator", "Analyzing requirements with Claude…")
            analysis_msg = await client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1400,
                messages=[{
                    "role": "user",
                    "content": (
                        "You are the OctoForge planning brain. Output ONLY valid JSON "
                        "(no prose, no markdown fences). Perform a rigorous technical "
                        "requirements analysis for the project below.\n\n"
                        f"PROJECT: {ctx.user_prompt}\n\n"
                        "Return this exact schema:\n"
                        "{\n"
                        '  "app_type": "string (e.g. \'AI story generator\', \'task tracker\', \'RAG chatbot\')",\n'
                        '  "summary": "3-4 sentence technical brief: what it does, who uses it, success criteria",\n'
                        '  "core_features": ["feature 1", "feature 2", "feature 3", "feature 4"],\n'
                        '  "stack": {\n'
                        '    "backend": "fastapi | express | none",\n'
                        '    "frontend": "react | vue | none",\n'
                        '    "database": "sqlite | postgres | none",\n'
                        '    "rationale": "1-2 sentences justifying stack choices"\n'
                        '  },\n'
                        '  "external_apis": [\n'
                        '    {"name": "e.g. Gemini", "sdk": "google-generativeai", "env_var": "GEMINI_API_KEY", "purpose": "what it is used for"}\n'
                        '  ],\n'
                        '  "data_flows": ["user action → system response pair 1", "pair 2", "pair 3"],\n'
                        '  "risks": ["technical risk 1", "risk 2", "risk 3"]\n'
                        "}"
                    ),
                }],
            )
            raw = analysis_msg.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.strip("`")
                if raw.startswith("json"):
                    raw = raw[4:]
            analysis = json.loads(raw)

            # Emit rich brief to UI in staged chunks so user sees real thinking
            app_type = analysis.get("app_type", "application")
            summary = analysis.get("summary", ctx.user_prompt)
            features = analysis.get("core_features", [])
            stack = analysis.get("stack", {})
            apis = analysis.get("external_apis", [])
            risks = analysis.get("risks", [])
            flows = analysis.get("data_flows", [])

            self._log("briefing", "orchestrator", f"App type: {app_type}")
            await asyncio.sleep(0.35)
            self._log("briefing", "orchestrator", summary)
            await asyncio.sleep(0.35)
            if features:
                self._log("briefing", "orchestrator", "Core features: " + "; ".join(features[:4]))
                await asyncio.sleep(0.35)
            if stack:
                stack_line = f"Stack: {stack.get('backend','?')} + {stack.get('frontend','?')} + {stack.get('database','none')}"
                self._log("briefing", "orchestrator", stack_line)
                if stack.get("rationale"):
                    await asyncio.sleep(0.3)
                    self._log("briefing", "orchestrator", stack["rationale"])
                await asyncio.sleep(0.3)
            if apis:
                api_line = "External APIs: " + ", ".join(f"{a.get('name')} ({a.get('purpose','')})" for a in apis[:4])
                self._log("briefing", "orchestrator", api_line)
                await asyncio.sleep(0.35)
            if flows:
                self._log("briefing", "orchestrator", "Data flows: " + " | ".join(flows[:3]))
                await asyncio.sleep(0.35)
            if risks:
                self._log("briefing", "orchestrator", "Risks flagged: " + "; ".join(risks[:3]))
                await asyncio.sleep(0.35)

            # Build rich brief string for BuildContext (used by all agents downstream)
            brief_lines = [
                f"App: {app_type}",
                f"Summary: {summary}",
                "Features: " + ", ".join(features),
                f"Stack: {stack.get('backend','?')} + {stack.get('frontend','?')} + {stack.get('database','none')} — {stack.get('rationale','')}",
            ]
            if apis:
                brief_lines.append(
                    "External APIs: " + "; ".join(
                        f"{a.get('name')} [SDK={a.get('sdk')}, env={a.get('env_var')}, purpose={a.get('purpose')}]"
                        for a in apis
                    )
                )
            if flows:
                brief_lines.append("Data flows: " + " || ".join(flows))
            if risks:
                brief_lines.append("Risks: " + "; ".join(risks))
            ctx.brief = "\n".join(brief_lines)
            self._log("briefing_complete", "orchestrator", f"Brief complete for {app_type}")

            # ─── Phase B: per-agent plans + consensus ────────────────────────
            await asyncio.sleep(0.4)
            self._log("feedback", "orchestrator", "Assigning specialist plans…")
            plan_msg = await client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1200,
                messages=[{
                    "role": "user",
                    "content": (
                        "You are coordinating 4 specialist agents for the project below. "
                        "Output ONLY valid JSON (no prose, no fences).\n\n"
                        f"TECHNICAL BRIEF:\n{ctx.brief}\n\n"
                        "Generate detailed plans for each specialist. Each plan 2-3 sentences, "
                        "concrete enough for implementation.\n"
                        "Return:\n"
                        "{\n"
                        '  "archie_plan": "Detailed architecture: files, modules, route list with shapes, DB schema if any",\n'
                        '  "byron_plan": "Detailed backend implementation: endpoints, external API calls, error handling, env vars",\n'
                        '  "faye_plan": "Detailed frontend implementation: pages, components, state, API wiring, UX states",\n'
                        '  "sentry_plan": "Detailed security audit scope: specific vulnerability classes to check given the stack",\n'
                        '  "consensus": "Final build directive: 2-3 sentences aligning all agents on goal, non-negotiables, and integration points"\n'
                        "}"
                    ),
                }],
            )
            raw2 = plan_msg.content[0].text.strip()
            if raw2.startswith("```"):
                raw2 = raw2.strip("`")
                if raw2.startswith("json"):
                    raw2 = raw2[4:]
            plans = json.loads(raw2)

            ctx.consensus = plans.get("consensus", ctx.user_prompt)
            ctx.agent_intentions = {
                "Archie": plans.get("archie_plan", "Design architecture."),
                "Byron": plans.get("byron_plan", "Build backend."),
                "Faye": plans.get("faye_plan", "Build frontend."),
                "Sentry": plans.get("sentry_plan", "Audit security."),
            }

            # Stagger emission per agent so UI shows real handoff feel
            for agent in [self.archie, self.byron, self.faye, self.sentry]:
                plan = ctx.agent_intentions.get(agent.name, "Ready.")
                agent.emit_event("feedback", plan)
                await asyncio.sleep(0.5)

            await asyncio.sleep(0.3)
            self._log("consensus_ready", "orchestrator", ctx.consensus)
            return True
        except Exception as e:
            self._log("feedback", "orchestrator", f"Claude API unavailable ({e}), using instant planning.")
            return False

    async def _round_1_analysis(self, ctx: BuildContext):
        """Brief: from Claude if key set, else instant rule-based."""
        if not await self._claude_requirements(ctx):
            # Instant fallback — no LLM needed
            ctx.brief = ctx.user_prompt
            self._log("briefing_complete", "orchestrator", f"Project: {ctx.user_prompt[:120]}")

    async def _round_2_intentions(self, ctx: BuildContext):
        """Intentions already set by _claude_requirements if it ran. Else instant defaults."""
        if not ctx.agent_intentions:
            for agent, plan in [
                (self.archie, "Will design file structure, API routes, and dependency manifest."),
                (self.byron,  "Will implement all backend routes, models, and services."),
                (self.faye,   "Will build React frontend wired to Byron's API."),
                (self.sentry, "Will audit all generated code for vulnerabilities."),
            ]:
                ctx.agent_intentions[agent.name] = plan
                agent.emit_event("feedback", plan)

    async def _round_3_consensus(self, ctx: BuildContext):
        """Consensus already set by _claude_requirements if it ran. Else instant default."""
        if not ctx.consensus:
            ctx.consensus = ctx.user_prompt
        self._log("consensus_ready", "orchestrator", "Consensus reached. Starting build.")

    async def _round_4a_architecture(self, ctx: BuildContext):
        """Archie gets full context — brief + consensus + all agent intentions."""
        ctx.blueprint = await self.archie.generate_structure_with_context(ctx)
        # Update consensus with actual blueprint project name
        self._log("feedback", "archie",
            f"Blueprint: {ctx.blueprint.get('project_name','app')} — "
            f"{len(ctx.blueprint.get('file_structure',{}).get('backend',[]))} backend files, "
            f"{len(ctx.blueprint.get('file_structure',{}).get('frontend',[]))} frontend files")

    async def _round_4b_backend(self, ctx: BuildContext):
        """Byron gets full context including Archie's blueprint AND the consensus plan."""
        ctx.backend_files = await self.byron.generate_backend_with_context(ctx)

    async def _round_4c_frontend(self, ctx: BuildContext):
        """Faye gets EVERYTHING — blueprint + Byron's actual code + consensus."""
        ctx.frontend_files = await self.faye.generate_frontend_with_context(ctx)

    async def _round_5_security(self, ctx: BuildContext):
        """Sentry audits all code. If critical issues found, triggers a targeted fix pass."""
        ctx.all_files = {**ctx.backend_files, **ctx.frontend_files}
        issues, score = await self.sentry.review_with_context(ctx)
        ctx.security_issues = issues
        ctx.security_score = score

        # Fix loop: if critical/high issues, re-prompt the relevant agent
        critical = [i for i in issues if i.get("severity") in ("critical", "high")]
        if critical and len(critical) <= 5:
            self._log("feedback", "orchestrator",
                f"🔧 Requesting fixes for {len(critical)} critical/high issues...")
            await self._security_fix_pass(ctx, critical)

    async def _security_fix_pass(self, ctx: BuildContext, critical_issues: list):
        """Re-prompt Byron/Faye to fix specific security issues — one targeted pass."""
        backend_issues = [i for i in critical_issues if not i.get('file','').endswith(('.tsx','.ts','.jsx','.js'))]
        frontend_issues = [i for i in critical_issues if i.get('file','').endswith(('.tsx','.ts','.jsx','.js'))]

        if backend_issues:
            fix_prompt = "Fix ONLY these specific security issues (patch the affected files):\n"
            for issue in backend_issues:
                fix_prompt += f"  [{issue['severity'].upper()}] {issue['file']}: {issue['issue']} → {issue['fix']}\n"
            fixed = await self.byron.apply_security_fixes(ctx, fix_prompt)
            ctx.backend_files.update(fixed)
            ctx.all_files.update(fixed)

        if frontend_issues:
            fix_prompt = "Fix ONLY these specific security issues:\n"
            for issue in frontend_issues:
                fix_prompt += f"  [{issue['severity'].upper()}] {issue['file']}: {issue['issue']} → {issue['fix']}\n"
            fixed = await self.faye.apply_security_fixes(ctx, fix_prompt)
            ctx.frontend_files.update(fixed)
            ctx.all_files.update(fixed)

    async def _round_6_deployment(self, ctx: BuildContext):
        """Generate deployment-ready files: Dockerfile, docker-compose, nginx, README."""
        try:
            stack = ctx.blueprint.get("stack", {})
            project_name = ctx.blueprint.get("project_name", "app")
            deps_backend = ctx.blueprint.get("dependencies", {}).get("backend", {})
            routes = ctx.blueprint.get("api_routes", [])
            env_vars = list(self.byron._infer_env_vars(ctx.user_prompt, deps_backend).keys()) if hasattr(self.byron, '_infer_env_vars') else []

            # Dockerfile for backend
            ctx.deployment_files["Dockerfile"] = self._gen_dockerfile(stack, project_name)

            # docker-compose.yml
            ctx.deployment_files["docker-compose.yml"] = self._gen_docker_compose(project_name, stack, env_vars)

            # .gitignore
            ctx.deployment_files[".gitignore"] = self._gen_gitignore(stack)

            # Full README.md (replaces SETUP.md — more complete)
            ctx.deployment_files["README.md"] = self._gen_readme(
                project_name, ctx.user_prompt, stack, env_vars, routes,
                ctx.security_score, ctx.blueprint.get("dependencies", {})
            )

            # One-shot run script that Tauri "Run App" button executes
            ctx.deployment_files["run.sh"] = self._gen_run_script(stack, project_name)

            self._log("feedback", "orchestrator",
                f"✅ Deployment files ready: Dockerfile, docker-compose.yml, .gitignore, README.md, run.sh")

        except Exception as e:
            self._log("error", "orchestrator", f"Deployment gen failed: {e}")

    async def _round_7_finalize(self, ctx: BuildContext) -> int:
        """Write every file to disk, run graphify, write ARCHITECTURE.md."""
        os.makedirs(ctx.project_folder, exist_ok=True)

        ctx.all_files = {**ctx.backend_files, **ctx.frontend_files, **ctx.deployment_files}

        # Write all files
        written = 0
        for rel_path, content in ctx.all_files.items():
            if not content:
                continue
            full_path = os.path.join(ctx.project_folder, rel_path)
            os.makedirs(os.path.dirname(full_path) if os.path.dirname(full_path) else ctx.project_folder, exist_ok=True)
            try:
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
                written += 1
                self._log("file_written", "orchestrator", f"✓ {rel_path}")
            except Exception as e:
                self._log("error", "orchestrator", f"Failed to write {rel_path}: {e}")

        # Write ARCHITECTURE.md
        arch_md = self._gen_architecture_md(ctx)
        arch_path = os.path.join(ctx.project_folder, "ARCHITECTURE.md")
        with open(arch_path, "w") as f:
            f.write(arch_md)
        written += 1
        self._log("file_written", "orchestrator", "✓ ARCHITECTURE.md")

        # Make run.sh executable
        run_sh = os.path.join(ctx.project_folder, "run.sh")
        if os.path.exists(run_sh):
            try:
                os.chmod(run_sh, 0o755)
            except Exception:
                pass

        # Write rich Obsidian vault BEFORE graphify runs — graphify picks these up
        self._write_obsidian_vault(ctx)

        # Run Graphify (async, non-blocking)
        try:
            from generators.graphify_runner import GraphifyRunner
            asyncio.create_task(GraphifyRunner.run_graphify(ctx.project_folder, self._emit))
        except Exception:
            pass

        return written

    # ── Static file generators ────────────────────────────────────────────────

    def _gen_dockerfile(self, stack: dict, name: str) -> str:
        backend = stack.get("backend", "fastapi")
        if backend in ("fastapi", "flask", "django"):
            return f"""FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""
        elif backend in ("express", "node"):
            return f"""FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
"""
        return ""

    def _gen_docker_compose(self, name: str, stack: dict, env_vars: list) -> str:
        backend = stack.get("backend", "fastapi")
        db = stack.get("database", "none")

        env_section = '\n'.join(f"      - {v}=${{{{ {v} }}}}" for v in env_vars) if env_vars else "      - SECRET_KEY=${SECRET_KEY}"

        compose = f"""version: '3.9'

services:
  backend:
    build: .
    container_name: {name}-backend
    ports:
      - "8000:8000"
    environment:
{env_section}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
"""
        if db == "postgres":
            compose += f"""
  db:
    image: postgres:16-alpine
    container_name: {name}-db
    environment:
      POSTGRES_DB: {name.replace('-','_')}
      POSTGRES_USER: ${{DB_USER}}
      POSTGRES_PASSWORD: ${{DB_PASSWORD}}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
"""
        return compose

    def _gen_gitignore(self, stack: dict) -> str:
        return """.env
.env.local
__pycache__/
*.pyc
*.pyo
.venv/
venv/
node_modules/
dist/
build/
.DS_Store
*.log
uploads/
*.db
*.sqlite3
.brain/
"""

    def _write_obsidian_vault(self, ctx: BuildContext) -> None:
        """Populate .brain/ with rich markdown notes — auto-links so Obsidian graph is meaningful."""
        brain = os.path.join(ctx.project_folder, ".brain")
        os.makedirs(brain, exist_ok=True)
        for d in ("Architecture", "Agents", "API", "Components", "Database", "Security", "Files"):
            os.makedirs(os.path.join(brain, d), exist_ok=True)

        bp = ctx.blueprint or {}
        name = bp.get("project_name", "app")
        stack = bp.get("stack", {})
        routes = bp.get("api_routes", [])
        deps = bp.get("dependencies", {})

        def write(rel: str, content: str):
            path = os.path.join(brain, rel)
            os.makedirs(os.path.dirname(path) if os.path.dirname(path) else brain, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

        # Index — entry point with links
        write("00-Index.md", f"""# {name} — Project Brain

> {ctx.user_prompt}

**Open this folder as an Obsidian vault** (File → Open folder as vault) to navigate with graph view.
**Visualize the codebase**: open `graph.html` in a browser for the Graphify knowledge graph.

## Orientation

- [[Architecture/Overview]] — system design and tech stack
- [[Agents/Orchestrator]] — how the multi-agent build ran
- [[API/Routes]] — backend endpoints
- [[Components/Index]] — frontend components
- [[Database/Schema]] — data models
- [[Security/Audit]] — audit report + issues

## If you're coming back to modify this project

Paste this snippet into OctoForge prompt field to give agents context:

```
Before making changes, read the Obsidian vault at .brain/ to understand:
- Architecture/Overview (tech stack + why)
- API/Routes (existing endpoints — don't duplicate)
- Agents/Decisions (constraints chosen by Archie)
- Security/Audit (known issues already fixed)
Then: <your new feature request>
```

---

*Generated by OctoForge · {len(ctx.all_files)} files · security score {ctx.security_score}/100*
""")

        # Architecture
        stack_rows = "\n".join(f"- **{k}**: `{v}`" for k, v in stack.items()) or "- (none specified)"
        write("Architecture/Overview.md", f"""# Architecture — {name}

## Stack

{stack_rows}

## How it fits together

- Backend serves {len(routes)} API routes → see [[API/Routes]]
- Frontend consumes them → see [[Components/Index]]
- Data persisted in `{stack.get('database', 'none')}` → see [[Database/Schema]]
- Security audit → [[Security/Audit]]

## Decisions log

See [[Agents/Orchestrator]] for the round-by-round transcript of how Archie, Byron, Faye, and Sentry built this.
""")

        # Agents
        write("Agents/Orchestrator.md", f"""# Build Transcript

## User prompt

> {ctx.user_prompt}

## Consensus brief

{ctx.brief[:4000] if ctx.brief else '(empty)'}

## Agent intentions

{chr(10).join(f'### {n}{chr(10)}{v[:1500]}{chr(10)}' for n, v in (ctx.agent_intentions or {}).items())}

## Final consensus

{ctx.consensus[:4000] if ctx.consensus else '(empty)'}

## Cross-links

- [[Architecture/Overview]]
- [[API/Routes]]
- [[Security/Audit]]
""")

        write("Agents/Decisions.md", f"""# Architectural Decisions

Stack choices made during Round 4a (Archie):

{stack_rows}

### Why this stack?

(Archie's rationale from consensus round)

{ctx.consensus[:2000] if ctx.consensus else 'See [[Agents/Orchestrator]]'}
""")

        # API
        route_md = "\n".join(
            f"### `{r.get('method', 'GET')} {r.get('path', '/')}`\n\n{r.get('description', '')}\n"
            for r in routes
        ) or "(no API routes)"
        write("API/Routes.md", f"""# API Routes

{route_md}

Total: **{len(routes)}** endpoints.

See [[Architecture/Overview]] for stack context.
""")

        # Components — list frontend files
        comp_lines = "\n".join(f"- [[Files/{fn.replace('/', '__')}|{fn}]]" for fn in sorted(ctx.frontend_files.keys())) or "(none)"
        write("Components/Index.md", f"""# Frontend Components

{comp_lines}
""")

        # Database
        write("Database/Schema.md", f"""# Database

**Engine**: `{stack.get('database', 'none')}`

Schema lives in the backend models. See files under [[Files/models__py]] or similar.

Dependencies: {', '.join(list(deps.get('backend', {}).keys())[:8]) or '(none)'}
""")

        # Security
        issues_md = ""
        if ctx.security_issues:
            for issue in ctx.security_issues[:30]:
                sev = issue.get("severity", "low").upper()
                issues_md += f"- **[{sev}]** `{issue.get('file', '?')}` — {issue.get('issue', '')} → *{issue.get('fix', '')}*\n"
        else:
            issues_md = "(no issues)"
        write("Security/Audit.md", f"""# Security Audit

**Score**: {ctx.security_score}/100

## Issues

{issues_md}

## Context

Audit performed by the Sentry agent after Byron+Faye finished coding. Fixes applied inline when severity ≥ medium.
""")

        # Per-file stubs — Obsidian links resolve to these
        for fpath in list(ctx.all_files.keys())[:80]:
            slug = fpath.replace("/", "__")
            content = ctx.all_files.get(fpath, "")[:2000]
            write(f"Files/{slug}.md", f"""# `{fpath}`

```
{content}
```

Back to [[00-Index]]
""")

    def _gen_run_script(self, stack: dict, name: str) -> str:
        backend = stack.get("backend", "fastapi")
        py_backend = backend in ("fastapi", "flask", "django")
        node_backend = backend in ("express", "node")

        backend_install = ""
        backend_start = ""
        if py_backend:
            backend_install = (
                'echo "📦 Installing Python deps..."\n'
                'if [ ! -d "venv" ]; then python3 -m venv venv; fi\n'
                'source venv/bin/activate\n'
                'pip install -q --disable-pip-version-check -r requirements.txt 2>/dev/null || true\n'
            )
            backend_start = (
                'echo "🚀 Starting backend on :8000..."\n'
                'uvicorn main:app --reload --port 8000 &\n'
                'BACKEND_PID=$!\n'
            )
        elif node_backend:
            backend_install = (
                'echo "📦 Installing backend deps..."\n'
                'npm install --silent 2>/dev/null || true\n'
            )
            backend_start = (
                'echo "🚀 Starting backend on :3000..."\n'
                'node server.js &\n'
                'BACKEND_PID=$!\n'
            )

        frontend_install = (
            'if [ -d "frontend" ]; then\n'
            '  cd frontend\n'
            '  echo "📦 Installing frontend deps..."\n'
            '  npm install --silent 2>/dev/null || true\n'
            '  cd ..\n'
            'elif [ -f "package.json" ] && [ ! -f "requirements.txt" ]; then\n'
            '  echo "📦 Installing frontend deps..."\n'
            '  npm install --silent 2>/dev/null || true\n'
            'fi\n'
        )
        frontend_start = (
            'if [ -d "frontend" ]; then\n'
            '  echo "🎨 Starting frontend on :5173..."\n'
            '  (cd frontend && npm run dev) &\n'
            '  FRONTEND_PID=$!\n'
            'elif [ -f "package.json" ] && grep -q "\\"dev\\"" package.json 2>/dev/null; then\n'
            '  echo "🎨 Starting frontend on :5173..."\n'
            '  npm run dev &\n'
            '  FRONTEND_PID=$!\n'
            'fi\n'
        )

        return f"""#!/usr/bin/env bash
# {name} — auto-generated launcher (OctoForge)
set -e
cd "$(dirname "$0")"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  {name.upper()[:38]:<38}║"
echo "║  Launching via OctoForge run.sh        ║"
echo "╚════════════════════════════════════════╝"
echo ""

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚙️  Created .env from .env.example — edit to add API keys."
fi

{backend_install}{frontend_install}
echo ""
{backend_start}{frontend_start}
echo ""
echo "✅ Running. Press Ctrl+C to stop all servers."
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
"""

    def _gen_readme(self, name: str, prompt: str, stack: dict, env_vars: list,
                    routes: list, security_score: int, deps: dict) -> str:
        backend_deps = deps.get("backend", {})
        frontend_deps = deps.get("frontend", {})
        backend = stack.get("backend", "fastapi")
        db = stack.get("database", "none")

        env_lines = '\n'.join(f"{v}=your_{v.lower()}_here" for v in env_vars)
        route_lines = '\n'.join(f"| `{r.get('method')}` | `{r.get('path')}` | {r.get('description')} |" for r in routes)
        backend_dep_lines = '\n'.join(f"- `{k}=={v}`" for k, v in list(backend_deps.items())[:8])
        frontend_dep_lines = '\n'.join(f"- `{k}@{v}`" for k, v in list(frontend_deps.items())[:6])

        return f"""# {name.replace('-', ' ').title()}

> {prompt}

*Built by [OctoForge](https://github.com/octoforge) — multi-agent AI code workshop*

## Quick Start

### One-shot launcher (easiest)

```bash
./run.sh
```

This installs dependencies, starts backend and frontend, and prints all URLs.
The OctoForge "Run App" button runs this script for you.

---

### Prerequisites
- Python 3.11+ (backend)
- Node.js 18+ (frontend)
- [Docker](https://docker.com) (optional, for containerized run)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd {name}
cp .env.example .env
# Edit .env and fill in your API keys
```

### 2. Environment Variables

Create a `.env` file:

```env
{env_lines}
```

### 3. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend  # or project root if no subfolder
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

### 5. Docker (Production)

```bash
# Build and run everything
docker-compose up --build

# Or backend only
docker build -t {name}-backend .
docker run -p 8000:8000 --env-file .env {name}-backend
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
{route_lines}

## Tech Stack

**Backend:** {backend}
{backend_dep_lines}

**Frontend:** React + TypeScript + Tailwind CSS
{frontend_dep_lines}

**Database:** {db}

## Security

Security audit score: **{security_score}/100** *(generated by Sentry agent)*

See `ARCHITECTURE.md` for system design details.

---

*Generated by OctoForge — {len(routes)} API routes, {security_score}/100 security score*
"""

    def _gen_architecture_md(self, ctx: BuildContext) -> str:
        blueprint = ctx.blueprint
        routes = blueprint.get("api_routes", [])
        stack = blueprint.get("stack", {})

        files_by_layer = {
            "Backend": list(ctx.backend_files.keys()),
            "Frontend": list(ctx.frontend_files.keys()),
            "Deployment": list(ctx.deployment_files.keys()),
        }

        security_summary = ""
        if ctx.security_issues:
            by_severity = {}
            for issue in ctx.security_issues:
                sev = issue.get("severity", "low")
                by_severity.setdefault(sev, []).append(issue)
            lines = []
            for sev in ("critical", "high", "medium", "low"):
                if sev in by_severity:
                    lines.append(f"- **{sev.upper()}** ({len(by_severity[sev])}): " +
                        ", ".join(i.get("file","?") for i in by_severity[sev][:3]))
            security_summary = "### Issues Found\n" + '\n'.join(lines)
        else:
            security_summary = f"No issues found. Score: {ctx.security_score}/100"

        file_tree = ""
        for layer, files in files_by_layer.items():
            if files:
                file_tree += f"\n**{layer}:**\n" + '\n'.join(f"  - `{f}`" for f in sorted(files)[:15])

        route_table = '\n'.join(
            f"| `{r.get('method')}` | `{r.get('path')}` | {r.get('description')} |"
            for r in routes
        )

        agent_notes = '\n'.join(
            f"**{name}:** {intention[:200]}"
            for name, intention in ctx.agent_intentions.items()
        )

        return f"""# Architecture — {blueprint.get('project_name', 'App')}

## What Was Built

{ctx.user_prompt}

## System Design

**Stack:**
- Backend: `{stack.get('backend','?')}` on port 8000
- Frontend: React + TypeScript + Tailwind on port 5173
- Database: `{stack.get('database','none')}`

## Data Flow

```
User → React Frontend (5173)
          ↕ fetch() / FormData
     FastAPI Backend (8000)
          ↕ SDK calls
     External Services (Gemini / ElevenLabs / etc.)
          ↕
     Database / File Storage
```

## API Contract

| Method | Endpoint | Description |
|--------|----------|-------------|
{route_table}

## File Structure
{file_tree}

## Agent Contributions

{agent_notes}

## Security Audit (Sentry)

Score: **{ctx.security_score}/100**

{security_summary}

## Orchestrator Consensus

{ctx.consensus}

---
*Generated by OctoForge — {sum(len(v) for v in [ctx.backend_files, ctx.frontend_files, ctx.deployment_files])} total files*
"""
