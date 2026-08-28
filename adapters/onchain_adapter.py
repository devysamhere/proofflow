"""
ProofFlow Onchain Evidence Adapter
v0.2.0

Normalizes live blockchain transaction data into a standard
ProofFlow evidence document.

IMPORTANT:
This adapter does NOT decide whether a participant passes or fails
a campaign requirement.

Its job is only to:
1. Retrieve authoritative blockchain evidence.
2. Normalize that evidence.
3. Produce a standard evidence document.

The GenLayer Intelligent Contract remains responsible for the
trust-critical PASS / FAIL decision through validator consensus.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any

from ethereum_rpc import fetch_transaction_evidence


# ==========================================================
# PROOFFLOW VERSION
# ==========================================================

PROOFFLOW_VERSION = "0.2.0"


# ==========================================================
# NORMALIZED EVIDENCE MODEL
# ==========================================================

@dataclass
class OnchainEvidence:
    evidence_type: str

    participant: str

    chain: str
    chain_id: int

    transaction_hash: str
    block_number: int
    timestamp: int

    transaction_status: str

    sender: str
    recipient: str

    protocol: str
    action: str

    asset: str
    amount: str
    unit: str

    native_value_wei: str

    input: str

    gas: str
    gas_used: str

    source: str


# ==========================================================
# BASIC NORMALIZATION HELPERS
# ==========================================================

def require_text(
    value: Any,
    field_name: str
) -> str:
    """
    Require a non-empty string value.
    """

    if value is None:
        raise ValueError(
            field_name + " is required"
        )

    text = str(value).strip()

    if text == "":
        raise ValueError(
            field_name + " is required"
        )

    return text


def normalize_address(
    value: Any
) -> str:
    """
    Normalize an Ethereum-style address to lowercase.
    """

    if value is None:
        return ""

    return str(value).strip().lower()


def normalize_chain(
    value: Any
) -> str:
    """
    Normalize blockchain/network names.
    """

    chain = require_text(
        value,
        "chain"
    ).lower()

    aliases = {
        "ethereum mainnet": "ethereum",
        "mainnet": "ethereum",
        "eth": "ethereum",

        "ethereum sepolia": "sepolia",
        "eth sepolia": "sepolia",
        "sepolia testnet": "sepolia"
    }

    return aliases.get(
        chain,
        chain
    )


def normalize_status(
    value: Any
) -> str:
    """
    Normalize transaction status.
    """

    status = require_text(
        value,
        "transaction_status"
    ).upper()

    aliases = {
        "1": "SUCCESS",
        "TRUE": "SUCCESS",
        "SUCCEEDED": "SUCCESS",
        "CONFIRMED": "SUCCESS",

        "0": "FAILED",
        "FALSE": "FAILED",
        "REVERTED": "FAILED"
    }

    return aliases.get(
        status,
        status
    )


def normalize_text(
    value: Any
) -> str:
    """
    Normalize optional text.
    """

    if value is None:
        return ""

    return str(value).strip()


# ==========================================================
# TRANSACTION NORMALIZATION
# ==========================================================

def normalize_transaction(
    *,
    participant: Any,
    chain: Any,
    chain_id: Any,
    transaction_hash: Any,
    block_number: Any,
    timestamp: Any,
    transaction_status: Any,
    sender: Any,
    recipient: Any,
    protocol: Any = "",
    action: Any = "",
    asset: Any = "",
    amount: Any = "",
    unit: Any = "",
    native_value_wei: Any = "0",
    input_data: Any = "0x",
    gas: Any = "",
    gas_used: Any = "",
    source: Any = ""
) -> OnchainEvidence:
    """
    Convert transaction data into ProofFlow's canonical
    ONCHAIN_TRANSACTION evidence format.
    """

    normalized_participant = normalize_address(
        participant
    )

    normalized_sender = normalize_address(
        sender
    )

    normalized_recipient = normalize_address(
        recipient
    )

    normalized_chain = normalize_chain(
        chain
    )

    tx_hash = require_text(
        transaction_hash,
        "transaction_hash"
    ).lower()

    try:
        normalized_chain_id = int(
            chain_id
        )
    except (TypeError, ValueError) as error:
        raise ValueError(
            "chain_id must be an integer"
        ) from error

    try:
        normalized_block_number = int(
            block_number
        )
    except (TypeError, ValueError) as error:
        raise ValueError(
            "block_number must be an integer"
        ) from error

    try:
        normalized_timestamp = int(
            timestamp
        )
    except (TypeError, ValueError) as error:
        raise ValueError(
            "timestamp must be an integer"
        ) from error

    if normalized_participant == "":
        normalized_participant = normalized_sender

    return OnchainEvidence(
        evidence_type="ONCHAIN_TRANSACTION",

        participant=normalized_participant,

        chain=normalized_chain,
        chain_id=normalized_chain_id,

        transaction_hash=tx_hash,
        block_number=normalized_block_number,
        timestamp=normalized_timestamp,

        transaction_status=normalize_status(
            transaction_status
        ),

        sender=normalized_sender,
        recipient=normalized_recipient,

        protocol=normalize_text(
            protocol
        ).lower(),

        action=normalize_text(
            action
        ).lower(),

        asset=normalize_text(
            asset
        ),

        amount=normalize_text(
            amount
        ),

        unit=normalize_text(
            unit
        ),

        native_value_wei=normalize_text(
            native_value_wei
        ),

        input=normalize_text(
            input_data
        ),

        gas=normalize_text(
            gas
        ),

        gas_used=normalize_text(
            gas_used
        ),

        source=normalize_text(
            source
        )
    )


# ==========================================================
# PROVIDER PAYLOAD NORMALIZATION
# ==========================================================

def from_provider_payload(
    payload: dict[str, Any]
) -> OnchainEvidence:
    """
    Normalize a provider/RPC evidence payload.
    """

    if not isinstance(
        payload,
        dict
    ):
        raise ValueError(
            "Provider payload must be an object."
        )

    return normalize_transaction(
        participant=payload.get(
            "participant",
            payload.get(
                "sender",
                ""
            )
        ),

        chain=payload.get(
            "chain",
            payload.get(
                "network",
                ""
            )
        ),

        chain_id=payload.get(
            "chain_id",
            0
        ),

        transaction_hash=payload.get(
            "transaction_hash",
            ""
        ),

        block_number=payload.get(
            "block_number",
            0
        ),

        timestamp=payload.get(
            "timestamp",
            0
        ),

        transaction_status=payload.get(
            "transaction_status",
            ""
        ),

        sender=payload.get(
            "sender",
            ""
        ),

        recipient=payload.get(
            "recipient",
            ""
        ),

        protocol=payload.get(
            "protocol",
            ""
        ),

        action=payload.get(
            "action",
            ""
        ),

        asset=payload.get(
            "asset",
            ""
        ),

        amount=payload.get(
            "amount",
            ""
        ),

        unit=payload.get(
            "unit",
            ""
        ),

        native_value_wei=payload.get(
            "native_value_wei",
            "0"
        ),

        input_data=payload.get(
            "input",
            "0x"
        ),

        gas=payload.get(
            "gas",
            ""
        ),

        gas_used=payload.get(
            "gas_used",
            ""
        ),

        source=payload.get(
            "source",
            ""
        )
    )


# ==========================================================
# LIVE ETHEREUM / SEPOLIA EVIDENCE
# ==========================================================

def from_live_transaction(
    transaction_hash: str,
    network: str = "sepolia"
) -> OnchainEvidence:
    """
    Fetch a real blockchain transaction through the
    ProofFlow Ethereum RPC adapter and normalize it.

    Sepolia is the default development network.
    """

    raw_evidence = fetch_transaction_evidence(
        transaction_hash,
        network
    )

    return from_provider_payload(
        raw_evidence
    )


# ==========================================================
# EVIDENCE DOCUMENT
# ==========================================================

def build_evidence_document(
    evidence: OnchainEvidence
) -> dict[str, Any]:
    """
    Wrap normalized evidence in ProofFlow's standard
    evidence document.
    """

    return {
        "proof_flow_version":
            PROOFFLOW_VERSION,

        "evidence":
            asdict(
                evidence
            )
    }


def evidence_document_json(
    evidence: OnchainEvidence
) -> str:
    """
    Return a formatted JSON representation of the
    ProofFlow evidence document.
    """

    return json.dumps(
        build_evidence_document(
            evidence
        ),
        indent=2
    )


# ==========================================================
# LIVE TRANSACTION DOCUMENT
# ==========================================================

def build_live_transaction_document(
    transaction_hash: str,
    network: str = "sepolia"
) -> dict[str, Any]:
    """
    Complete ProofFlow evidence pipeline:

    blockchain
        ->
    Ethereum RPC adapter
        ->
    normalized evidence
        ->
    ProofFlow evidence document
    """

    evidence = from_live_transaction(
        transaction_hash,
        network
    )

    return build_evidence_document(
        evidence
    )


# ==========================================================
# DEVELOPMENT DEMO
# ==========================================================

def development_demo() -> dict[str, Any]:
    """
    Local example used when no transaction hash is supplied.
    """

    payload = {
        "participant":
            "0x24199034c9cede510b35f37471d553f25c84e9eb",

        "chain":
            "sepolia",

        "chain_id":
            11155111,

        "transaction_hash":
            "0xproofflow-development-demo",

        "block_number":
            123456,

        "timestamp":
            1787890000,

        "transaction_status":
            "SUCCESS",

        "sender":
            "0x24199034c9cede510b35f37471d553f25c84e9eb",

        "recipient":
            "0x1111111111111111111111111111111111111111",

        "protocol":
            "uniswap",

        "action":
            "swap",

        "asset":
            "USDC",

        "amount":
            "150",

        "unit":
            "USD",

        "native_value_wei":
            "0",

        "input":
            "0x",

        "gas":
            "100000",

        "gas_used":
            "50000",

        "source":
            "proofflow-development-demo"
    }

    evidence = from_provider_payload(
        payload
    )

    return build_evidence_document(
        evidence
    )


# ==========================================================
# COMMAND LINE
# ==========================================================

def main() -> None:
    """
    Usage:

    Development demo:
        python adapters\\onchain_adapter.py

    Live Sepolia transaction:
        python adapters\\onchain_adapter.py <tx_hash>

    Explicit network:
        python adapters\\onchain_adapter.py <tx_hash> sepolia

        python adapters\\onchain_adapter.py <tx_hash> ethereum
    """

    try:

        if len(sys.argv) == 1:

            document = development_demo()

        else:

            transaction_hash = sys.argv[1]

            network = (
                sys.argv[2]
                if len(sys.argv) >= 3
                else "sepolia"
            )

            document = build_live_transaction_document(
                transaction_hash,
                network
            )

        print(
            json.dumps(
                document,
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