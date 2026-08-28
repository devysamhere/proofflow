"""
ProofFlow Transaction Interpreter
v0.2.0

Interprets normalized blockchain transaction evidence and
extracts observable facts from transaction receipts.

Current capabilities:
- Function selector detection
- Native transaction classification
- ERC-20 Transfer event detection
- ERC-20 sender / receiver extraction
- ERC-20 raw amount extraction
- Token name lookup
- Token symbol lookup
- Token decimals lookup
- Human-readable token amount calculation

IMPORTANT:
This module does NOT decide whether a participant passes
or fails a ProofFlow campaign.

It extracts observable facts from authoritative blockchain
data. The GenLayer Intelligent Contract remains responsible
for the trust-critical PASS / FAIL decision through validator
consensus.
"""

from __future__ import annotations

import json
import sys
from decimal import Decimal, getcontext
from typing import Any

from ethereum_rpc import rpc_request


# ==========================================================
# CONFIGURATION
# ==========================================================

PROOFFLOW_INTERPRETER_VERSION = "0.2.0"

getcontext().prec = 78


# ==========================================================
# ETHEREUM SIGNATURES
# ==========================================================

ERC20_TRANSFER_TOPIC = (
    "0xddf252ad1be2c89b69c2b068fc378daa"
    "952ba7f163c4a11628f55a4df523b3ef"
)

ERC20_NAME_SELECTOR = "0x06fdde03"
ERC20_SYMBOL_SELECTOR = "0x95d89b41"
ERC20_DECIMALS_SELECTOR = "0x313ce567"


# ==========================================================
# KNOWN FUNCTION SELECTORS
# ==========================================================

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
# BASIC HELPERS
# ==========================================================

def normalize_address(
    value: Any
) -> str:
    if value is None:
        return ""

    return str(value).strip().lower()


def normalize_hex(
    value: Any
) -> str:
    if value is None:
        return "0x"

    text = str(value).strip().lower()

    if text == "":
        return "0x"

    if not text.startswith("0x"):
        text = "0x" + text

    return text


def hex_to_int(
    value: Any
) -> int:
    if value is None:
        return 0

    text = str(value).strip()

    if text == "":
        return 0

    return int(
        text,
        16
    )


# ==========================================================
# FUNCTION SELECTOR
# ==========================================================

def get_function_selector(
    input_data: Any
) -> str:

    calldata = normalize_hex(
        input_data
    )

    if calldata == "0x":
        return ""

    if len(calldata) < 10:
        return ""

    return calldata[:10]


def identify_function(
    input_data: Any
) -> dict[str, str]:

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
        "function_selector":
            selector,

        "action":
            known.get(
                "action",
                ""
            ),

        "standard":
            known.get(
                "standard",
                ""
            ),
    }


# ==========================================================
# ABI STRING DECODING
# ==========================================================

def decode_abi_string(
    encoded: Any
) -> str:
    """
    Decode a standard ABI dynamic string returned by
    eth_call.

    Also includes support for bytes32-style token metadata.
    """

    data = normalize_hex(
        encoded
    )

    if data == "0x":
        return ""

    hex_data = data[2:]

    if len(hex_data) < 64:
        return ""

    try:

        first_word = int(
            hex_data[:64],
            16
        )

        # Standard dynamic ABI string.
        if first_word == 32:

            if len(hex_data) < 128:
                return ""

            string_length = int(
                hex_data[64:128],
                16
            )

            start = 128
            end = start + (
                string_length * 2
            )

            if end > len(hex_data):
                return ""

            raw = bytes.fromhex(
                hex_data[start:end]
            )

            return raw.decode(
                "utf-8",
                errors="replace"
            ).strip(
                "\x00"
            )

        # Some older ERC-20 contracts return bytes32.
        raw = bytes.fromhex(
            hex_data[:64]
        )

        return raw.rstrip(
            b"\x00"
        ).decode(
            "utf-8",
            errors="replace"
        )

    except (
        ValueError,
        UnicodeDecodeError
    ):
        return ""


