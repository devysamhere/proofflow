/**
 * ProofFlow Public Evidence Worker
 * v0.2.0
 *
 * Public Cloudflare Worker that:
 * 1. Accepts a transaction hash.
 * 2. Reads authoritative blockchain evidence.
 * 3. Extracts transaction facts.
 * 4. Decodes ERC20 Transfer events when present.
 * 5. Returns ProofFlow evidence JSON.
 *
 * IMPORTANT:
 * This Worker does NOT determine PASS or FAIL.
 * GenLayer validators evaluate the campaign requirement.
 */

const VERSION = "0.2.0";

const NETWORKS = {
  sepolia: {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    evidenceApiUrl:
      "https://api.routescan.io/v2/network/testnet/evm/11155111/etherscan/api",
  },

  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
  },
};

const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const SELECTORS = {
  "0xa9059cbb": {
    action: "transfer",
    standard: "ERC20",
  },

  "0x095ea7b3": {
    action: "approve",
    standard: "ERC20",
  },

  "0x23b872dd": {
    action: "transferFrom",
    standard: "ERC20",
  },
};

const TOKEN_CALLS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
};


// ==========================================================
// RESPONSE HELPERS
// ==========================================================

function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          "*",

        "Cache-Control":
          "no-store",
      },
    }
  );
}


// ==========================================================
// ROUTESCAN / JSON-RPC
// ==========================================================

