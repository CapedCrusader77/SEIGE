import asyncio
import random

from siege.config import (
    COMMON_PORTS,
    FAKE_STOLEN_DATA,
    NODES,
    PASSWORD_WORDLIST,
    SQL_INJECTION_PAYLOADS,
)
from siege.connection_manager import manager
from siege.state import state


async def _guard_attack_start() -> bool:
    if state.is_attack_in_progress:
        await manager.broadcast(
            {
                "type": "ATTACK_ERROR",
                "message": "Another attack is already in progress",
            }
        )
        return False
    state.is_attack_in_progress = True
    return True


async def simulate_port_scan() -> None:
    if not await _guard_attack_start():
        return

    try:
        await manager.broadcast({"type": "ATTACK_START", "attack": "Port Scan"})

        if state.ids_enabled:
            await manager.broadcast(
                {
                    "type": "IDS_ALERT",
                    "threat": "Port Scan Detected",
                    "severity": "LOW",
                }
            )

        scanned_nodes = 0
        for node in NODES:
            if state.firewall_enabled and scanned_nodes >= 3:
                await manager.broadcast(
                    {
                        "type": "FIREWALL_BLOCK",
                        "message": "Port Scan blocked by Firewall",
                        "attack": "Port Scan",
                    }
                )
                break

            await manager.broadcast(
                {
                    "type": "NODE_SCAN_START",
                    "nodeId": node["id"],
                    "label": node["label"],
                }
            )

            for port in COMMON_PORTS:
                await asyncio.sleep(0.5)

                is_open = False
                if node["id"] == "router" and port in [22, 53, 80]:
                    is_open = True
                if node["id"] == "firewall" and port in [443]:
                    is_open = True
                if node["id"] == "webserver" and port in [80, 443]:
                    is_open = True
                if node["id"] == "database" and port in [3306]:
                    is_open = True
                if node["id"] == "admin" and port in [8080]:
                    is_open = True

                if random.random() < 0.05:
                    is_open = not is_open

                await manager.broadcast(
                    {
                        "type": "SCAN_RESULT",
                        "nodeId": node["id"],
                        "port": port,
                        "status": "OPEN" if is_open else "CLOSED",
                    }
                )

            scanned_nodes += 1

        await manager.broadcast({"type": "ATTACK_END", "attack": "Port Scan"})
    finally:
        state.is_attack_in_progress = False


async def simulate_brute_force() -> None:
    if not await _guard_attack_start():
        return

    try:
        await manager.broadcast({"type": "ATTACK_START", "attack": "Brute Force"})

        if state.ids_enabled:
            await manager.broadcast(
                {
                    "type": "IDS_ALERT",
                    "threat": "Brute Force Detected",
                    "severity": "HIGH",
                }
            )

        await manager.broadcast(
            {"type": "BRUTE_TARGET", "nodeId": "admin", "label": "Admin Panel"}
        )

        attempt_count = 0
        for password in PASSWORD_WORDLIST:
            if state.firewall_enabled and attempt_count >= 5:
                await manager.broadcast(
                    {
                        "type": "FIREWALL_BLOCK",
                        "message": "Brute Force blocked by Firewall",
                        "attack": "Brute Force",
                    }
                )
                break

            await asyncio.sleep(0.4)
            attempt_count += 1

            if password == "@dmin&123":
                await manager.broadcast(
                    {
                        "type": "BRUTE_RESULT",
                        "nodeId": "admin",
                        "password": password,
                        "result": "CRACKED",
                    }
                )
                break

            await manager.broadcast(
                {
                    "type": "BRUTE_RESULT",
                    "nodeId": "admin",
                    "password": password,
                    "result": "FAILED",
                }
            )

        await manager.broadcast({"type": "ATTACK_END", "attack": "Brute Force"})
    finally:
        state.is_attack_in_progress = False


async def simulate_sql_injection() -> None:
    if not await _guard_attack_start():
        return

    try:
        await manager.broadcast({"type": "ATTACK_START", "attack": "SQL Injection"})

        if state.ids_enabled:
            await manager.broadcast(
                {
                    "type": "IDS_ALERT",
                    "threat": "SQL Injection Detected",
                    "severity": "CRITICAL",
                }
            )

        await manager.broadcast(
            {"type": "SQL_TARGET", "nodeId": "database", "label": "Database"}
        )

        injection_succeeded = False
        for idx, payload in enumerate(SQL_INJECTION_PAYLOADS):
            await asyncio.sleep(0.6)

            if state.firewall_enabled:
                await manager.broadcast(
                    {
                        "type": "SQL_RESULT",
                        "nodeId": "database",
                        "payload": payload,
                        "result": "BLOCKED",
                    }
                )
                continue

            if idx >= 6:
                injection_succeeded = True
                await manager.broadcast(
                    {
                        "type": "SQL_RESULT",
                        "nodeId": "database",
                        "payload": payload,
                        "result": "INJECTED",
                    }
                )
            else:
                await manager.broadcast(
                    {
                        "type": "SQL_RESULT",
                        "nodeId": "database",
                        "payload": payload,
                        "result": "BLOCKED",
                    }
                )

        if injection_succeeded:
            await asyncio.sleep(0.8)
            await manager.broadcast(
                {"type": "DATA_EXFILTRATED", "data": FAKE_STOLEN_DATA}
            )

        if state.firewall_enabled:
            await manager.broadcast(
                {
                    "type": "FIREWALL_BLOCK",
                    "message": "SQL Injection blocked by Firewall",
                    "attack": "SQL Injection",
                }
            )

        await manager.broadcast({"type": "ATTACK_END", "attack": "SQL Injection"})
    finally:
        state.is_attack_in_progress = False


