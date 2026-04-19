"""
Embedding service using Ollama's /api/embeddings endpoint.
Provides: cosine similarity between agent outputs, code quality scoring.
"""

import math
import httpx
from typing import Optional

OLLAMA_BASE = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"  # lightweight, fast, good quality


async def get_embedding(text: str, model: str = EMBED_MODEL) -> Optional[list[float]]:
    """Get embedding vector from Ollama."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{OLLAMA_BASE}/api/embeddings",
                json={"model": model, "prompt": text[:2000]},
            )
            resp.raise_for_status()
            return resp.json().get("embedding")
    except Exception:
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


async def compute_consensus_matrix(agent_intentions: dict[str, str]) -> dict:
    """
    Compute pairwise cosine similarity between all agent intention statements.
    Returns a matrix showing how aligned agents are with each other.
    """
    names = list(agent_intentions.keys())
    embeddings = {}

    for name, text in agent_intentions.items():
        emb = await get_embedding(text)
        if emb:
            embeddings[name] = emb

    if len(embeddings) < 2:
        return {"agents": names, "matrix": [], "avg_alignment": 0}

    matrix = []
    total_sim = 0
    pair_count = 0

    for i, name_a in enumerate(names):
        row = []
        for j, name_b in enumerate(names):
            if name_a not in embeddings or name_b not in embeddings:
                row.append(0.0)
            elif i == j:
                row.append(1.0)
            else:
                sim = cosine_similarity(embeddings[name_a], embeddings[name_b])
                sim = round(sim, 3)
                row.append(sim)
                if i < j:
                    total_sim += sim
                    pair_count += 1
        matrix.append(row)

    avg = round(total_sim / pair_count, 3) if pair_count > 0 else 0

    return {
        "agents": names,
        "matrix": matrix,
        "avg_alignment": avg,
    }


# Reference patterns for quality scoring — embeddings of "good code" descriptions
QUALITY_REFERENCE_PROMPTS = {
    "structure": "Well-organized code with clear separation of concerns, modular functions, proper imports, and logical file structure.",
    "security": "Secure code with input validation, parameterized queries, environment variables for secrets, proper error handling, and rate limiting.",
    "readability": "Clean readable code with descriptive variable names, consistent formatting, helpful comments for complex logic, and type hints.",
    "completeness": "Complete implementation with all required features, error handling, edge cases covered, and proper API responses.",
}


async def compute_quality_scores(files: dict[str, str]) -> dict:
    """
    Score generated code quality by comparing embeddings against reference patterns.
    Returns per-file and aggregate scores.
    """
    if not files:
        return {"files": {}, "overall": 0, "dimensions": {}}

    # Get reference embeddings
    ref_embeddings = {}
    for dim, prompt in QUALITY_REFERENCE_PROMPTS.items():
        emb = await get_embedding(prompt)
        if emb:
            ref_embeddings[dim] = emb

    if not ref_embeddings:
        return {"files": {}, "overall": 0, "dimensions": {}}

    # Score each file
    file_scores = {}
    dim_totals = {dim: 0.0 for dim in ref_embeddings}
    scored_count = 0

    # Sample top files (skip config/generated)
    scorable = {k: v for k, v in files.items()
                if v and len(v) > 50
                and not k.endswith(('.example', '.md', '.txt', '.gitignore'))
                and not k.startswith('.')
                }

    for path, content in list(scorable.items())[:10]:
        file_emb = await get_embedding(content)
        if not file_emb:
            continue

        scores = {}
        for dim, ref_emb in ref_embeddings.items():
            sim = cosine_similarity(file_emb, ref_emb)
            # Normalize to 0-100 scale (cosine sim for text is typically 0.3-0.9)
            normalized = max(0, min(100, int((sim - 0.3) / 0.6 * 100)))
            scores[dim] = normalized
            dim_totals[dim] += normalized

        file_scores[path] = {
            "dimensions": scores,
            "overall": round(sum(scores.values()) / len(scores)) if scores else 0,
        }
        scored_count += 1

    # Aggregate
    dim_avgs = {}
    for dim in ref_embeddings:
        dim_avgs[dim] = round(dim_totals[dim] / scored_count) if scored_count > 0 else 0

    overall = round(sum(dim_avgs.values()) / len(dim_avgs)) if dim_avgs else 0

    return {
        "files": file_scores,
        "overall": overall,
        "dimensions": dim_avgs,
    }
