# How OctoForge Works

Deep-dive into the internals. Read the [README](./README.md) first for the user-facing overview.

---

## 1. Process Topology

Three processes cooperate at runtime:

| Process | Language | Port | Role |
|---|---|---|---|
| Tauri shell | Rust | — | Desktop window, filesystem access, spawns sidecar |
| Sidecar | Python 3.10+ / FastAPI | 8765 | Orchestrator, agent loop, SSE stream, file writer |
| Ollama | Go | 11434 | Local model runtime (`gemma4:e4b`, `qwen3.5:latest`) |

Tauri spawns the sidecar at app start. The React webview talks to the sidecar over HTTP + SSE — never directly to Ollama.

```
React (webview)  ──fetch/SSE──►  FastAPI sidecar  ──HTTP──►  Ollama
                                        │
                                        │  ──HTTP──►  Claude API (Round 0 only)
                                        │
                                        └── writes files to output folder
```

The frontend uses `fetch` + `ReadableStream` (not `EventSource`) to consume SSE. This prevents browser auto-reconnect, which would trigger a second build when the server closes the stream.

---

## 2. The 8-Round Protocol (`sidecar/orchestrator.py`)

Each build is a linear state machine. Artifacts carry forward between rounds.

| # | Round | Driver | What happens |
|---|---|---|---|
| 0 | Requirements | Claude API (Haiku) | Enriches user prompt, returns structured brief, app type, key features, complexity |
| 1 | Briefing | Orchestrator (Ollama) | Creates 3-sentence technical brief from enriched prompt |
| 2 | Debate | All 4 agents in **parallel** | Each responds to brief in character — opinions, concerns, pushback |
| 3 | Consensus | Orchestrator (deterministic) | Merges feedback into directive (no LLM call — saves ~8s) |
| 4 | Build | Archie → Byron → Faye | Structure → Backend files → Frontend files (sequential, each depends on prior) |
| 5 | Security | Sentry | Scans generated files for vulnerabilities, emits issues |
| 6 | Testing | Orchestrator (deterministic) | Counts files + lines, emits stats |
| 7 | Finalize | Orchestrator | Writes all files to disk, generates SETUP.md, runs Graphify |
| — | Insights | Orchestrator (Ollama) | Sportscaster-style recap — fires before `build_complete` |

Round 2 is the only parallel step (`asyncio.gather` over 4 agents). Everything else is sequential because later rounds read earlier artifacts. Round 2 parallelism collapses what would be ~32s of serial Ollama calls into ~8s.

---

## 3. Agents (`sidecar/agents/`)

Each specialist agent is a `BaseAgent` subclass:

| Agent | Model | Personality |
|---|---|---|
| Archie | `qwen3.5:latest` | Obsessive planner. Generates project structure JSON. |
| Byron | `qwen3.5:latest` | Pragmatic backend engineer. Generates FastAPI + models code. |
| Faye | `qwen3.5:latest` | Passionate UX designer. Generates React + Tailwind frontend. |
| Sentry | `gemma4:e4b` | Paranoid security guardian. Reviews all files for vulnerabilities. |
| Orchestrator | `gemma4:e4b` | Mediator + narrator. Runs all protocol rounds. |

### RequirementsAnalyzer (`sidecar/agents/requirements_analyzer.py`)

Round 0 uses the Claude API (`claude-3-5-haiku`) for fast, smart requirement parsing:
- Reads `ANTHROPIC_API_KEY` from `.env` via `python-dotenv`
- Returns: `refined_prompt`, `app_type`, `key_features`, `complexity`, `brief`
- Graceful fallback if key missing or API unavailable — build continues with Ollama only

### Personality in Debate (Round 2)

`respond_to_brief` is overridden in each agent using `DEBATE_PERSONALITY` — a character description that shapes how the LLM responds. Agents are prompted to:
- Say one thing they agree with
- Push back on one concern
- State what they'll specifically build

This produces natural, opinionated responses instead of generic lists.

---

## 4. SSE Event Catalog (`/build/stream`)

Every event: `{ event, agent, message, ...extras }`.

| `event` | Meaning | Frontend effect |
|---|---|---|
| `round_start` | Protocol phase boundary | Timeline step, all agents → working |
| `thinking` | Agent calling Ollama | Agent state → working (no thought bubble update) |
| `feedback` | Real LLM output from agent | Thought bubble + debate feed populated |
| `requirements_ready` | Claude API analysis done | Log entry |
| `briefing_complete` | Round 1 done | Orchestrator thought bubble |
| `consensus_ready` | Round 3 done | Log entry |
| `structure_ready` | Archie done | Archie → celebrating |
| `backend_ready` | Byron done | Byron → celebrating |
| `frontend_ready` | Faye done | Faye → celebrating |
| `security_review` | Sentry scanning | Sentry → working, drama +10 |
| `security_issues` | Vulnerabilities found | Sentry → error, Byron → confused, drama +20 |
| `test_result` | Line/file stats | Stats updated |
| `file_written` | One file on disk | File counter++ |
| `code_snippet` | First 25 lines of a file | Code editor panel |
| `insights` | Sportscaster recap | Debate feed 🐙 Orchestrator bubble |
| `build_complete` | All done | All agents → celebrating, drama -30 |
| `error` | Fault | Agent → error, error overlay |

