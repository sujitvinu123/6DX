"""
AERO-TWIN — Platform Startup Script
Launches the Digital Twin Runtime server on ws://localhost:8765
and optionally serves the frontend dashboard on http://localhost:8000

Usage:
    python start.py [--scenario healthy|lubrication|misfire|sensor_drift|cooling|all] [--port 8765] [--web]
"""

import sys
import os
import asyncio
import argparse
import socket
import threading
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

def is_port_in_use(port: int, host="127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((host, port)) == 0

def main():
    parser = argparse.ArgumentParser(description="AERO-TWIN Platform Startup")
    parser.add_argument("--scenario", default="healthy",
                        help="Initial engine scenario: healthy, lubrication, misfire, sensor_drift, cooling, all")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket port (default: 8765)")
    parser.add_argument("--web", action="store_true", help="Also start local HTTP static server for frontend on port 8000")
    parser.add_argument("--web-port", type=int, default=8000, help="HTTP web server port (default: 8000)")
    args = parser.parse_args()

    print("=" * 65)
    print("       A E R O - T W I N   P L A T F O R M   S T A R T U P")
    print("=" * 65)
    print(f"  Working Directory: {ROOT_DIR}")
    print(f"  WebSocket Port:    ws://localhost:{args.port}")
    print(f"  Initial Scenario:  {args.scenario.upper()}")

    # Check WebSocket port availability
    if is_port_in_use(args.port):
        print(f"\n  [WARNING] Port {args.port} is already in use by another process.")
        print(f"  If an instance of AERO-TWIN is already running, please stop it first")
        print(f"  or specify a different port: python start.py --port {args.port + 1}")
        print("=" * 65)
        sys.exit(1)

    if args.web:
        import http.server
        import socketserver

        web_port = args.web_port
        while is_port_in_use(web_port):
            web_port += 1

        project_root = ROOT_DIR.parent
        os.chdir(str(project_root))
        socketserver.TCPServer.allow_reuse_address = True
        httpd = socketserver.TCPServer(("", web_port), http.server.SimpleHTTPRequestHandler)
        web_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        web_thread.start()
        print(f"  Frontend Web UI:   http://localhost:{web_port}/frontend/overview.html")

    print("=" * 65)

    # Import and run mock_stream_server directly in-process
    try:
        from mock_stream_server import main_async
        asyncio.run(main_async(args.port, args.scenario))
    except KeyboardInterrupt:
        print("\n[AERO-TWIN] Platform shutdown requested. Exiting cleanly.")
    except OSError as e:
        if "10048" in str(e) or "already in use" in str(e):
            print(f"\n[AERO-TWIN ERROR] Port {args.port} is already in use. Please stop the existing process.")
        else:
            print(f"\n[AERO-TWIN ERROR] {e}")

if __name__ == "__main__":
    main()
