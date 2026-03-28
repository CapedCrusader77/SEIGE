import os
from typing import Any, Dict, List


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


API_KEY = os.getenv("SIEGE_API_KEY", "")
REQUIRE_API_KEY = _to_bool(os.getenv("SIEGE_REQUIRE_API_KEY"), default=False)

BACKEND_HOST = os.getenv("SIEGE_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("SIEGE_PORT", "8000"))

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("SIEGE_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

NODES: List[Dict[str, Any]] = [
    {"id": "router", "label": "Router", "type": "router", "x": 400, "y": 100},
    {"id": "firewall", "label": "Firewall", "type": "firewall", "x": 400, "y": 250},
    {"id": "webserver", "label": "Web Server", "type": "server", "x": 250, "y": 420},
    {"id": "database", "label": "Database", "type": "database", "x": 550, "y": 420},
    {"id": "admin", "label": "Admin Panel", "type": "admin", "x": 400, "y": 560},
]

LINKS: List[Dict[str, str]] = [
    {"source": "router", "target": "firewall"},
    {"source": "firewall", "target": "webserver"},
    {"source": "firewall", "target": "database"},
    {"source": "webserver", "target": "admin"},
    {"source": "database", "target": "admin"},
]

COMMON_PORTS = [21, 22, 53, 80, 443, 3306, 8080]

PASSWORD_WORDLIST = [
    "admin",
    "password",
    "123456",
    "admin123",
    "root",
    "password123",
    "12345",
    "letmein",
    "qwerty",
    "welcome",
    "monkey",
    "dragon",
    "@dmin&123",
    "master",
    "shadow",
]

SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "' UNION SELECT * FROM passwords--",
    "admin'--",
    "' OR 1=1--",
    "'; INSERT INTO users VALUES ('hacker','pwned');--",
    "' OR 'x'='x",
    "'; SELECT * FROM credit_cards;--",
]

FAKE_STOLEN_DATA: List[Dict[str, str]] = [
    {"user": "john_doe", "pass": "*******", "email": "john@example.com"},
    {"user": "admin", "pass": "*******", "email": "admin@siege.com"},
    {"user": "root", "pass": "*******", "email": "root@internal.net"},
]
