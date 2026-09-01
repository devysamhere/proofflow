import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const PROOFFLOW_CONTRACT =
  "0xe6C111eDE3C5a687304503011eff6e9289100B28";

export const PROOFFLOW_EVIDENCE_WORKER =
  "https://proofflow-evidence.floptools.workers.dev";

export const genlayerClient = createClient({
  chain: studionet,
});

export async function getCampaign(campaignId = 1) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_campaign",
    args: [campaignId],
    stateStatus: "accepted",
  });
}

export async function getCampaignCount() {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_campaign_count",
    args: [],
    stateStatus: "accepted",
  });
}

export async function getCampaigns() {
  const rawCount = await getCampaignCount();
  const count = Number(rawCount || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return [];
  }

  const campaigns = [];

  for (let campaignId = 1; campaignId <= count; campaignId += 1) {
    const campaign = await getCampaign(campaignId);

    if (campaign) {
      campaigns.push(campaign);
    }
  }

  return campaigns;
}

export async function connectGenLayerWallet() {
  if (!window.ethereum) {
    throw new Error(
      "No browser wallet detected. Install MetaMask or another compatible wallet."
    );
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet account was selected.");
  }

  const account = accounts[0];

  const client = createClient({
    chain: studionet,
    account,
    provider: window.ethereum,
  });

  return {
    account,
    client,
  };
}

/*
 * ProofFlow disconnects its local application session.
 *
 * Browser wallets such as MetaMask do not expose a universal dapp method
 * for silently revoking site permissions. Users can revoke the site's
 * permission from their wallet if they want to remove it completely.
 */
export function disconnectGenLayerWallet() {
  return {
    account: "",
    client: null,
  };
}

export function normalizeSepoliaTransactionHash(transactionHash) {
  let proof = String(transactionHash || "").trim().toLowerCase();

  if (/^[a-f0-9]{64}$/.test(proof)) {
    proof = `0x${proof}`;
  }

  if (!/^0x[a-f0-9]{64}$/.test(proof)) {
    throw new Error(
      "Enter a valid Sepolia transaction hash containing 64 hexadecimal characters."
    );
  }

  return proof;
}

export async function createCampaign(
  client,
  {
    title,
    description,
    category = "ONCHAIN",
    requirement,
    network = "SEPOLIA",
    startTime = 0,
    endTime = 0,
    outcomeType = "ELIGIBILITY",
    outcomeValue,
    createdAtHint = 0,
  }
) {
  if (!client) {
    throw new Error("Connect a wallet before creating a campaign.");
  }

  const selectedCategory = String(category || "ONCHAIN")
    .trim()
    .toUpperCase();

  const selectedNetwork = String(network || "SEPOLIA")
    .trim()
    .toUpperCase();

  if (selectedCategory !== "ONCHAIN") {
    throw new Error(
      "The current ProofFlow MVP supports ONCHAIN campaigns."
    );
  }

  if (selectedNetwork !== "SEPOLIA") {
    throw new Error(
      "The current ProofFlow MVP supports Ethereum Sepolia."
    );
  }

  return client.writeContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "create_campaign",
    args: [
      String(title || "").trim(),
      String(description || "").trim(),
      selectedCategory,
      String(requirement || "").trim(),
      selectedNetwork,
      Number(startTime || 0),
      Number(endTime || 0),
      String(outcomeType || "ELIGIBILITY").trim().toUpperCase(),
      String(outcomeValue || "").trim(),
      Number(createdAtHint || 0),
    ],
    value: 0n,
  });
}

export async function verifyParticipant(
  client,
  {
    campaignId = 1,
    participant,
    proof,
    verifiedAtHint = 0,
  }
) {
  if (!client) {
    throw new Error("Connect a wallet before submitting proof.");
  }

  const participantAddress = String(participant || "").trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(participantAddress)) {
    throw new Error("Enter or connect a valid participant wallet address.");
  }

  const normalizedProof = normalizeSepoliaTransactionHash(proof);

  return client.writeContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "verify_participant",
    args: [
      Number(campaignId),
      participantAddress,
      normalizedProof,
      Number(verifiedAtHint || 0),
    ],
    value: 0n,
  });
}

export async function getVerification(verificationId) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_verification",
    args: [verificationId],
    stateStatus: "accepted",
  });
}

export async function getLatestParticipantResult(
  participant,
  campaignId = 1
) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_latest_participant_result",
    args: [participant, campaignId],
    stateStatus: "accepted",
  });
}

export async function getOutcome(outcomeId) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_outcome",
    args: [outcomeId],
    stateStatus: "accepted",
  });
}

export async function getParticipantOutcome(
  participant,
  campaignId = 1
) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "get_participant_outcome",
    args: [participant, campaignId],
    stateStatus: "accepted",
  });
}

export async function isOutcomeTriggered(
  participant,
  campaignId = 1
) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "is_outcome_triggered",
    args: [participant, campaignId],
    stateStatus: "accepted",
  });
}

export async function isProofUsed(proof, campaignId = 1) {
  const normalizedProof = normalizeSepoliaTransactionHash(proof);

  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "is_proof_used",
    args: [normalizedProof, campaignId],
    stateStatus: "accepted",
  });
}