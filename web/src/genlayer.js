import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const PROOFFLOW_CONTRACT =
  "0xfC46FC2C0Cb8A93b8B653EDe3764ECe1e03D642D";

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

/*
 * The deployed contract currently does not expose campaign_counter
 * as a public view method.
 *
 * Campaigns are therefore discovered sequentially through get_campaign().
 * Discovery stops when the first nonexistent campaign ID is reached.
 */
export async function getCampaigns({
  startId = 1,
  maxCampaigns = 50,
} = {}) {
  const campaigns = [];

  for (
    let campaignId = startId;
    campaignId < startId + maxCampaigns;
    campaignId += 1
  ) {
    try {
      const campaign = await getCampaign(campaignId);

      if (!campaign) {
        break;
      }

      campaigns.push(campaign);
    } catch (error) {
      if (campaignId === startId && campaigns.length === 0) {
        console.warn(
          `No ProofFlow campaign found at ID ${campaignId}.`,
          error
        );
      }

      break;
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

export function buildOnchainEvidenceUrl({
  transactionHash,
  network = "sepolia",
}) {
  const tx = String(transactionHash || "").trim();
  const selectedNetwork = String(network || "sepolia")
    .trim()
    .toLowerCase();

  if (!/^0x[a-fA-F0-9]{64}$/.test(tx)) {
    throw new Error(
      "Enter a valid transaction hash beginning with 0x and containing 64 hexadecimal characters."
    );
  }

  if (selectedNetwork !== "sepolia") {
    throw new Error(
      "The current ProofFlow MVP supports Ethereum Sepolia evidence."
    );
  }

  const params = new URLSearchParams({
    tx,
    network: selectedNetwork,
  });

  return `${PROOFFLOW_EVIDENCE_WORKER}/evidence?${params.toString()}`;
}

export async function createCampaign(
  client,
  {
    title,
    description,
    category = "ONCHAIN",
    requirement,
    evidenceUrl,
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

  return client.writeContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "create_campaign",
    args: [
      String(title || "").trim(),
      String(description || "").trim(),
      String(category || "ONCHAIN").trim().toUpperCase(),
      String(requirement || "").trim(),
      String(evidenceUrl || "").trim(),
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
  participant,
  campaignId = 1
) {
  return client.writeContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "verify_participant",
    args: [campaignId, participant, 0],
    value: 0n,
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

export async function isOutcomeEligible(
  participant,
  campaignId = 1
) {
  return genlayerClient.readContract({
    address: PROOFFLOW_CONTRACT,
    functionName: "is_outcome_eligible",
    args: [participant, campaignId],
    stateStatus: "accepted",
  });
}