# ==========================================================
# TOKEN METADATA
# ==========================================================

def token_eth_call(
    token_address: str,
    selector: str,
    network: str
) -> str:

    result = rpc_request(
        "eth_call",
        [
            {
                "to":
                    token_address,

                "data":
                    selector,
            },
            "latest"
        ],
        network
    )

    if result is None:
        return "0x"

    return str(
        result
    )


def get_token_name(
    token_address: str,
    network: str
) -> str:

    try:

        result = token_eth_call(
            token_address,
            ERC20_NAME_SELECTOR,
            network
        )

        return decode_abi_string(
            result
        )

    except Exception:
        return ""


def get_token_symbol(
    token_address: str,
    network: str
) -> str:

    try:

        result = token_eth_call(
            token_address,
            ERC20_SYMBOL_SELECTOR,
            network
        )

        return decode_abi_string(
            result
        )

    except Exception:
        return ""


def get_token_decimals(
    token_address: str,
    network: str
) -> int | None:

    try:

        result = token_eth_call(
            token_address,
            ERC20_DECIMALS_SELECTOR,
            network
        )

        if not result or result == "0x":
            return None

        return hex_to_int(
            result
        )

    except Exception:
        return None


def get_token_metadata(
    token_address: str,
    network: str
) -> dict[str, Any]:

    return {
        "name":
            get_token_name(
                token_address,
                network
            ),

        "symbol":
            get_token_symbol(
                token_address,
                network
            ),

        "decimals":
            get_token_decimals(
                token_address,
                network
            ),
    }


# ==========================================================
# EVENT HELPERS
# ==========================================================

def topic_to_address(
    topic: Any
) -> str:
    """
    Convert a 32-byte indexed address topic into a normal
    Ethereum address.
    """

    normalized = normalize_hex(
        topic
    )

    hex_data = normalized[2:]

    if len(hex_data) != 64:
        return ""

    return (
        "0x"
        + hex_data[-40:]
    ).lower()


def calculate_token_amount(
    raw_amount: int,
    decimals: int | None
) -> str:

    if decimals is None:
        return str(
            raw_amount
        )

    divisor = Decimal(
        10
    ) ** Decimal(
        decimals
    )

    amount = Decimal(
        raw_amount
    ) / divisor

    formatted = format(
        amount,
        "f"
    )

    if "." in formatted:

        formatted = formatted.rstrip(
            "0"
        ).rstrip(
            "."
        )

    if formatted == "":
        return "0"

    return formatted


# ==========================================================
# ERC-20 TRANSFER DECODER
# ==========================================================

def decode_erc20_transfer_log(
    log: dict[str, Any],
    network: str
) -> dict[str, Any] | None:
    """
    Decode a standard ERC-20 Transfer event.

    Transfer(address indexed from,
             address indexed to,
             uint256 value)
    """

    topics = log.get(
        "topics",
        []
    )

    if not isinstance(
        topics,
        list
    ):
        return None

    if len(topics) < 3:
        return None

    topic_zero = normalize_hex(
        topics[0]
    )

    if topic_zero != ERC20_TRANSFER_TOPIC:
        return None

    token_address = normalize_address(
        log.get(
            "address",
            ""
        )
    )

    sender = topic_to_address(
        topics[1]
    )

    receiver = topic_to_address(
        topics[2]
    )

    raw_amount = hex_to_int(
        log.get(
            "data",
            "0x0"
        )
    )

    metadata = get_token_metadata(
        token_address,
        network
    )

    decimals = metadata.get(
        "decimals"
    )

    amount = calculate_token_amount(
        raw_amount,
        decimals
    )

    return {
        "event":
            "Transfer",

        "standard":
            "ERC20",

        "token_address":
            token_address,

        "token_name":
            metadata.get(
                "name",
                ""
            ),

        "token_symbol":
            metadata.get(
                "symbol",
                ""
            ),

        "token_decimals":
            decimals,

        "from":
            sender,

        "to":
            receiver,

        "raw_amount":
            str(
                raw_amount
            ),

        "amount":
            amount,

        "unit":
            metadata.get(
                "symbol",
                ""
            ),

        "log_index":
            hex_to_int(
                log.get(
                    "logIndex",
                    "0x0"
                )
            ),
    }


