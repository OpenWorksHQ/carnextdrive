"""
Wrapper FastAPI service that satisfies the platform's supervisor config
(which expects `uvicorn server:app` on port 8001 in /app/backend).

The real application is a Node/Express + Vite project living in /app/project.
We spawn the Node Express dev server on port 8002 and proxy every request
through to it. This keeps the platform happy without changing the user's
Node stack.
"""

import os
import asyncio
import signal
import subprocess
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse

NODE_PORT = int(os.environ.get("NODE_API_PORT", "8002"))
NODE_URL = f"http://127.0.0.1:{NODE_PORT}"
PROJECT_DIR = "/app/project"

_node_proc: subprocess.Popen | None = None
_client: httpx.AsyncClient | None = None


async def _wait_for_node(timeout: float = 30.0) -> bool:
    deadline = asyncio.get_event_loop().time() + timeout
    async with httpx.AsyncClient(timeout=2.0) as c:
        while asyncio.get_event_loop().time() < deadline:
            try:
                r = await c.get(f"{NODE_URL}/api/ping")
                if r.status_code == 200:
                    return True
            except Exception:
                pass
            await asyncio.sleep(0.5)
    return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _node_proc, _client

    env = os.environ.copy()
    env["API_PORT"] = str(NODE_PORT)
    # Make sure the Stripe + other vars from /app/project/.env are loaded
    # by dotenv inside the Express server itself.

    _node_proc = subprocess.Popen(
        ["npx", "tsx", "server/dev-server.ts"],
        cwd=PROJECT_DIR,
        env=env,
        stdout=open("/var/log/supervisor/node-api.out.log", "ab"),
        stderr=open("/var/log/supervisor/node-api.err.log", "ab"),
        preexec_fn=os.setsid,
    )

    ok = await _wait_for_node()
    if not ok:
        print("[backend wrapper] WARNING: Node API did not start within timeout")

    _client = httpx.AsyncClient(base_url=NODE_URL, timeout=30.0)

    try:
        yield
    finally:
        if _client is not None:
            await _client.aclose()
        if _node_proc is not None:
            try:
                os.killpg(os.getpgid(_node_proc.pid), signal.SIGTERM)
            except Exception:
                pass


app = FastAPI(lifespan=lifespan)


@app.get("/healthz")
async def healthz():
    return PlainTextResponse("ok")


# Proxy every other request (including /api/*) to the Node Express server.
@app.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request):
    if _client is None:
        return Response("backend wrapper not ready", status_code=503)

    url = f"/{full_path}"
    qs = request.url.query
    if qs:
        url = f"{url}?{qs}"

    # Strip hop-by-hop headers and any Host header (httpx sets its own)
    hop_by_hop = {
        "host",
        "content-length",
        "connection",
        "keep-alive",
        "transfer-encoding",
        "upgrade",
    }
    fwd_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in hop_by_hop
    }

    body = await request.body()

    try:
        upstream = await _client.request(
            request.method,
            url,
            content=body,
            headers=fwd_headers,
        )
    except httpx.ConnectError:
        return Response(
            "upstream Node API not reachable on port " + str(NODE_PORT),
            status_code=502,
        )

    resp_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in {"content-encoding", "transfer-encoding", "content-length", "connection"}
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )
