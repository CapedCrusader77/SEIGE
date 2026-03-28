from fastapi import Header, HTTPException, status

from siege.config import API_KEY, REQUIRE_API_KEY


def protect_control_plane(x_api_key: str | None = Header(default=None)) -> None:
    # Keep local development frictionless unless explicitly enabled.
    if not REQUIRE_API_KEY:
        return

    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API key protection is enabled but SIEGE_API_KEY is not configured",
        )

    if x_api_key != API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