# ==========================================================
# RECEIPT INTERPRETATION
# ==========================================================

def get_transaction_receipt(
    transaction_hash: str,
    network: str
) -> dict[str, Any]:

    receipt = rpc_request(
        "eth_getTransactionReceipt",
        [
            transaction_hash
        ],
        network
    )

    if receipt is None:
        raise ValueError(
            "Transaction receipt was not found."
        )

    return receipt


def extract_erc20_transfers(
    transaction_hash: str,
    network: str
) -> list[dict[str, Any]]:

    receipt = get_transaction_receipt(
        transaction_hash,
        network
    )

    logs = receipt.get(
        "logs",
        []
    )

    if not isinstance(
        logs,
        list
    ):
        return []

    transfers: list[
        dict[str, Any]
    ] = []

    for log in logs:

        if not isinstance(
            log,
            dict
        ):
            continue

        decoded = decode_erc20_transfer_log(
            log,
            network
        )

        if decoded is not None:
            transfers.append(
                decoded
            )

    return transfers


# ==========================================================
# TRANSACTION INTERPRETER
# ==========================================================

def interpret_transaction(
    evidence: dict[str, Any]
) -> dict[str, Any]:

    if not isinstance(
        evidence,
        dict
    ):
        raise ValueError(
            "evidence must be an object"
        )

    transaction_hash = str(
        evidence.get(
            "transaction_hash",
            ""
        )
    ).strip()

    if transaction_hash == "":
        raise ValueError(
            "transaction_hash is required"
        )

    network = str(
        evidence.get(
            "chain",
            "sepolia"
        )
    ).strip().lower()

    input_data = evidence.get(
        "input",
        "0x"
    )

    function_info = identify_function(
        input_data
    )

    erc20_transfers = extract_erc20_transfers(
        transaction_hash,
        network
    )

    detected_standards: list[str] = []

    if len(erc20_transfers) > 0:
        detected_standards.append(
            "ERC20"
        )

    interpreted_action = function_info[
        "action"
    ]

    interpreted_standard = function_info[
        "standard"
    ]

    # A transaction may call an unknown router/contract while
    # still producing authoritative ERC-20 Transfer events.
    #
    # We can safely state that token transfers occurred without
    # guessing which higher-level protocol action caused them.
    if (
        len(erc20_transfers) > 0
        and interpreted_standard == ""
    ):
        interpreted_standard = "ERC20"

    return {
        "interpreter_version":
            PROOFFLOW_INTERPRETER_VERSION,

        "transaction_hash":
            transaction_hash,

        "chain":
            network,

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
                evidence.get(
                    "recipient",
                    ""
                )
            ),

        "transaction_status":
            evidence.get(
                "transaction_status",
                ""
            ),

        "native_value_wei":
            str(
                evidence.get(
                    "native_value_wei",
                    "0"
                )
            ),

        "function_selector":
            function_info[
                "function_selector"
            ],

        "action":
            interpreted_action,

        "standard":
            interpreted_standard,

        "detected_standards":
            detected_standards,

        "erc20_transfer_count":
            len(
                erc20_transfers
            ),

        "erc20_transfers":
            erc20_transfers,
    }


# ==========================================================
# FULL PROOFFLOW DOCUMENT
# ==========================================================

def interpret_evidence_document(
    document: dict[str, Any]
) -> dict[str, Any]:

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
# COMMAND LINE
# ==========================================================

def main() -> None:
    """
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