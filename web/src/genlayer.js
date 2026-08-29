import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const PROOFFLOW_CONTRACT =
  "0xfC46FC2C0Cb8A93b8B653EDe3764ECe1e03D642D";

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

