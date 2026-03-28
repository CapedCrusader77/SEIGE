import sys
import socket
import os

print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

try:
    import fastapi
    print(f"✅ FastAPI version: {fastapi.__version__}")
except ImportError:
    print("❌ FastAPI NOT installed")

try:
    import uvicorn
    print(f"✅ Uvicorn version: {uvicorn.__version__}")
except ImportError:
    print("❌ Uvicorn NOT installed")

try:
    import websockets
    print(f"✅ Websockets version: {websockets.__version__}")
except ImportError:
    print("❌ Websockets NOT installed")

def check_port(host, port, name):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex((host, port))
    if result == 0:
        print(f"✅ {name} Port {port} is OPEN on {host}")
    else:
        print(f"❌ {name} Port {port} is CLOSED on {host}")
    sock.close()

print("\nChecking ports...")
check_port('127.0.0.1', 8000, "Backend")
check_port('localhost', 8000, "Backend")
check_port('127.0.0.1', 5173, "Frontend")