async def simulate_ddos() -> None:
    if not await _guard_attack_start():
        return

    try:
        await manager.broadcast({"type": "ATTACK_START", "attack": "DDoS"})

        if state.ids_enabled:
            await manager.broadcast(
                {
                    "type": "IDS_ALERT",
                    "threat": "DDoS Detected",
                    "severity": "CRITICAL",
                }
            )

        await manager.broadcast(
            {"type": "DDOS_TARGET", "nodeId": "webserver", "label": "Web Server"}
        )

        delay_multiplier = 2 if state.firewall_enabled else 1
        waves = [
            {"wave": 1, "count": 100, "status": "RAMPING", "delay": 0.8 * delay_multiplier},
            {"wave": 2, "count": 500, "status": "RAMPING", "delay": 0.8 * delay_multiplier},
            {"wave": 3, "count": 2000, "status": "RAMPING", "delay": 0.8 * delay_multiplier},
            {"wave": 4, "count": 10000, "status": "OVERLOADING", "delay": 0.8 * delay_multiplier},
            {"wave": 5, "count": 50000, "status": "OVERLOADING", "delay": 0.8 * delay_multiplier},
        ]

        for wave_data in waves:
            await asyncio.sleep(wave_data["delay"])
            await manager.broadcast(
                {
                    "type": "DDOS_WAVE",
                    "nodeId": "webserver",
                    "wave": wave_data["wave"],
                    "count": wave_data["count"],
                    "status": wave_data["status"],
                }
            )

        if not state.firewall_enabled:
            await asyncio.sleep(1.0)
            await manager.broadcast({"type": "DDOS_CRASH", "nodeId": "webserver"})
        else:
            await asyncio.sleep(1.0)
            await manager.broadcast(
                {
                    "type": "FIREWALL_BLOCK",
                    "message": "DDoS mitigated by Firewall - Server protected",
                    "attack": "DDoS",
                }
            )

        await manager.broadcast({"type": "ATTACK_END", "attack": "DDoS"})
    finally:
        state.is_attack_in_progress = False


async def simulate_attack_chain() -> None:
    if state.is_attack_in_progress:
        await manager.broadcast(
            {
                "type": "ERROR",
                "message": "Another attack is already in progress",
            }
        )
        return

    state.is_attack_in_progress = True

    try:
        await manager.broadcast(
            {
                "type": "ATTACK_CHAIN_START",
                "message": "Initiating APT-style attack chain...",
            }
        )

        await manager.broadcast(
            {
                "type": "CHAIN_PHASE",
                "phase": 1,
                "total": 4,
                "attack": "port-scan",
                "message": "Phase 1/4: Port Reconnaissance",
            }
        )
        await simulate_port_scan()
        await asyncio.sleep(2.0)

        await manager.broadcast(
            {
                "type": "CHAIN_PHASE",
                "phase": 2,
                "total": 4,
                "attack": "brute-force",
                "message": "Phase 2/4: Brute Force Authentication",
            }
        )
        state.is_attack_in_progress = False
        await simulate_brute_force()
        state.is_attack_in_progress = True
        await asyncio.sleep(2.0)

        await manager.broadcast(
            {
                "type": "CHAIN_PHASE",
                "phase": 3,
                "total": 4,
                "attack": "sql-injection",
                "message": "Phase 3/4: SQL Injection Attack",
            }
        )
        state.is_attack_in_progress = False
        await simulate_sql_injection()
        state.is_attack_in_progress = True
        await asyncio.sleep(2.0)

        await manager.broadcast(
            {
                "type": "CHAIN_PHASE",
                "phase": 4,
                "total": 4,
                "attack": "ddos",
                "message": "Phase 4/4: DDoS Flood Wave",
            }
        )
        state.is_attack_in_progress = False
        await simulate_ddos()

        await manager.broadcast(
            {
                "type": "ATTACK_CHAIN_COMPLETE",
                "message": "Attack chain completed - All phases executed",
            }
        )
    finally:
        state.is_attack_in_progress = False
