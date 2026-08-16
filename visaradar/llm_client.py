from __future__ import annotations

import os

import requests


class LLMConnectionError(Exception):
    pass


class LLMClient:
    def chat(self, prompt: str) -> str:
        raise NotImplementedError


class OllamaClient(LLMClient):
    def __init__(self, model: str, base_url: str = "http://127.0.0.1:11434") -> None:
        self.model = model
        self.base_url = base_url

    def chat(self, prompt: str) -> str:
        url = f"{self.base_url}/api/chat"
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "think": False,
        }
        try:
            response = requests.post(url, json=payload, timeout=180)
            response.raise_for_status()
        except requests.ConnectionError as exc:
            raise LLMConnectionError(f"Connection refused to {url}: {exc}") from exc
        except requests.Timeout as exc:
            raise LLMConnectionError(f"Request to {url} timed out after 180s") from exc
        except requests.HTTPError as exc:
            status = getattr(exc, "response", None)
            status_code = getattr(status, "status_code", "?")
            raise LLMConnectionError(f"Non-200 response ({status_code}) from {url}") from exc

        data = response.json()
        try:
            content = data["message"]["content"]
        except (KeyError, TypeError) as exc:
            raise LLMConnectionError("Response missing or empty 'message.content'") from exc
        if not isinstance(content, str) or not content:
            raise LLMConnectionError("Response 'message.content' was empty or not a string")
        return content


class OpenAICompatClient(LLMClient):
    def __init__(self, model: str, base_url: str, api_key: str | None) -> None:
        self.model = model
        self.base_url = base_url
        self.api_key = api_key

    def chat(self, prompt: str) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key is not None:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=180)
            response.raise_for_status()
        except requests.ConnectionError as exc:
            raise LLMConnectionError(f"Connection refused to {url}: {exc}") from exc
        except requests.Timeout as exc:
            raise LLMConnectionError(f"Request to {url} timed out after 180s") from exc
        except requests.HTTPError as exc:
            status = getattr(exc, "response", None)
            status_code = getattr(status, "status_code", "?")
            raise LLMConnectionError(f"Non-200 response ({status_code}) from {url}") from exc

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMConnectionError("Response missing or empty 'choices[0].message.content'") from exc
        if not isinstance(content, str) or not content:
            raise LLMConnectionError("Response 'choices[0].message.content' was empty or not a string")
        return content


def make_client(cfg: "ProviderConfig") -> LLMClient:
    from visaradar.config import ProviderConfig

    if cfg.provider == "ollama":
        return OllamaClient(model=cfg.model, base_url=cfg.base_url or "http://127.0.0.1:11434")

    api_key: str | None = None
    if cfg.key_env:
        api_key = os.environ.get(cfg.key_env)
        if not api_key:
            raise LLMConnectionError(f"set the {cfg.key_env} environment variable to use provider '{cfg.provider}'")

    return OpenAICompatClient(model=cfg.model, base_url=cfg.base_url, api_key=api_key)
