from typing import Any, Dict, List

from fastapi import WebSocket

from siege.persistence import log_event


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        # Persistence failures should never stop real-time UI updates.
        try:
            log_event(message)
        except Exception:
            pass

        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()
