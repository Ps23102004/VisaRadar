from __future__ import annotations

import importlib.resources
from dataclasses import dataclass
from typing import Any, Dict, Optional

import yaml


@dataclass
class ProviderConfig:
    provider: str
    model: str
    base_url: str | None
    key_env: str | None


def load_providers(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    result: dict = {"default": data.get("default", ""), "providers": {}}
    for name, cfg in data.get("providers", {}).items():
        result["providers"][name] = {
            "base_url": cfg.get("base_url"),
            "key_env": cfg.get("key_env"),
        }
    return result


def default_providers_path() -> str:
    return str(importlib.resources.files(__package__).joinpath("providers.yaml"))


def resolve_provider(
    model_arg: str | None,
    base_url_arg: str | None,
    env_model: str | None,
    env_base_url: str | None,
    user_config_path: str,
) -> ProviderConfig:
    import os

    resolved_model: str | None = None
    resolved_base_url: str | None = None

    if model_arg:
        resolved_model = model_arg
        resolved_base_url = base_url_arg
    elif env_model:
        resolved_model = env_model
        resolved_base_url = env_base_url
    else:
        try:
            with open(user_config_path, "r", encoding="utf-8") as f:
                user_cfg = yaml.safe_load(f) or {}
            resolved_model = user_cfg.get("model")
            resolved_base_url = user_cfg.get("base_url")
        except (FileNotFoundError, OSError):
            pass

    if resolved_model is None:
        providers_data = load_providers(default_providers_path())
        resolved_model = providers_data.get("default", "")
        resolved_base_url = base_url_arg
    else:
        providers_data = load_providers(default_providers_path())

    if not resolved_model:
        raise ValueError("no model could be resolved")

    parts = resolved_model.split("/", 1)
    provider = parts[0]
    model_name = parts[1] if len(parts) > 1 else ""

    explicit_base_url = base_url_arg if base_url_arg else resolved_base_url

    if provider not in providers_data["providers"]:
        if explicit_base_url is None:
            raise ValueError(f"unknown provider: {provider}")
        return ProviderConfig(provider=provider, model=model_name, base_url=explicit_base_url, key_env=None)

    preset = providers_data["providers"][provider]
    base_url = explicit_base_url if explicit_base_url else preset.get("base_url")
    key_env = preset.get("key_env")

    return ProviderConfig(provider=provider, model=model_name, base_url=base_url, key_env=key_env)
