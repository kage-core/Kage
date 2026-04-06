"""
Kage LLM Client — provider-agnostic wrapper.

Reads configuration from kage.config.json (searched upward from CWD).
Supports: anthropic (default), openai, ollama.

Usage:
    from llm_client import complete
    result = complete("Your prompt here")
"""

import json
import os
from pathlib import Path


def _load_config() -> dict:
    """Walk up from CWD looking for kage.config.json."""
    search = Path.cwd()
    for _ in range(5):
        candidate = search / "kage.config.json"
        if candidate.exists():
            with open(candidate) as f:
                return json.load(f)
        search = search.parent
    return {}


def complete(prompt: str) -> str:
    """Send prompt to the configured LLM and return the text response."""
    cfg = _load_config()
    provider = cfg.get("provider", "anthropic").lower()
    model = cfg.get("model", None)

    if provider == "anthropic":
        return _anthropic(prompt, model or "claude-sonnet-4-6")
    elif provider == "openai":
        return _openai(prompt, model or "gpt-4o")
    elif provider == "gemini":
        return _gemini(prompt, model or "gemini-2.0-flash")
    elif provider == "ollama":
        return _ollama(prompt, model or "llama3", cfg.get("ollama_url", "http://localhost:11434"))
    else:
        raise ValueError(f"Unsupported provider '{provider}'. Choose: anthropic, openai, gemini, ollama")


# ── Anthropic ────────────────────────────────────────────────────────────────

def _anthropic(prompt: str, model: str) -> str:
    try:
        import anthropic
    except ImportError:
        raise ImportError("Run: pip install anthropic")

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from env
    response = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


# ── Gemini ────────────────────────────────────────────────────────────────────

def _gemini(prompt: str, model: str) -> str:
    """Call Gemini via the google-genai SDK. Install: pip install google-genai"""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise EnvironmentError("Set GEMINI_API_KEY or GOOGLE_API_KEY to use the gemini provider.")
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=model, contents=prompt)
        return response.text.strip()
    except ImportError:
        pass

    # Fallback: Gemini OpenAI-compatible endpoint
    try:
        import openai
    except ImportError:
        raise ImportError("Run: pip install google-genai  (or: pip install openai)")

    client = openai.OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    response = client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()


# ── OpenAI ───────────────────────────────────────────────────────────────────

def _openai(prompt: str, model: str) -> str:
    try:
        import openai
    except ImportError:
        raise ImportError("Run: pip install openai")

    client = openai.OpenAI()  # uses OPENAI_API_KEY
    response = client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content.strip()


# ── Ollama (local) ────────────────────────────────────────────────────────────

def _ollama(prompt: str, model: str, base_url: str) -> str:
    import urllib.request

    payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
    return data.get("response", "").strip()
