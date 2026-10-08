import pytest
from app.models.api import AppError
from app.services.github_service import validate_username, github_service
from app.services.cache import TTLCache

def test_username_validation():
    # Valid usernames
    valid_names = ["octocat", "torvalds", "john-doe", "a", "a-b", "user-123-test"]
    for name in valid_names:
        validate_username(name)

    # Invalid usernames
    invalid_names = [
        "-start-hyphen",
        "end-hyphen-",
        "double--hyphen",
        "invalid@char",
        "invalid.char",
        "invalid char",
        "a" * 40,
        "",
    ]
    for name in invalid_names:
        with pytest.raises(AppError) as exc_info:
            validate_username(name)
        assert exc_info.value.code == "INVALID_USERNAME"
        assert exc_info.value.status_code == 400

def test_cache_mechanism():
    cache = TTLCache(default_ttl=2)
    cache.set("test_key", {"data": 123}, ttl=1)
    assert cache.get("test_key") == {"data": 123}
    assert cache.get("nonexistent") is None

@pytest.mark.asyncio
async def test_nonexistent_user():
    # A user handle guaranteed not to exist
    fake_user = "nonexistent-user-xyz-987654321-gitroast"
    with pytest.raises(AppError) as exc_info:
        await github_service.fetch_user_data(fake_user)
    assert exc_info.value.code in ("USER_NOT_FOUND", "RATE_LIMITED")
