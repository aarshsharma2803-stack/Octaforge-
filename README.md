# 🐙 OctoForge — Deep Sea AI Code Workshop

> Multi-agent AI that builds full-stack apps. Local-first via Ollama. Watch your agents dive, discuss, code, and ship — all visualized as a deep-sea expedition.

![Status](https://img.shields.io/badge/status-hackathon--demo-orange) ![Stack](https://img.shields.io/badge/stack-Tauri_%2B_React_%2B_FastAPI-teal) ![Models](https://img.shields.io/badge/models-qwen2.5--coder_%7C_phi4--mini-indigo)

---

## What it does

You type a plaintext prompt like *"A markdown note-taking app with local search"* and hit **Launch Dive**. Four AI agents (Archie — Planner, Byron — Backend, Faye — Frontend, Sentry — Security) run through a 9-round protocol:

1. **Analysis** — Archie breaks the prompt into a technical brief
2. **Discussion** — all agents align in parallel
3. **Consensus** — directive locked in
4. **Architecture** — Archie emits a blueprint (stack, routes, schema)
5. **Backend** — Byron writes FastAPI + models + auth
6. **Frontend** — Faye writes React + Tailwind + components wired to Byron's routes
7. **Security** — Sentry audits, fixes high-severity issues in place
8. **Deployment** — Dockerfile, docker-compose, `run.sh`, `README.md`
9. **Finalize** — everything written to disk + Obsidian vault + knowledge graph

Output: a complete runnable project folder. Click **Run App** in the UI to launch it in Terminal. Click **Open Brain in Obsidian** to explore the reasoning vault.

---

## Quick start

### Prerequisites

- macOS (tested on Apple Silicon)
- [Ollama](https://ollama.ai) running locally
- Node.js 18+, Python 3.11+, Rust toolchain, [uv](https://github.com/astral-sh/uv)

### Install models (one-time)

```bash
ollama pull qwen2.5-coder:7b
ollama pull phi4-mini
ollama pull nomic-embed-text  # for AI/ML analytics
```

### Install deps

```bash
npm install
cd sidecar && uv sync && cd ..
```

### Run the app

```bash
npm run tauri dev
```

Tauri launches the app, which auto-spawns the FastAPI sidecar on `:8765`. First build primes the models (~5s warm-up hidden behind prompt typing).

### Optional: ElevenLabs voices

```bash
echo "ELEVENLABS_API_KEY=sk_..." > sidecar/.env
```

Without a key, agents still emit dialogue as subtitles.

---

## What you'll see

- **Deep sea stage**: animated reef — fish shoals, jellyfish, kelp, coral, god-rays, bubbles
- **Agents**: four squid-shaped minions arranged around a central orchestrator squid
- **Live code terminals**: click any agent while they're working → their token stream opens in a corner panel
- **Build timeline**: right panel shows phase progress
- **AI/ML HUD**: header badge shows embedding-based consensus % and code-quality score, computed live via `nomic-embed-text`
- **Timing HUD**: header shows elapsed build time and prompt→security latency
- **Voice subtitles**: agents speak during rounds (ElevenLabs TTS if configured)

---

## Architecture at a glance

```
┌──────────────────────────────────────────────────┐
│  Tauri desktop app (React + Tailwind + Motion)  │
│  ──────────────────────────────────────────────  │
│  EventSource stream ← SSE ← Python sidecar :8765 │
└──────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────┐
│  FastAPI sidecar (orchestrator.py)               │
│    • Archie   → qwen2.5-coder:7b (planning)     │
│    • Byron    → qwen2.5-coder:7b (backend)       │
│    • Faye     → qwen2.5-coder:7b (frontend)     │
│    • Sentry   → qwen2.5-coder:7b (security)      │
│    • Orch     → phi4-mini (dispatcher + voice)   │
│  Embeddings: nomic-embed-text                    │
│  Voice:      ElevenLabs turbo v2.5 (optional)    │
└──────────────────────────────────────────────────┘
                        ↓
              Ollama runtime on :11434
```

For deeper detail see [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md).

---

## Generated project layout

```
YourApp/
├── run.sh              ← one-shot launcher (chmod +x, runs installers + dev servers)
├── README.md           ← quickstart + API reference + stack
├── ARCHITECTURE.md     ← system design doc
├── Dockerfile          ← production image
├── docker-compose.yml  ← full stack compose
├── .gitignore
├── .env.example
├── requirements.txt    ← backend deps
├── package.json        ← frontend deps
├── main.py             ← FastAPI app
├── routes/             ← API endpoints
├── models.py           ← SQLAlchemy models
├── src/                ← React components
└── .brain/             ← Obsidian vault
    ├── 00-Index.md
    ├── Agents/         ← full transcript
    ├── Architecture/   ← decisions + rationale
    ├── API/            ← route catalog
    ├── Components/     ← frontend index
    ├── Database/       ← schema notes
    ├── Security/       ← Sentry's audit
    ├── Files/          ← per-file stubs (Obsidian-linked)
    └── graph.html      ← Graphify knowledge graph
```

Open `.brain/` as an Obsidian vault (File → Open folder as vault) for full navigability.

---

## Re-opening a project later

If you Launch Dive into a folder that already has a `.brain/` vault, OctoForge shows an **"Existing project detected"** banner with a one-click button to prepend this to your prompt:

> *"Before making changes, read the Obsidian vault at .brain/ to understand the existing architecture, API routes, and security audit. Then: <your new feature>"*

Agents then read the vault first and avoid clobbering prior decisions.

---

## Performance knobs

Set in `sidecar/agents/base.py`:

```python
"num_ctx": 4096        # halved vs default for ~2× throughput
"num_batch": 1024      # large batch for prompt eval
"num_thread": 8        # M-series perf cores
"top_k": 10            # tighter sampling
"keep_alive": -1       # keep models resident until sidecar exits
```

Parallel agent round (Discussion) cuts a typical 4-step chain to 1 wall-clock step.

---

## Tech stack

**Frontend**: Tauri 2, React 18, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide icons
**Backend**: Python 3.11, FastAPI, httpx, uvicorn
**Models**: Ollama (qwen2.5-coder:7b, phi4-mini, nomic-embed-text), optional Claude Haiku via Anthropic SDK
**Voice**: ElevenLabs Turbo v2.5
**Knowledge graph**: Graphify
**Vault**: Obsidian-compatible markdown

---

## License

MIT — hack away.
