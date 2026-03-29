import os

os.environ["SIEGE_REQUIRE_API_KEY"] = "false"

from fastapi.testclient import TestClient

from main import app
from siege.connection_manager import manager
from siege.persistence import init_db
from siege.state import state

client = TestClient(app)


class DummyBackgroundTask:
    def __init__(self) -> None:
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))


def reset_state() -> None:
    init_db()
    state.is_attack_in_progress = False
    state.firewall_enabled = False
    state.ids_enabled = False


def test_get_network_returns_nodes_and_links():
    response = client.get("/network")
    assert response.status_code == 200
    payload = response.json()
    assert "nodes" in payload and "links" in payload
    assert len(payload["nodes"]) == 5


def test_toggle_firewall_endpoint():
    reset_state()
    response = client.post("/defense/firewall/toggle")
    assert response.status_code == 200
    assert response.json()["firewall_enabled"] is True

    response = client.post("/defense/firewall/toggle")
    assert response.status_code == 200
    assert response.json()["firewall_enabled"] is False


def test_toggle_ids_endpoint():
    reset_state()
    response = client.post("/defense/ids/toggle")
    assert response.status_code == 200
    assert response.json()["ids_enabled"] is True

    response = client.post("/defense/ids/toggle")
    assert response.status_code == 200
    assert response.json()["ids_enabled"] is False


def test_attack_guard_broadcasts_error_when_busy(monkeypatch):
    reset_state()
    state.is_attack_in_progress = True
    sent = []

    async def fake_broadcast(message):
        sent.append(message)

    monkeypatch.setattr(manager, "broadcast", fake_broadcast)

    import asyncio
    from siege.simulations import simulate_port_scan

    asyncio.run(simulate_port_scan())

    assert sent
    assert sent[0]["type"] == "ATTACK_ERROR"
    assert "already in progress" in sent[0]["message"]


def test_attack_endpoints_schedule_background_tasks(monkeypatch):
    reset_state()
    captured = []

    def fake_add_task(self, func, *args, **kwargs):
        captured.append(func.__name__)

    monkeypatch.setattr("fastapi.BackgroundTasks.add_task", fake_add_task)

    client.post("/attack/port-scan")
    client.post("/attack/brute-force")
    client.post("/attack/sql-injection")
    client.post("/attack/ddos")
    client.post("/attack/chain")
    client.post("/attack/zero-day")

    assert captured == [
        "simulate_port_scan",
        "simulate_brute_force",
        "simulate_sql_injection",
        "simulate_ddos",
        "simulate_attack_chain",
        "simulate_zero_day",
    ]


def test_history_events_endpoint_returns_list():
    init_db()
    response = client.get("/history/events?limit=10")
    assert response.status_code == 200
    payload = response.json()
    assert "events" in payload
    assert isinstance(payload["events"], list)
