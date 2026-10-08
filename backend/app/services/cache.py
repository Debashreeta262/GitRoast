import time
from typing import Any, Dict, Optional, Tuple

class TTLCache:
    def __init__(self, default_ttl: int = 600):
        self.default_ttl = default_ttl
        self._cache: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            value, expires_at = self._cache[key]
            if time.time() < expires_at:
                return value
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        duration = ttl if ttl is not None else self.default_ttl
        expires_at = time.time() + duration
        self._cache[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)

    def clear(self) -> None:
        self._cache.clear()

# Global singleton cache instance for GitHub profile responses
github_cache = TTLCache(default_ttl=600)

# Global singleton cache instance for AI roast results (keyed on username + role + brutality + variant)
ai_cache = TTLCache(default_ttl=600)