async function routescanProxyRequest(
  config,
  method,
  params = []
) {
  const url =
    new URL(
      config.evidenceApiUrl
    );

  url.searchParams.set(
    "module",
    "proxy"
  );

  url.searchParams.set(
    "action",
    method
  );

  if (
    method ===
      "eth_getTransactionByHash" ||
    method ===
      "eth_getTransactionReceipt"
  ) {
    url.searchParams.set(
      "txhash",
      params[0]
    );

  } else if (
    method ===
    "eth_getBlockByNumber"
  ) {
    url.searchParams.set(
      "tag",
      params[0]
    );

    url.searchParams.set(
      "boolean",
      String(
        params[1] === true
      )
    );

  } else if (
    method ===
    "eth_call"
  ) {
    const call =
      params[0] || {};

    url.searchParams.set(
      "to",
      call.to || ""
    );

    url.searchParams.set(
      "data",
      call.data || "0x"
    );

    url.searchParams.set(
      "tag",
      params[1] || "latest"
    );

  } else {
    throw new Error(
      `Unsupported Routescan proxy method: ${method}`
    );
  }

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          "Accept":
            "application/json",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Routescan HTTP error ${response.status}`
    );
  }

  const payload =
    await response.json();

  if (payload.error) {
    throw new Error(
      payload.error.message ||
      "Routescan returned an error"
    );
  }

  return payload.result;
}


async function rpcRequest(
  network,
  method,
  params = []
) {
  const config =
    NETWORKS[network];

  if (!config) {
    throw new Error(
      `Unsupported network: ${network}`
    );
  }

  if (config.evidenceApiUrl) {
    return await routescanProxyRequest(
      config,
      method,
      params
    );
  }

  const response =
    await fetch(
      config.rpcUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      `RPC HTTP error ${response.status}`
    );
  }

  const payload =
    await response.json();

  if (payload.error) {
    throw new Error(
      payload.error.message ||
      "Ethereum RPC returned an error"
    );
  }

  return payload.result;
}


// ==========================================================
// HEX HELPERS
// ==========================================================

function hexToNumber(value) {
  if (!value) {
    return 0;
  }

  return Number(
    BigInt(value)
  );
}


function topicToAddress(topic) {
  if (
    typeof topic !== "string" ||
    topic.length < 42
  ) {
    return "";
  }

  return (
    "0x" +
    topic.slice(-40)
  ).toLowerCase();
}


function getFunctionSelector(input) {
  if (
    typeof input !== "string" ||
    input.length < 10
  ) {
    return "";
  }

  return input.slice(
    0,
    10
  ).toLowerCase();
}


// ==========================================================
// ABI DECODING
// ==========================================================

function hexToUtf8(hex) {
  try {
    const clean =
      hex.replace(
        /^0x/,
        ""
      );

    let output = "";

    for (
      let i = 0;
      i < clean.length;
      i += 2
    ) {
      const byte =
        parseInt(
          clean.slice(
            i,
            i + 2
          ),
          16
        );

      if (
        byte !== 0 &&
        Number.isFinite(byte)
      ) {
        output +=
          String.fromCharCode(
            byte
          );
      }
    }

    return output.trim();

  } catch {
    return "";
  }
}


function decodeAbiString(value) {
  if (
    !value ||
    value === "0x"
  ) {
    return "";
  }

  try {
    const clean =
      value.replace(
        /^0x/,
        ""
      );

    // Dynamic ABI string
    if (clean.length >= 128) {
      const lengthHex =
        clean.slice(
          64,
          128
        );

      const length =
        Number(
          BigInt(
            "0x" + lengthHex
          )
        );

      const start = 128;

      const end =
        start + length * 2;

      const textHex =
        clean.slice(
          start,
          end
        );

      const decoded =
        hexToUtf8(
          textHex
        );

      if (decoded) {
        return decoded;
      }
    }

    // bytes32 fallback
    return hexToUtf8(
      clean.slice(
        0,
        64
      )
    );

  } catch {
    return "";
  }
}


// ==========================================================
// TOKEN METADATA
// ==========================================================

async function ethCall(
  network,
  tokenAddress,
  data
) {
  try {
    return await rpcRequest(
      network,
      "eth_call",
      [
        {
          to: tokenAddress,
          data,
        },
        "latest",
      ]
    );

  } catch {
    return "0x";
  }
}


async function getTokenMetadata(
  network,
  tokenAddress
) {
  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
  ] = await Promise.all([
    ethCall(
      network,
      tokenAddress,
      TOKEN_CALLS.name
    ),

    ethCall(
      network,
      tokenAddress,
      TOKEN_CALLS.symbol
    ),

    ethCall(
      network,
      tokenAddress,
      TOKEN_CALLS.decimals
    ),
  ]);

  let decimals = 18;

  try {
    if (
      decimalsRaw &&
      decimalsRaw !== "0x"
    ) {
      decimals =
        Number(
          BigInt(
            decimalsRaw
          )
        );
    }

  } catch {
    decimals = 18;
  }

  return {
    name:
      decodeAbiString(
        nameRaw
      ),

    symbol:
      decodeAbiString(
        symbolRaw
      ),

    decimals,
  };
}


// ==========================================================
// TOKEN AMOUNT
// ==========================================================

function formatTokenAmount(
  rawAmount,
  decimals
) {
  try {
    const raw =
      BigInt(rawAmount);

    if (decimals === 0) {
      return raw.toString();
    }

    const divisor =
      10n ** BigInt(decimals);

    const whole =
      raw / divisor;

    const fraction =
      raw % divisor;

    let fractionText =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    if (!fractionText) {
      return whole.toString();
    }

    return (
      `${whole}.${fractionText}`
    );

  } catch {
    return "";
  }
}


// ==========================================================
// ERC20 TRANSFER DECODER
// ==========================================================

async function decodeTransferLogs(
  network,
  receipt
) {
  const logs =
    Array.isArray(receipt.logs)
      ? receipt.logs
      : [];

  const transferLogs =
    logs.filter(
      (log) =>
        Array.isArray(log.topics) &&
        log.topics.length >= 3 &&
        String(
          log.topics[0]
        ).toLowerCase() ===
          ERC20_TRANSFER_TOPIC
    );

  const transfers = [];

  for (
    const log of transferLogs
  ) {
    const tokenAddress =
      String(
        log.address || ""
      ).toLowerCase();

    const metadata =
      await getTokenMetadata(
        network,
        tokenAddress
      );

    let rawAmount = "0";

    try {
      rawAmount =
        BigInt(
          log.data || "0x0"
        ).toString();

    } catch {
      rawAmount = "0";
    }

    transfers.push({
      event:
        "Transfer",

      standard:
        "ERC20",

      token_address:
        tokenAddress,

      token_name:
        metadata.name,

      token_symbol:
        metadata.symbol,

      token_decimals:
        metadata.decimals,

      from:
        topicToAddress(
          log.topics[1]
        ),

      to:
        topicToAddress(
          log.topics[2]
        ),

      raw_amount:
        rawAmount,

      amount:
        formatTokenAmount(
          rawAmount,
          metadata.decimals
        ),

      unit:
        metadata.symbol,

      log_index:
        hexToNumber(
          log.logIndex
        ),
    });
  }

  return transfers;
}


// ==========================================================
// BUILD PROOFFLOW EVIDENCE
// ==========================================================

async function buildEvidence(
  transactionHash,
  network
) {
  const config =
    NETWORKS[network];

  if (!config) {
    throw new Error(
      `Unsupported network: ${network}`
    );
  }

  const [
    transaction,
    receipt,
  ] = await Promise.all([
    rpcRequest(
      network,
      "eth_getTransactionByHash",
      [
        transactionHash,
      ]
    ),

    rpcRequest(
      network,
      "eth_getTransactionReceipt",
      [
        transactionHash,
      ]
    ),
  ]);

  if (!transaction) {
    throw new Error(
      "Transaction not found"
    );
  }

  if (!receipt) {
    throw new Error(
      "Transaction receipt not found"
    );
  }

  const block =
    await rpcRequest(
      network,
      "eth_getBlockByNumber",
      [
        transaction.blockNumber,
        false,
      ]
    );

  if (!block) {
    throw new Error(
      "Block not found"
    );
  }

  const selector =
    getFunctionSelector(
      transaction.input || ""
    );

  const selectorInfo =
    SELECTORS[selector] || {
      action: "",
      standard: "",
    };

  const erc20Transfers =
    await decodeTransferLogs(
      network,
      receipt
    );

  const detectedStandards = [];

  if (
    erc20Transfers.length > 0
  ) {
    detectedStandards.push(
      "ERC20"
    );
  }

  let transactionStatus =
    "UNKNOWN";

  if (
    receipt.status === "0x1"
  ) {
    transactionStatus =
      "SUCCESS";
  }

  if (
    receipt.status === "0x0"
  ) {
    transactionStatus =
      "FAILED";
  }

  return {
    proof_flow_evidence_version:
      VERSION,

    evidence_type:
      "ONCHAIN_ACTION",

    source_type:
      network === "sepolia"
        ? "INDEPENDENT_EXPLORER_API"
        : "LIVE_BLOCKCHAIN_RPC",

    network,

    chain_id:
      config.chainId,

    participant:
      String(
        transaction.from || ""
      ).toLowerCase(),

    transaction: {
      hash:
        transactionHash.toLowerCase(),

      status:
        transactionStatus,

      block_number:
        hexToNumber(
          transaction.blockNumber
        ),

      timestamp:
        hexToNumber(
          block.timestamp
        ),

      sender:
        String(
          transaction.from || ""
        ).toLowerCase(),

      recipient:
        String(
          transaction.to || ""
        ).toLowerCase(),

      native_value_wei:
        BigInt(
          transaction.value || "0x0"
        ).toString(),

      function_selector:
        selector,

      gas:
        hexToNumber(
          transaction.gas
        ).toString(),

      gas_used:
        hexToNumber(
          receipt.gasUsed
        ).toString(),
    },

    interpretation: {
      action:
        selectorInfo.action,

      standard:
        selectorInfo.standard,

      detected_standards:
        detectedStandards,
    },

    erc20_transfers:
      erc20Transfers,

    evidence_sources: [
      {
        type:
          config.evidenceApiUrl
            ? "ROUTESCAN_EXPLORER_API"
            : "JSON_RPC",

        url:
          config.evidenceApiUrl ||
          config.rpcUrl,

        network,

        chain_id:
          config.chainId,
      },
    ],

    verification_note:
      (
        "This document contains extracted blockchain facts only. " +
        "It does not determine campaign eligibility. " +
        "ProofFlow's GenLayer validators must independently evaluate " +
        "this evidence against the campaign requirement."
      ),
  };
}


// ==========================================================
// WORKER
// ==========================================================

export default {
  async fetch(request) {
    const url =
      new URL(
        request.url
      );

    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,

          headers: {
            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET, OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type",
          },
        }
      );
    }

    if (
      request.method !== "GET"
    ) {
      return jsonResponse(
        {
          error:
            "method_not_allowed",
        },
        405
      );
    }


    // ======================================================
    // ROOT
    // ======================================================

    if (
      url.pathname === "/"
    ) {
      return jsonResponse({
        service:
          "ProofFlow Public Evidence API",

        version:
          VERSION,

        tagline:
          "Verify actions. Trigger outcomes.",

        endpoints: {
          health:
            "/health",

          evidence:
            (
              "/evidence" +
              "?tx=<transaction_hash>" +
              "&network=sepolia"
            ),
        },

        supported_networks:
          Object.keys(
            NETWORKS
          ),
      });
    }


    // ======================================================
    // HEALTH
    // ======================================================

    if (
      url.pathname ===
      "/health"
    ) {
      return jsonResponse({
        service:
          "ProofFlow Public Evidence API",

        status:
          "ok",

        version:
          VERSION,
      });
    }


    // ======================================================
    // EVIDENCE
    // ======================================================

    if (
      url.pathname ===
      "/evidence"
    ) {
      const transactionHash =
        (
          url.searchParams.get(
            "tx"
          ) || ""
        )
          .trim()
          .toLowerCase();

      const network =
        (
          url.searchParams.get(
            "network"
          ) ||
          "sepolia"
        )
          .trim()
          .toLowerCase();

      if (!transactionHash) {
        return jsonResponse(
          {
            error:
              "tx query parameter is required",
          },
          400
        );
      }

      if (
        !/^0x[0-9a-f]{64}$/.test(
          transactionHash
        )
      ) {
        return jsonResponse(
          {
            error:
              "invalid transaction hash",
          },
          400
        );
      }

      if (!NETWORKS[network]) {
        return jsonResponse(
          {
            error:
              "unsupported network",

            supported_networks:
              Object.keys(
                NETWORKS
              ),
          },
          400
        );
      }

      try {
        const evidence =
          await buildEvidence(
            transactionHash,
            network
          );

        return jsonResponse(
          evidence
        );

      } catch (error) {
        return jsonResponse(
          {
            error:
              "evidence_generation_failed",

            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500
        );
      }
    }

    return jsonResponse(
      {
        error:
          "not_found",
      },
      404
    );
  },
};