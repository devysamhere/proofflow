"""
ProofFlow Transaction Interpreter
v0.1.0

Interprets normalized blockchain transaction evidence.

IMPORTANT:
This module does NOT determine whether a participant
passes or fails a ProofFlow campaign.

It extracts and classifies observable transaction facts.
The GenLayer Intelligent Contract remains responsible
for the final trust-critical decision through consensus.
"""

from __future__ import annotations

import json
import sys
from typing import Any


# ==========================================================
# KNOWN CONTRACTS
# ==========================================================

# We will expand this registry as ProofFlow adds protocols.
KNOWN_CONTRACTS: dict[str, dict[str, str]] = {}


# ==========================================================
# KNOWN FUNCTION SELECTORS
# ==========================================================

# First 4 bytes of calldata identify many contract functions.
#
# We intentionally begin with a small registry and expand it
# using verified protocol contracts during development.

KNOWN_SELECTORS: dict[str, dict[str, str]] = {
    "0xa9059cbb": {
        "action": "transfer",
        "standard": "ERC20",
    },

    "0x095ea7b3": {
        "action": "approve",
        "standard": "ERC20",
    },

    "0x23b872dd": {
        "action": "transferFrom",
        "standard": "ERC20",
    },
}


# ==========================================================
# HELPERS
# ==========================================================

def normalize_address(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip().lower()


def normalize_hex(value: Any) -> str:
    if value is None:
        return "0x"

    text = str(value).strip().lower()

    if text == "":
        return "0x"

    if not text.startswith("0x"):
        text = "0x" + text

    return text


def get_function_selector(
    input_data: Any
) -> str:
    """
    Return the first four bytes of transaction calldata.

    Example:
        0xa9059cbb...
             ↓
        0xa9059cbb
    """

    calldata = normalize_hex(
        input_data
    )

    if calldata == "0x":
        return ""

    if len(calldata) < 10:
        return ""

    return calldata[:10]


# ==========================================================
# CONTRACT CLASSIFICATION
# ==========================================================

def identify_contract(
    recipient: Any
) -> dict[str, str]:
    """
    Identify a known destination contract.

    Unknown contracts remain UNKNOWN rather than being
    guessed.
    """

    address = normalize_address(
        recipient
    )

    contract = KNOWN_CONTRACTS.get(
        address
    )

    if contract is None:
        return {
            "contract_address": address,
            "protocol": "",
            "contract_name": "",
        }

    return {
        "contract_address": address,
        "protocol": contract.get(
            "protocol",
            ""
        ),
        "contract_name": contract.get(
            "name",
            ""
        ),
    }


# ==========================================================
# FUNCTION CLASSIFICATION
# ==========================================================

def identify_function(
    input_data: Any
) -> dict[str, str]:
    """
    Identify a known function selector.

    Unknown selectors are preserved instead of guessed.
    """

    selector = get_function_selector(
        input_data
    )

    if selector == "":
        return {
            "function_selector": "",
            "action": "native_transfer",
            "standard": "NATIVE",
        }

    known = KNOWN_SELECTORS.get(
        selector
    )

    if known is None:
        return {
            "function_selector": selector,
            "action": "",
            "standard": "",
        }

    return {
        "function_selector": selector,
        "action": known.get(
            "action",
            ""
        ),
        "standard": known.get(
            "standard",
            ""
        ),
    }


# ==========================================================
# INTERPRETER
# ==========================================================

def interpret_transaction(
    evidence: dict[str, Any]
) -> dict[str, Any]:
    """
    Interpret observable facts from normalized ProofFlow
    transaction evidence.

    This function deliberately avoids making eligibility
    or PASS/FAIL decisions.
    """

    if not isinstance(
        evidence,
        dict
    ):
        raise ValueError(
            "evidence must be an object"
        )

    recipient = evidence.get(
        "recipient",
        ""
    )

    input_data = evidence.get(
        "input",
        "0x"
    )

    contract_info = identify_contract(
        recipient
    )

    function_info = identify_function(
        input_data
    )

    native_value_wei = str(
        evidence.get(
            "native_value_wei",
            "0"
        )
    )

    interpretation = {
        "transaction_hash":
            evidence.get(
                "transaction_hash",
                ""
            ),

        "chain":
            evidence.get(
                "chain",
                ""
            ),

        "chain_id":
            evidence.get(
                "chain_id",
                0
            ),

        "participant":
            normalize_address(
                evidence.get(
                    "participant",
                    ""
                )
            ),

        "sender":
            normalize_address(
                evidence.get(
                    "sender",
                    ""
                )
            ),

        "recipient":
            normalize_address(
                recipient
            ),

        "transaction_status":
            evidence.get(
                "transaction_status",
                ""
            ),

        "native_value_wei":
            native_value_wei,

        "function_selector":
            function_info[
                "function_selector"
            ],

        "protocol":
            contract_info[
                "protocol"
            ],

        "contract_name":
            contract_info[
                "contract_name"
            ],

        "action":
            function_info[
                "action"
            ],

        "standard":
            function_info[
                "standard"
            ],
    }

    return interpretation


# ==========================================================
# FULL DOCUMENT INTERPRETATION
# ==========================================================

def interpret_evidence_document(
    document: dict[str, Any]
) -> dict[str, Any]:
    """
    Interpret a complete ProofFlow evidence document.
    """

    if not isinstance(
        document,
        dict
    ):
        raise ValueError(
            "ProofFlow document must be an object."
        )

    evidence = document.get(
        "evidence"
    )

    if not isinstance(
        evidence,
        dict
    ):
        raise ValueError(
            "ProofFlow document does not contain evidence."
        )

    interpretation = interpret_transaction(
        evidence
    )

    return {
        "proof_flow_version":
            document.get(
                "proof_flow_version",
                ""
            ),

        "evidence":
            evidence,

        "interpretation":
            interpretation,
    }


# ==========================================================
# COMMAND LINE TEST
# ==========================================================

def main() -> None:
    """
    Reads a ProofFlow evidence JSON document from stdin.

    Example:

    python adapters\\onchain_adapter.py <tx> sepolia |
    python adapters\\transaction_interpreter.py
    """

    try:
        raw_input = sys.stdin.read()

        if raw_input.strip() == "":
            raise ValueError(
                "No ProofFlow evidence was provided through stdin."
            )

        document = json.loads(
            raw_input
        )

        interpreted = interpret_evidence_document(
            document
        )

        print(
            json.dumps(
                interpreted,
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