"""
ProofFlow Ethereum RPC Adapter
v0.2.0

Fetches live Ethereum transaction evidence from supported
Ethereum networks.

ProofFlow uses Sepolia as its default development network.
"""

from __future__ import annotations

import json
import sys
import urllib.request
import urllib.error
from typing import Any


# ==========================================================
# NETWORK CONFIGURATION
# ==========================================================

NETWORKS = {
    "sepolia": {
        "name": "Ethereum Sepolia",
        "chain_id": 11155111,
        "rpc_url": "https://ethereum-sepolia-rpc.publicnode.com"
    },

    "ethereum": {
        "name": "Ethereum Mainnet",
        "chain_id": 1,
        "rpc_url": "https://ethereum-rpc.publicnode.com"
    }
}


DEFAULT_NETWORK = "sepolia"


# ==========================================================
# NETWORK HELPERS
# ==========================================================

def get_network(
    network: str = DEFAULT_NETWORK
) -> dict[str, Any]:

    network_key = str(
        network
    ).strip().lower()

    if network_key not in NETWORKS:
        raise ValueError(
            "Unsupported Ethereum network: "
            + network_key
        )

    return NETWORKS[
        network_key
    ]


# ==========================================================
# JSON-RPC CLIENT
# ==========================================================

def rpc_request(
    method: str,
    params: list[Any],
    network: str = DEFAULT_NETWORK
) -> Any:

    config = get_network(
        network
    )

    rpc_url = config[
        "rpc_url"
    ]

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params
    }

    request = urllib.request.Request(
        rpc_url,
        data=json.dumps(
            payload
        ).encode("utf-8"),
        headers={
            "Content-Type":
                "application/json",

            "User-Agent":
                "ProofFlow/0.2.0"
        },
        method="POST"
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=30
        ) as response:

            body = response.read().decode(
                "utf-8"
            )

    except urllib.error.HTTPError as error:

        raise RuntimeError(
            "Ethereum RPC HTTP error: "
            + str(error.code)
        ) from error

    except urllib.error.URLError as error:

        raise RuntimeError(
            "Could not connect to Ethereum RPC: "
            + str(error.reason)
        ) from error

    parsed = json.loads(
        body
    )

    if "error" in parsed:

        raise RuntimeError(
            "Ethereum RPC returned an error: "
            + json.dumps(
                parsed["error"]
            )
        )

    return parsed.get(
        "result"
    )


# ==========================================================
# HEX HELPERS
# ==========================================================

def hex_to_int(
    value: str | None
) -> int:

    if not value:
        return 0

    return int(
        value,
        16
    )


# ==========================================================
# NETWORK VERIFICATION
# ==========================================================

def get_chain_id(
    network: str = DEFAULT_NETWORK
) -> int:

    result = rpc_request(
        "eth_chainId",
        [],
        network
    )

    return hex_to_int(
        result
    )


def verify_network(
    network: str = DEFAULT_NETWORK
) -> bool:

    config = get_network(
        network
    )

    actual_chain_id = get_chain_id(
        network
    )

    expected_chain_id = int(
        config["chain_id"]
    )

    if actual_chain_id != expected_chain_id:

        raise RuntimeError(
            "RPC chain ID mismatch. Expected "
            + str(expected_chain_id)
            + " but received "
            + str(actual_chain_id)
        )

    return True


# ==========================================================
# TRANSACTION FETCHING
# ==========================================================

def get_transaction(
    transaction_hash: str,
    network: str = DEFAULT_NETWORK
) -> dict[str, Any]:

    result = rpc_request(
        "eth_getTransactionByHash",
        [transaction_hash],
        network
    )

    if result is None:
        raise ValueError(
            "Transaction was not found on "
            + network
            + "."
        )

    return result


def get_transaction_receipt(
    transaction_hash: str,
    network: str = DEFAULT_NETWORK
) -> dict[str, Any]:

    result = rpc_request(
        "eth_getTransactionReceipt",
        [transaction_hash],
        network
    )

    if result is None:
        raise ValueError(
            "Transaction receipt was not found on "
            + network
            + "."
        )

    return result


