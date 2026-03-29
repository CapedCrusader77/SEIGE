from fastapi import Header, HTTPException, status

from siege.config import API_KEY, REQUIRE_API_KEY


def get_control_plane_auth_error(provided_api_key: str | None) -> str | None:
    if not REQUIRE_API_KEY:
        return None

    if not API_KEY:
        return "API key protection is enabled but SIEGE_API_KEY is not configured"

    if provided_api_key != API_KEY:
        return "Invalid API key"

    return None


def protect_control_plane(x_api_key: str | None = Header(default=None)) -> None:
    error = get_control_plane_auth_error(x_api_key)
    if error is None:
        return

    if "not configured" in error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=error)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)
