"""Temporary WSL loopback bridge to a fixed RegTrack container on an internal network.

Run in the foreground; Ctrl+C closes it. No credentials, HTTP rewriting or logging.
Docker does not publish ports on an exclusively internal bridge network.
"""
import argparse
import ipaddress
import json
import selectors
import socket
import socketserver
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("service", choices=["openaleph", "graphiti"])
args = parser.parse_args()
project = "regtrack-openaleph" if args.service == "openaleph" else "regtrack-graphiti-readonly"
container = f"{project}-{'api' if args.service == 'openaleph' else 'graphiti'}-1"
networks = json.loads(subprocess.check_output(
    ["docker", "inspect", "--format", "{{json .NetworkSettings.Networks}}", container], text=True))
address = networks[f"{project}_default"]["IPAddress"]
if not ipaddress.ip_address(address).is_private:
    raise SystemExit("Expected a private container address")
port = 8081 if args.service == "openaleph" else 8000


class Forward(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            with socket.create_connection((address, 8000), timeout=10) as upstream:
                upstream.settimeout(None)
                with selectors.DefaultSelector() as selector:
                    selector.register(self.request, selectors.EVENT_READ, upstream)
                    selector.register(upstream, selectors.EVENT_READ, self.request)
                    while True:
                        for key, _ in selector.select():
                            data = key.fileobj.recv(65536)
                            if not data:
                                return
                            key.data.sendall(data)
        except (OSError, TimeoutError):
            return


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("127.0.0.1", port), Forward) as server:
    print(f"RegTrack {args.service}: 127.0.0.1:{port}; temporary foreground bridge", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