def get_block(
    block_number_hex: str,
    network: str = DEFAULT_NETWORK
) -> dict[str, Any]:

    result = rpc_request(
        "eth_getBlockByNumber",
        [
            block_number_hex,
            False
        ],
        network
    )

    if result is None:
        raise ValueError(
            "Block was not found on "
            + network
            + "."
        )

    return result


# ==========================================================
# LIVE TRANSACTION EVIDENCE
# ==========================================================

def fetch_transaction_evidence(
    transaction_hash: str,
    network: str = DEFAULT_NETWORK
) -> dict[str, Any]:

    tx_hash = str(
        transaction_hash
    ).strip()

    if tx_hash == "":
        raise ValueError(
            "transaction_hash is required"
        )

    config = get_network(
        network
    )

    verify_network(
        network
    )

    transaction = get_transaction(
        tx_hash,
        network
    )

    receipt = get_transaction_receipt(
        tx_hash,
        network
    )

    block_number_hex = transaction.get(
        "blockNumber"
    )

    if not block_number_hex:
        raise ValueError(
            "Transaction has not been included in a block."
        )

    block = get_block(
        block_number_hex,
        network
    )

    receipt_status = hex_to_int(
        receipt.get(
            "status"
        )
    )

    if receipt_status == 1:
        transaction_status = "SUCCESS"
    else:
        transaction_status = "FAILED"

    sender = str(
        transaction.get(
            "from",
            ""
        )
    ).lower()

    recipient = str(
        transaction.get(
            "to",
            ""
        ) or ""
    ).lower()

    value_wei = hex_to_int(
        transaction.get(
            "value"
        )
    )

    block_number = hex_to_int(
        block_number_hex
    )

    timestamp = hex_to_int(
        block.get(
            "timestamp"
        )
    )

    return {
        "evidence_type":
            "ONCHAIN_TRANSACTION",

        "network":
            network.lower(),

        "network_name":
            config["name"],

        "chain_id":
            int(config["chain_id"]),

        "participant":
            sender,

        "chain":
            network.lower(),

        "transaction_hash":
            tx_hash,

        "block_number":
            block_number,

        "timestamp":
            timestamp,

        "transaction_status":
            transaction_status,

        "sender":
            sender,

        "recipient":
            recipient,

        "native_value_wei":
            str(value_wei),

        "input":
            transaction.get(
                "input",
                "0x"
            ),

        "gas":
            str(
                hex_to_int(
                    transaction.get(
                        "gas"
                    )
                )
            ),

        "gas_used":
            str(
                hex_to_int(
                    receipt.get(
                        "gasUsed"
                    )
                )
            ),

        "source":
            config["rpc_url"]
    }


# ==========================================================
# LATEST TRANSACTION HELPER
# ==========================================================

def get_latest_transaction_hash(
    network: str = DEFAULT_NETWORK
) -> str:

    block = rpc_request(
        "eth_getBlockByNumber",
        [
            "latest",
            False
        ],
        network
    )

    if not block:
        raise RuntimeError(
            "Could not retrieve latest block."
        )

    transactions = block.get(
        "transactions",
        []
    )

    if len(transactions) == 0:
        raise RuntimeError(
            "Latest block contains no transactions."
        )

    return str(
        transactions[0]
    )


# ==========================================================
# COMMAND LINE
# ==========================================================

def main() -> None:

    if len(sys.argv) < 2:

        print(
            "ProofFlow Ethereum RPC Adapter"
        )

        print()
        print(
            "Usage:"
        )

        print(
            "python adapters\\ethereum_rpc.py "
            "<transaction_hash> [network]"
        )

        print()
        print(
            "Supported networks:"
        )

        for network_key in NETWORKS:
            print(
                "-",
                network_key
            )

        sys.exit(1)

    transaction_hash = sys.argv[1]

    network = (
        sys.argv[2]
        if len(sys.argv) >= 3
        else DEFAULT_NETWORK
    )

    try:

        evidence = fetch_transaction_evidence(
            transaction_hash,
            network
        )

        print(
            json.dumps(
                evidence,
                indent=2
            )
        )

    except Exception as error:

        print(
            "ERROR:",
            str(error)
        )

        sys.exit(1)


if __name__ == "__main__":
    main()