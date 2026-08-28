"""
ProofFlow Evidence Builder
v0.1.0

Builds the final evidence document consumed by the
ProofFlow GenLayer Intelligent Contract.

Pipeline:

Blockchain
    ->
Ethereum RPC
    ->
Normalized Evidence
    ->
Transaction Interpretation
    ->
ProofFlow Verification Evidence

IMPORTANT:
This module does NOT decide PASS or FAIL.

It packages verifiable facts. GenLayer validators independently
evaluate those facts against the campaign requirement.
"""

from __future__ import annotations

import json
import sys
from typing import Any

from onchain_adapter import build_live_transaction_document
from transaction_interpreter import interpret_evidence_document


PROOFFLOW_EVIDENCE_VERSION = "0.1.0"


# ==========================================================
# BUILD FINAL EVIDENCE
# ==========================================================

def build_verification_evidence(
    transaction_hash: str,
    network: str = "sepolia"
) -> dict[str, Any]:
    """
    Fetch and interpret a live blockchain transaction,
    then produce the final ProofFlow verification evidence.
    """

    normalized_document = build_live_transaction_document(
        transaction_hash,
        network
    )

    interpreted_document = interpret_evidence_document(
        normalized_document
    )

    evidence = interpreted_document[
        "evidence"
    ]

    interpretation = interpreted_document[
        "interpretation"
    ]

    return {
        "proof_flow_evidence_version":
            PROOFFLOW_EVIDENCE_VERSION,

        "evidence_type":
            "ONCHAIN_ACTION",

        "source_type":
            "LIVE_BLOCKCHAIN_RPC",

        "network":
            evidence.get(
                "chain",
                network
            ),

        "chain_id":
            evidence.get(
                "chain_id",
                0
            ),

        "participant":
            evidence.get(
                "participant",
                ""
            ),

        "transaction": {
            "hash":
                evidence.get(
                    "transaction_hash",
                    ""
                ),

            "status":
                evidence.get(
                    "transaction_status",
                    ""
                ),

            "block_number":
                evidence.get(
                    "block_number",
                    0
                ),

            "timestamp":
                evidence.get(
                    "timestamp",
                    0
                ),

            "sender":
                evidence.get(
                    "sender",
                    ""
                ),

            "recipient":
                evidence.get(
                    "recipient",
                    ""
                ),

            "native_value_wei":
                evidence.get(
                    "native_value_wei",
                    "0"
                ),

            "function_selector":
                interpretation.get(
                    "function_selector",
                    ""
                ),

            "gas":
                evidence.get(
                    "gas",
                    ""
                ),

            "gas_used":
                evidence.get(
                    "gas_used",
                    ""
                ),
        },

        "interpretation": {
            "action":
                interpretation.get(
                    "action",
                    ""
                ),

            "standard":
                interpretation.get(
                    "standard",
                    ""
                ),

            "detected_standards":
                interpretation.get(
                    "detected_standards",
                    []
                ),
        },

        "erc20_transfers":
            interpretation.get(
                "erc20_transfers",
                []
            ),

        "evidence_sources": [
            {
                "type":
                    "JSON_RPC",

                "url":
                    evidence.get(
                        "source",
                        ""
                    ),

                "network":
                    evidence.get(
                        "chain",
                        network
                    ),

                "chain_id":
                    evidence.get(
                        "chain_id",
                        0
                    ),
            }
        ],

        "verification_note":
            (
                "This document contains extracted blockchain "
                "facts only. It does not determine campaign "
                "eligibility. ProofFlow's GenLayer validators "
                "must independently evaluate this evidence "
                "against the campaign requirement."
            ),
    }


# ==========================================================
# JSON OUTPUT
# ==========================================================

def build_verification_evidence_json(
    transaction_hash: str,
    network: str = "sepolia"
) -> str:

    document = build_verification_evidence(
        transaction_hash,
        network
    )

    return json.dumps(
        document,
        indent=2
    )


# ==========================================================
# SAVE EVIDENCE
# ==========================================================

def save_verification_evidence(
    transaction_hash: str,
    output_path: str,
    network: str = "sepolia"
) -> str:
    """
    Build and save evidence to a JSON file.
    """

    document = build_verification_evidence(
        transaction_hash,
        network
    )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            document,
            file,
            indent=2
        )

    return output_path


# ==========================================================
# COMMAND LINE
# ==========================================================

def main() -> None:

    if len(sys.argv) < 2:

        print(
            "ProofFlow Evidence Builder"
        )

        print()

        print(
            "Usage:"
        )

        print(
            "python adapters\\evidence_builder.py "
            "<transaction_hash> [network]"
        )

        sys.exit(1)

    transaction_hash = sys.argv[1]

    network = (
        sys.argv[2]
        if len(sys.argv) >= 3
        else "sepolia"
    )

    try:

        document = build_verification_evidence(
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