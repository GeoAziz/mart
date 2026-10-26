import hashlib
import os
from pathlib import Path
from typing import Optional, Tuple
import yaml
from caqg.config.models import CAQGGlobalConfig


def load_config(config_path: Optional[str] = None) -> Tuple[CAQGGlobalConfig, str]:
    """
    Loads and validates properties configuration file.
    Returns (CAQGGlobalConfig, config_sha256_hash).
    """
    if not config_path:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        config_path = str(base_dir / "config" / "properties.yml")

    path = Path(config_path)
    if not path.is_file():
        raise FileNotFoundError(f"CAQG configuration file not found at: {config_path}")

    content = path.read_text(encoding="utf-8")
    config_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

    data = yaml.safe_load(content) or {}
    config = CAQGGlobalConfig.model_validate(data)

    return config, config_hash
