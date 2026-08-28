"""
ProofFlow Onchain Evidence Adapter
v0.1.0

Normalizes blockchain transaction data into a predictable
evidence format that can be evaluated by the ProofFlow
GenLayer Intelligent Contract.

This adapter does NOT decide whether a campaign passes.
It only prepares evidence. GenLayer validators make the
trust-critical PASS / FAIL decision through consensus.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any
import json


# ==========================================================
# NORMALIZED EVIDENCE MODEL
# ==========================================================

@dataclass
class OnchainEvidence:
    evidence_type: str

    participant: str
    chain: str

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

    source: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(
            self.to_dict(),
            indent=2
        )


# ==========================================================
# VALIDATION HELPERS
# ==========================================================

def require_text(
    value: Any,
    field_name: str
) -> str:

    text = str(
        value if value is not None else ""
    ).strip()

    if text == "":
        raise ValueError(
            f"{field_name} is required"
        )

    return text


def normalize_address(
    value: Any
) -> str:

    return require_text(
        value,
        "address"
    ).lower()


def normalize_chain(
    value: Any
) -> str:

    return require_text(
        value,
        "chain"
    ).lower()


def normalize_status(
    value: Any
) -> str:

    text = require_text(
        value,
        "transaction_status"
    ).lower()

    success_values = {
        "success",
        "successful",
        "confirmed",
        "1",
        "true"
    }

    failed_values = {
        "failed",
        "failure",
        "reverted",
        "0",
        "false"
    }

    if text in success_values:
        return "SUCCESS"

    if text in failed_values:
        return "FAILED"

    return text.upper()


# ==========================================================
# TRANSACTION NORMALIZER
# ==========================================================

def normalize_transaction(
    *,
    participant: str,
    chain: str,
    transaction_hash: str,
    block_number: int,
    timestamp: int,
    transaction_status: str,
    sender: str,
    recipient: str,
    protocol: str,
    action: str,
    asset: str,
    amount: str,
    unit: str,
    source: str
) -> OnchainEvidence:
    """
    Convert blockchain transaction information into
    ProofFlow's normalized evidence format.
    """

    participant_address = normalize_address(
        participant
    )

    sender_address = normalize_address(
        sender
    )

    recipient_address = normalize_address(
        recipient
    )

    if block_number < 0:
        raise ValueError(
            "block_number cannot be negative"
        )

    if timestamp < 0:
        raise ValueError(
            "timestamp cannot be negative"
        )

    return OnchainEvidence(
        evidence_type="ONCHAIN_TRANSACTION",

        participant=participant_address,
        chain=normalize_chain(
            chain
        ),

        transaction_hash=require_text(
            transaction_hash,
            "transaction_hash"
        ),

        block_number=int(
            block_number
        ),

        timestamp=int(
            timestamp
        ),

        transaction_status=normalize_status(
            transaction_status
        ),

        sender=sender_address,
        recipient=recipient_address,

        protocol=require_text(
            protocol,
            "protocol"
        ).lower(),

        action=require_text(
            action,
            "action"
        ).lower(),

        asset=require_text(
            asset,
            "asset"
        ).upper(),

        amount=require_text(
            amount,
            "amount"
        ),

        unit=require_text(
            unit,
            "unit"
        ).upper(),

        source=require_text(
            source,
            "source"
        )
    )


# ==========================================================
# GENERIC PROVIDER PAYLOAD
# ==========================================================

def from_provider_payload(
    payload: dict[str, Any]
) -> OnchainEvidence:
    """
    Normalize an already-decoded blockchain provider
    response.

    Keeping this function provider-neutral allows
    ProofFlow to support multiple RPC/indexing providers
    later without changing the Intelligent Contract.
    """

    return normalize_transaction(
        participant=payload.get(
            "participant",
            payload.get("sender", "")
        ),

        chain=payload.get(
            "chain",
            ""
        ),

        transaction_hash=payload.get(
            "transaction_hash",
            payload.get("tx_hash", "")
        ),

        block_number=int(
            payload.get(
                "block_number",
                0
            )
        ),

        timestamp=int(
            payload.get(
                "timestamp",
                0
            )
        ),

        transaction_status=str(
            payload.get(
                "transaction_status",
                payload.get(
                    "status",
                    ""
                )
            )
        ),

        sender=payload.get(
            "sender",
            payload.get("from", "")
        ),

        recipient=payload.get(
            "recipient",
            payload.get("to", "")
        ),

        protocol=payload.get(
            "protocol",
            "unknown"
        ),

        action=payload.get(
            "action",
            "transaction"
        ),

        asset=payload.get(
            "asset",
            "UNKNOWN"
        ),

        amount=str(
            payload.get(
                "amount",
                "0"
            )
        ),

        unit=payload.get(
            "unit",
            "UNKNOWN"
        ),

        source=payload.get(
            "source",
            "blockchain-provider"
        )
    )


# ==========================================================
# EVIDENCE DOCUMENT
# ==========================================================

def build_evidence_document(
    evidence: OnchainEvidence
) -> dict[str, Any]:
    """
    Build the document that can be published to an
    evidence endpoint and consumed by ProofFlow.
    """

    return {
        "proof_flow_version": "0.1.0",
        "evidence": evidence.to_dict()
    }


def evidence_document_json(
    evidence: OnchainEvidence
) -> str:

    return json.dumps(
        build_evidence_document(
            evidence
        ),
        indent=2
    )


# ==========================================================
# DEVELOPMENT DEMO
# ==========================================================

if __name__ == "__main__":

    demo_payload = {
        "participant":
            "0x24199034c9cede510b35f37471d553f25c84e9eb",

        "chain":
            "ethereum",

        "transaction_hash":
            "0xprooflow-demo-transaction",

        "block_number":
            123456,

        "timestamp":
            1787890000,

        "transaction_status":
            "success",

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

        "source":
            "prooflow-development-demo"
    }

    normalized = from_provider_payload(
        demo_payload
    )

    print(
        evidence_document_json(
            normalized
        )
    )