SSE delivery: `main.py::build_stream` wraps `Orchestrator.run()` with an `asyncio.Queue`. The orchestrator's emit callback is `queue.put_nowait`. A reader coroutine pumps the queue into `yield f"data: …\n\n"`. A `None` sentinel closes the stream.

---

## 5. Frontend Architecture

### State (`src/stores/buildStore.ts`)

Single Zustand store. Key state:

```typescript
agentStates        // idle | walking | working | celebrating | error | confused
agentThoughts      // latest thought per agent
debateMessages     // chat-style debate feed entries
dramaScore         // 0-100, gamification meter
episodeNumber      // increments per build (never resets)
logs[]             // full event log
streamingCode      // live code content
filesGenerated, linesGenerated, issuesFound  // build stats
```

### SSE consumption (`src/App.tsx`)

Uses `fetch` + `ReadableStream` with `AbortController` — not `EventSource`. On new build: aborts previous stream, creates new controller. On stream end: sets `isBuilding = false`, agents → idle. No auto-reconnect possible.

```typescript
const { done, value } = await reader.read();
buf += decoder.decode(value, { stream: true });
// split on '\n', parse 'data: {...}' lines
```

### Key Components

| Component | Purpose |
|---|---|
| `SplineCanvas.tsx` | 4 corner agent panels + center orchestrator using Spline 3D web component |
| `AgentDebateFeed.tsx` | Scrolling chat-style debate with Poke buttons per agent |
| `GameHUD.tsx` | Episode counter, drama meter, agent XP bars, live stats |
| `BuildTimeline.tsx` | Phase progress + action buttons (Open VS Code, Run App, Open Brain) |
| `CodeEditor.tsx` | Streaming code display — updates per `code_snippet` event |
| `ThoughtBubbles.tsx` | 4-agent thought bubble bar (latest `feedback` message) |
| `LogConsole.tsx` | Full SSE event log |
| `ControlPanel.tsx` | Prompt input, folder picker, Build button |
| `Header.tsx` | App header with Ollama health indicator |

---

## 6. Gamification Layer

### AgentDebateFeed

- Populated by `feedback` events (real LLM output only, not "Calling model..." noise)
- Messages classified as `clash` / `agree` / `neutral` by keyword matching
- Byron's messages right-aligned (visual "opposing side" effect)
- **Poke buttons** — click any agent → random pre-scripted in-character quote → appears as `poke` type bubble
- 🐙 Orchestrator insights appear after build complete

### GameHUD

- **Episode counter** — increments per build, never resets across sessions
- **Drama score** — peaks on security issues (+20), errors (+15), drops on build complete (-30)
- **Agent XP bars** — derived from event count per agent in logs
- **Consensus %** — approximated from `phaseIndex / 4`

---

## 7. File Output

`_round_7_finalize` in `orchestrator.py`:
1. Writes all backend + frontend files to chosen output folder
2. Generates `SETUP.md` via `generators/setup_guide.py`
3. Kicks off `GraphifyRunner` (non-blocking `asyncio.create_task`)

Then `_generate_insights` runs — calls Ollama for a 220-token sportscaster recap. This fires **before** `build_complete` is emitted so the SSE stream is still open when it arrives.

---

## 8. Performance Notes

| Optimization | Impact |
|---|---|
| Parallel Round 2 (`asyncio.gather`) | ~4x speedup on debate phase |
| Round 3 consensus — no LLM call | Saves ~8s |
| `respond_to_brief` capped at 180 tokens | Faster agent responses |
| Byron/Faye capped at 5000 tokens | Down from 8192, still enough for full files |
| Claude Haiku for Round 0 | Fast + smart requirement parsing (~1-2s) |
| Ollama `keep_alive` default | Models stay resident between requests |

Typical wall-clock on M-series:
- Round 0 (Claude API): ~1s
- Round 1 (briefing): ~3s
- Round 2 (parallel debate): ~8s
- Round 4 (build): ~60-90s (depends on project size)
- Total: **~75-100s** for a complete full-stack project

---

## 9. Tauri IPC Commands (`src-tauri/src/lib.rs`)

| Command | Purpose |
|---|---|
| `open_path(path)` | Opens path via system default (VS Code, Finder, etc.) via `plugin:opener` |

The frontend uses `@tauri-apps/plugin-opener` for all file/folder opening actions.

---

## 10. Where to Look When Something Breaks

| Symptom | First file |
|---|---|
| Build hangs after starting | `sidecar/orchestrator.py` — last `round_start` event tells you the stuck round |
| No Ollama responses | `sidecar/agents/base.py::call_ollama` — check Ollama running on `:11434` |
| Claude API fails silently | `sidecar/agents/requirements_analyzer.py` — check `.env` has `ANTHROPIC_API_KEY` |
| Debate feed empty | `src/App.tsx` — `feedback` event handler, check `addDebateMessage` called |
| Build triggers twice | Check `abortRef` in `App.tsx` — should abort previous stream on new build |
| 3D models not loading | `src/components/SplineCanvas.tsx` + check CDN script in `index.html` |
| Files not written to disk | `sidecar/orchestrator.py::_round_7_finalize` — check folder permissions |
| Insights never appear | Insights fire before `build_complete`; if Ollama times out, check fallback text |
