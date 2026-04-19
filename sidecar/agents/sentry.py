import json
import re
from .base import BaseAgent, AgentRole


class Sentry(BaseAgent):
    SYSTEM_PROMPT = """You are Sentry, a security engineer specializing in code vulnerability analysis.

Review code for these issues (check ALL of them):
- API keys hardcoded in source (should be env vars) → CRITICAL
- Missing API key validation (no check if key is None/empty) → HIGH
- SQL injection (use parameterized queries) → CRITICAL
- XSS vulnerabilities (sanitize user input) → HIGH
- CORS set to allow all origins (*) without restriction → MEDIUM
- Missing rate limiting on AI/LLM endpoints (cost attack vector) → HIGH
- File upload without MIME type validation → HIGH
- Missing input length limits (prompt injection, cost abuse) → MEDIUM
- Exposed stack traces in error responses → MEDIUM
- Missing HTTPS enforcement in production → MEDIUM
- Unused or overly permissive dependencies → LOW
- Missing request timeout on external API calls → MEDIUM

Output ONLY valid JSON:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "file": "path/to/file.py",
      "issue": "Description of vulnerability",
      "fix": "Exact code fix or approach"
    }
  ],
  "security_score": 0-100,
  "summary": "One sentence overall assessment"
}

If no issues found, return: {"issues": [], "security_score": 95, "summary": "Code is secure."}"""

    def __init__(self, emit_callback=None):
        super().__init__(
            name="Sentry",
            role=AgentRole.SECURITY,
            model="qwen2.5-coder:7b",
            color="#ff6b6b",
            system_prompt=self.SYSTEM_PROMPT,
            emit_callback=emit_callback,
        )

    async def review_with_context(self, ctx) -> tuple:
        """Review ALL generated code with full BuildContext awareness. Returns (issues, score)."""
        self.emit_event("agent_state", "Scanning for vulnerabilities with full system context...", extra={"state": "working"})

        handoff = ctx.handoff_for(self.name)

        # Prioritize backend, then frontend
        all_files = {**ctx.backend_files, **ctx.frontend_files}
        priority = [k for k in all_files if k.endswith('.py') and 'test' not in k]
        rest = [k for k in all_files if k not in priority and not k.endswith('.example')]
        ordered = (priority + rest)[:12]
        sampled = {k: all_files[k] for k in ordered}
        files_text = "\n\n".join(
            f"=== {path} ===\n{content[:1500]}" for path, content in sampled.items()
        )

        prompt = f"""{handoff}

=== YOUR TASK ===
As Sentry (Security Engineer), review ALL generated code for vulnerabilities.

Files to review:
{files_text}

Project uses these services: {ctx.user_prompt[:200]}

Return ONLY valid JSON:
{{
  "issues": [
    {{
      "severity": "critical|high|medium|low",
      "file": "path/to/file.py",
      "issue": "Description of vulnerability",
      "fix": "Exact code fix or approach"
    }}
  ],
  "security_score": 0-100,
  "summary": "One sentence overall assessment"
}}"""

        response = await self.call_ollama(prompt, max_tokens=3500)
        result = self._extract_json(response)
        issues = result.get("issues", [])
        score = result.get("security_score", 80)

        critical = [i for i in issues if i.get("severity") == "critical"]
        high = [i for i in issues if i.get("severity") == "high"]
        summary = result.get("summary", "")

        if critical:
            self.emit_event("agent_state", f"⚠️ {len(critical)} critical issues found", extra={"state": "error"})
            self.emit_event("feedback", f"Security score: {score}/100 — {len(critical)} critical, {len(high)} high. {summary}")
        else:
            self.emit_event("agent_state", f"✅ Security score: {score}/100", extra={"state": "celebrating"})
            self.emit_event("feedback", f"Security score: {score}/100 — {len(issues)} issues. {summary}")

        for issue in issues[:5]:
            sev = issue.get("severity", "low").upper()
            self.emit_event("security_review", f"[{sev}] {issue.get('file', '?')}: {issue.get('issue', '')}")

        return issues, score

    async def review(self, all_files: dict) -> list:
        self.emit_event("agent_state", "Scanning for vulnerabilities...", extra={"state": "working"})

        # Sample files — prioritise backend code over config/generated files
        priority = [k for k in all_files if k.endswith('.py') and 'test' not in k]
        rest = [k for k in all_files if k not in priority and not k.endswith('.example')]
        ordered = (priority + rest)[:10]
        sampled = {k: all_files[k] for k in ordered}
        files_text = "\n\n".join(
            f"=== {path} ===\n{content[:1500]}" for path, content in sampled.items()
        )

        prompt = f"""Review these generated files for security issues:

{files_text}

Return JSON only."""

        response = await self.call_ollama(prompt, max_tokens=3500)
        result = self._extract_json(response)
        issues = result.get("issues", [])
        score = result.get("security_score", 80)

        critical = [i for i in issues if i.get("severity") == "critical"]
        high = [i for i in issues if i.get("severity") == "high"]
        summary = result.get("summary", "")

        if critical:
            self.emit_event("agent_state", f"⚠️ {len(critical)} critical issues found", extra={"state": "error"})
            self.emit_event("feedback", f"Security score: {score}/100 — {len(critical)} critical, {len(high)} high. {summary}")
        else:
            self.emit_event("agent_state", f"✅ Security score: {score}/100", extra={"state": "celebrating"})
            self.emit_event("feedback", f"Security score: {score}/100 — {len(issues)} issues. {summary}")

        # Log individual issues
        for issue in issues[:5]:  # show top 5 in log
            sev = issue.get("severity", "low").upper()
            self.emit_event("security_review", f"[{sev}] {issue.get('file', '?')}: {issue.get('issue', '')}")

        return issues

    def _extract_json(self, text: str) -> dict:
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {"issues": [], "security_score": 80}
