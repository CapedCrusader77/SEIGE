from typing import Any, Dict, List

import logging
import time

from fastapi import BackgroundTasks, Depends, FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from siege.config import ALLOWED_ORIGINS, BACKEND_HOST, BACKEND_PORT, LINKS, NODES
from siege.connection_manager import manager
from siege.persistence import get_recent_events, init_db
from siege.security import protect_control_plane
from siege.simulations import (
    simulate_attack_chain,
    simulate_brute_force,
    simulate_ddos,
    simulate_port_scan,
    simulate_sql_injection,
)
from siege.state import state

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("siege.api")

app = FastAPI(title="Siege API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s -> %s (%.2fms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def get_health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/network")
def get_network() -> Dict[str, List[Dict[str, Any]]]:
    return {"nodes": NODES, "links": LINKS}


@app.post("/attack/port-scan")
async def start_port_scan(background_tasks: BackgroundTasks, _auth: None = Depends(protect_control_plane)) -> Dict[str, str]:
    background_tasks.add_task(simulate_port_scan)
    return {"status": "Attack initiated"}


@app.post("/attack/brute-force")
async def start_brute_force(background_tasks: BackgroundTasks, _auth: None = Depends(protect_control_plane)) -> Dict[str, str]:
    background_tasks.add_task(simulate_brute_force)
    return {"status": "Attack initiated"}


@app.post("/attack/sql-injection")
async def start_sql_injection(background_tasks: BackgroundTasks, _auth: None = Depends(protect_control_plane)) -> Dict[str, str]:
    background_tasks.add_task(simulate_sql_injection)
    return {"status": "Attack initiated"}


@app.post("/attack/ddos")
async def start_ddos(background_tasks: BackgroundTasks, _auth: None = Depends(protect_control_plane)) -> Dict[str, str]:
    background_tasks.add_task(simulate_ddos)
    return {"status": "Attack initiated"}


@app.post("/attack/chain")
async def start_attack_chain(background_tasks: BackgroundTasks, _auth: None = Depends(protect_control_plane)) -> Dict[str, str]:
    background_tasks.add_task(simulate_attack_chain)
    return {"status": "Attack chain initiated"}


@app.post("/defense/firewall/toggle")
async def toggle_firewall(_auth: None = Depends(protect_control_plane)) -> Dict[str, Any]:
    state.firewall_enabled = not state.firewall_enabled

    await manager.broadcast(
        {
            "type": "FIREWALL_STATUS",
            "enabled": state.firewall_enabled,
        }
    )

    return {
        "status": "success",
        "firewall_enabled": state.firewall_enabled,
    }


@app.post("/defense/ids/toggle")
async def toggle_ids(_auth: None = Depends(protect_control_plane)) -> Dict[str, Any]:
    state.ids_enabled = not state.ids_enabled

    await manager.broadcast(
        {
            "type": "IDS_STATUS",
            "enabled": state.ids_enabled,
        }
    )

    return {
        "status": "success",
        "ids_enabled": state.ids_enabled,
    }


@app.get("/history/events")
def get_history_events(limit: int = Query(default=100, ge=1, le=500)) -> Dict[str, Any]:
    return {
        "events": get_recent_events(limit),
        "count": limit,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
