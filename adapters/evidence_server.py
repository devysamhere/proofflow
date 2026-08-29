"""
ProofFlow Evidence Server
v0.1.0

Development HTTP API for serving ProofFlow evidence.

Example:

GET /evidence?tx=0x...&network=sepolia

The server:
1. Receives a transaction hash.
2. Retrieves live blockchain data.
3. Builds normalized/interpreted evidence.
4. Returns the evidence as JSON.

It does NOT determine PASS or FAIL.
GenLayer remains responsible for campaign verification.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from typing import Any

from evidence_builder import build_verification_evidence


HOST = "127.0.0.1"
PORT = 8787


# ==========================================================
# JSON RESPONSE
# ==========================================================

def encode_json(
    value: Any
) -> bytes:

    return json.dumps(
        value,
        indent=2
    ).encode(
        "utf-8"
    )


# ==========================================================
# HTTP HANDLER
# ==========================================================

class ProofFlowHandler(
    BaseHTTPRequestHandler
):

    def send_json(
        self,
        status_code: int,
        payload: dict[str, Any]
    ) -> None:

        body = encode_json(
            payload
        )

        self.send_response(
            status_code
        )

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.end_headers()

        self.wfile.write(
            body
        )

    def do_GET(
        self
    ) -> None:

        parsed = urlparse(
            self.path
        )

        # ----------------------------------------------
        # HEALTH CHECK
        # ----------------------------------------------

        if parsed.path == "/health":

            self.send_json(
                200,
                {
                    "service":
                        "ProofFlow Evidence Server",

                    "status":
                        "ok",

                    "version":
                        "0.1.0"
                }
            )

            return

        # ----------------------------------------------
        # EVIDENCE ENDPOINT
        # ----------------------------------------------

        if parsed.path == "/evidence":

            query = parse_qs(
                parsed.query
            )

            transaction_hash = (
                query.get(
                    "tx",
                    [""]
                )[0]
            ).strip()

            network = (
                query.get(
                    "network",
                    ["sepolia"]
                )[0]
            ).strip().lower()

            if transaction_hash == "":

                self.send_json(
                    400,
                    {
                        "error":
                            "tx query parameter is required"
                    }
                )

                return

            if network not in (
                "sepolia",
                "ethereum"
            ):

                self.send_json(
                    400,
                    {
                        "error":
                            "unsupported network",

                        "supported_networks": [
                            "sepolia",
                            "ethereum"
                        ]
                    }
                )

                return

            try:

                evidence = (
                    build_verification_evidence(
                        transaction_hash,
                        network
                    )
                )

                self.send_json(
                    200,
                    evidence
                )

            except Exception as error:

                self.send_json(
                    500,
                    {
                        "error":
                            "evidence_generation_failed",

                        "message":
                            str(error)
                    }
                )

            return

        # ----------------------------------------------
        # ROOT
        # ----------------------------------------------

        if parsed.path == "/":

            self.send_json(
                200,
                {
                    "service":
                        "ProofFlow Evidence Server",

                    "version":
                        "0.1.0",

                    "endpoints": {
                        "health":
                            "/health",

                        "evidence":
                            (
                                "/evidence"
                                "?tx=<transaction_hash>"
                                "&network=sepolia"
                            )
                    }
                }
            )

            return

        # ----------------------------------------------
        # NOT FOUND
        # ----------------------------------------------

        self.send_json(
            404,
            {
                "error":
                    "not_found"
            }
        )

    def log_message(
        self,
        format: str,
        *args: Any
    ) -> None:

        print(
            "[ProofFlow]",
            format % args
        )


# ==========================================================
# SERVER
# ==========================================================

def run_server() -> None:

    server = ThreadingHTTPServer(
        (
            HOST,
            PORT
        ),
        ProofFlowHandler
    )

    print(
        "ProofFlow Evidence Server"
    )

    print(
        "Listening on:"
    )

    print(
        f"http://{HOST}:{PORT}"
    )

    print()

    print(
        "Health:"
    )

    print(
        f"http://{HOST}:{PORT}/health"
    )

    print()

    print(
        "Press Ctrl+C to stop."
    )

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print()
        print(
            "Stopping ProofFlow Evidence Server..."
        )

    finally:

        server.server_close()


if __name__ == "__main__":
    run_server()