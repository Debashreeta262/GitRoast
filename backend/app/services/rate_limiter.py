import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request
from app.config import settings
from app.models.api import AppError

class IPRateLimiter:
    def __init__(self, requests_per_minute: int = 15):
        self.rpm = requests_per_minute
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window_start = now - 60.0

        # Clean timestamps older than 60 seconds
        self.requests[client_ip] = [ts for ts in self.requests[client_ip] if ts > window_start]

        if len(self.requests[client_ip]) >= self.rpm:
            raise AppError(
                code="RATE_LIMITED",
                message=f"Rate limit exceeded. You can only make {self.rpm} analysis requests per minute.",
                status_code=429,
            )

        self.requests[client_ip].append(now)

ip_rate_limiter = IPRateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)
