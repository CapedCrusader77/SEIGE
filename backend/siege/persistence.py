import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List

DB_PATH = Path(os.getenv("SIEGE_DB_PATH", Path(__file__).resolve().parent.parent / "siege_history.db"))

_DB_LOCK = Lock()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db() -> None:
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS event_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    attack TEXT,
                    node_id TEXT,
                    severity TEXT,
                    payload TEXT NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def _extract_node_id(message: Dict[str, Any]) -> str | None:
    node_id = message.get("nodeId")
    if isinstance(node_id, str):
        return node_id

    target_id = message.get("targetId")
    if isinstance(target_id, str):
        return target_id

    return None


def log_event(message: Dict[str, Any]) -> None:
    event_type = str(message.get("type") or "UNKNOWN")
    attack = message.get("attack")
    node_id = _extract_node_id(message)
    severity = message.get("severity")
    payload = json.dumps(message)

    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute(
                """
                INSERT INTO event_log (created_at, event_type, attack, node_id, severity, payload)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    _utc_now_iso(),
                    event_type,
                    str(attack) if attack is not None else None,
                    node_id,
                    str(severity) if severity is not None else None,
                    payload,
                ),
            )
            conn.commit()
        finally:
            conn.close()


def get_recent_events(limit: int = 100) -> List[Dict[str, Any]]:
    safe_limit = max(1, min(limit, 500))

    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                """
                SELECT id, created_at, event_type, attack, node_id, severity, payload
                FROM event_log
                ORDER BY id DESC
                LIMIT ?
                """,
                (safe_limit,),
            ).fetchall()
        finally:
            conn.close()

    events: List[Dict[str, Any]] = []
    for row in rows:
        payload: Dict[str, Any]
        try:
            payload = json.loads(row["payload"])
        except json.JSONDecodeError:
            payload = {"raw": row["payload"]}

        events.append(
            {
                "id": row["id"],
                "timestamp": row["created_at"],
                "type": row["event_type"],
                "attack": row["attack"],
                "nodeId": row["node_id"],
                "severity": row["severity"],
                "payload": payload,
            }
        )

    return events
