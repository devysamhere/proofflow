import { useEffect, useState } from "react";
import "./App.css";
import {
  PROOFFLOW_CONTRACT,
  buildOnchainEvidenceUrl,
  connectGenLayerWallet,
  createCampaign,
  disconnectGenLayerWallet,
  getCampaigns,
  getLatestParticipantResult,
  isOutcomeEligible,
  verifyParticipant,
} from "./genlayer";

const DEFAULT_PARTICIPANT =
  "0xe6ad325573eb0b6f8edc7ee5c54d3d6179bbf687";

const EMPTY_CAMPAIGN_FORM = {
  title: "",
  description: "",
  requirement: "",
  network: "sepolia",
  transactionHash: "",
  outcomeValue: "",
};

function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTransactionHash(transaction) {
  if (typeof transaction === "string") {
    return transaction;
  }

  return transaction?.hash || transaction?.transactionHash || "";
}

function getNetworkLabel(campaign) {
  const evidenceUrl = String(campaign?.evidence_url || "").toLowerCase();

  if (evidenceUrl.includes("sepolia")) {
    return "Ethereum Sepolia";
  }

  return "External Evidence";
}

function App() {
  const [wallet, setWallet] = useState("");
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState("");

  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [showVerification, setShowVerification] = useState(false);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);

  const [participantWallet, setParticipantWallet] = useState(
    DEFAULT_PARTICIPANT
  );

  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [outcomeEligible, setOutcomeEligible] = useState(null);
  const [verificationTx, setVerificationTx] = useState("");

  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [creatorStatus, setCreatorStatus] = useState("idle");
  const [creatorMessage, setCreatorMessage] = useState("");
  const [creatorTx, setCreatorTx] = useState("");

  const loadCampaigns = async () => {
    try {
      setCampaignLoading(true);
      setCampaignError("");

      const liveCampaigns = await getCampaigns({
        startId: 1,
        maxCampaigns: 50,
      });

      setCampaigns(liveCampaigns);

      if (liveCampaigns.length === 0) {
        setCampaignError("No campaigns are currently available.");
      }
    } catch (error) {
      console.error("Failed to load ProofFlow campaigns:", error);
      setCampaignError("Unable to load campaigns from GenLayer.");
    } finally {
      setCampaignLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) {
      return undefined;
    }

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWallet("");
        setWalletMenuOpen(false);
        return;
      }

      if (wallet) {
        setWallet(accounts[0]);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [wallet]);

  useEffect(() => {
    if (!showVerification && !showCampaignCreator) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      const verificationBusy =
        verificationStatus === "connecting" ||
        verificationStatus === "submitting" ||
        verificationStatus === "waiting";

      const creatorBusy =
        creatorStatus === "connecting" ||
        creatorStatus === "submitting" ||
        creatorStatus === "waiting";

      if (showVerification && !verificationBusy) {
        setShowVerification(false);
      }

      if (showCampaignCreator && !creatorBusy) {
        setShowCampaignCreator(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showVerification,
    showCampaignCreator,
    verificationStatus,
    creatorStatus,
  ]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert(
        "No compatible browser wallet was detected. Install MetaMask or another compatible wallet."
      );
      return null;
    }

    try {
      const connection = await connectGenLayerWallet();
      setWallet(connection.account);
      setWalletMenuOpen(false);
      return connection;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      return null;
    }
  };

  const handleWalletButton = async () => {
    if (wallet) {
      setWalletMenuOpen((current) => !current);
      return;
    }

    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectGenLayerWallet();

    setWallet("");
    setWalletMenuOpen(false);
  };

  const openCampaignCreator = () => {
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCreatorStatus("idle");
    setCreatorMessage("");
    setCreatorTx("");
    setWalletMenuOpen(false);
    setShowCampaignCreator(true);
  };

  const closeCampaignCreator = () => {
    const creatorBusy =
      creatorStatus === "connecting" ||
      creatorStatus === "submitting" ||
      creatorStatus === "waiting";

    if (creatorBusy) {
      return;
    }

    setShowCampaignCreator(false);
  };

  const handleCampaignField = (event) => {
    const { name, value } = event.target;

    setCampaignForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateCampaign = async (event) => {
    event.preventDefault();

    try {
      setCreatorMessage("");
      setCreatorTx("");

      const title = campaignForm.title.trim();
      const description = campaignForm.description.trim();
      const requirement = campaignForm.requirement.trim();
      const transactionHash = campaignForm.transactionHash.trim();
      const outcomeValue = campaignForm.outcomeValue.trim();

      if (!title) {
        throw new Error("Enter a campaign title.");
      }

      if (!requirement) {
        throw new Error("Describe the action participants must prove.");
      }

      if (!transactionHash) {
        throw new Error(
          "Enter the Sepolia transaction hash that will be used as evidence."
        );
      }

      if (!outcomeValue) {
        throw new Error("Enter the outcome participants can unlock.");
      }

      const evidenceUrl = buildOnchainEvidenceUrl({
        transactionHash,
        network: campaignForm.network,
      });

      setCreatorStatus("connecting");
      setCreatorMessage("Connecting wallet...");

      const connection = await connectGenLayerWallet();

      if (connection.account) {
        setWallet(connection.account);
      }

      setCreatorStatus("submitting");
      setCreatorMessage("Creating campaign on GenLayer...");

      const transaction = await createCampaign(connection.client, {
        title,
        description,
        category: "ONCHAIN",
        requirement,
        evidenceUrl,
        startTime: 0,
        endTime: 0,
        outcomeType: "ELIGIBILITY",
        outcomeValue,
        createdAtHint: 0,
      });

      const txHash = getTransactionHash(transaction);

      if (txHash) {
        setCreatorTx(txHash);
      }

      setCreatorStatus("waiting");
      setCreatorMessage(
        "Campaign submitted. Waiting for GenLayer validator consensus..."
      );

      if (connection.client.waitForTransactionReceipt && txHash) {
        await connection.client.waitForTransactionReceipt({
          hash: txHash,
        });
      }

      await loadCampaigns();

      setCreatorStatus("complete");
      setCreatorMessage(
        "Campaign created successfully and stored on GenLayer."
      );
    } catch (error) {
      console.error("Campaign creation failed:", error);

      setCreatorStatus("error");

      const message =
        error?.message || "Campaign creation failed. Please try again.";

      setCreatorMessage(message);
    }
  };

  const openVerification = (campaign) => {
    setSelectedCampaign(campaign);
    setVerificationStatus("idle");
    setVerificationMessage("");
    setVerificationResult(null);
    setOutcomeEligible(null);
    setVerificationTx("");
    setShowVerification(true);
  };

  const closeVerification = () => {
    const verificationBusy =
      verificationStatus === "connecting" ||
      verificationStatus === "submitting" ||
      verificationStatus === "waiting";

    if (verificationBusy) {
      return;
    }

    setShowVerification(false);
  };

  const handleVerify = async () => {
    if (!selectedCampaign) {
      return;
    }

    try {
      setVerificationStatus("connecting");
      setVerificationMessage("Connecting wallet...");
      setVerificationResult(null);
      setOutcomeEligible(null);
      setVerificationTx("");

      const { account, client } = await connectGenLayerWallet();

      if (account) {
        setWallet(account);
      }

      setVerificationStatus("submitting");
      setVerificationMessage("Submitting verification to GenLayer...");

      const tx = await verifyParticipant(
        client,
        participantWallet,
        Number(selectedCampaign.campaign_id)
      );

      const txHash = getTransactionHash(tx);

      if (txHash) {
        setVerificationTx(txHash);
      }

      setVerificationStatus("waiting");
      setVerificationMessage(
        "Transaction submitted. Waiting for GenLayer validator consensus..."
      );

      let receiptWaitError = null;

      if (client.waitForTransactionReceipt && txHash) {
        try {
          await client.waitForTransactionReceipt({
            hash: txHash,
          });
        } catch (error) {
          console.warn(
            "Receipt wait did not complete in time. Checking stored verification result...",
            error
          );

          receiptWaitError = error;
        }
      }

      const readStoredResult = async () => {
        const storedResult = await getLatestParticipantResult(
          participantWallet,
          Number(selectedCampaign.campaign_id)
        );

        if (!storedResult?.found) {
          return null;
        }

        const storedEligibility = await isOutcomeEligible(
          participantWallet,
          Number(selectedCampaign.campaign_id)
        );

        return {
          result: storedResult,
          eligible: Boolean(storedEligibility),
        };
      };

      let stored = await readStoredResult();

      if (!stored && receiptWaitError) {
        setVerificationMessage(
          "GenLayer is still finalizing the verification. Checking the stored result..."
        );

        for (let attempt = 0; attempt < 4 && !stored; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          stored = await readStoredResult();
        }
      }

      if (!stored) {
        if (receiptWaitError) {
          throw new Error(
            "GenLayer is still finalizing this verification. Please wait a moment before trying again."
          );
        }

        throw new Error(
          "Verification transaction completed, but no stored result was found."
        );
      }

      const result = stored.result;
      const eligible = stored.eligible;

      setVerificationResult(result);
      setOutcomeEligible(eligible);
      setVerificationStatus("complete");

      if (result?.passed) {
        setVerificationMessage("Verification passed.");
      } else {
        setVerificationMessage("Verification completed but did not pass.");
      }
    } catch (error) {
      console.error("Verification failed:", error);

      setVerificationStatus("error");

      const message =
        error?.message || "Verification failed. Please try again.";

      if (
        message.toLowerCase().includes("evaluation unavailable") ||
        message.toLowerCase().includes("please retry")
      ) {
        setVerificationMessage(
          "GenLayer could not evaluate the evidence reliably. Please retry."
        );
      } else {
        setVerificationMessage(message);
      }
    }
  };

  const isProcessing =
    verificationStatus === "connecting" ||
    verificationStatus === "submitting" ||
    verificationStatus === "waiting";

  const creatorProcessing =
    creatorStatus === "connecting" ||
    creatorStatus === "submitting" ||
    creatorStatus === "waiting";

  const currentStep =
    verificationStatus === "idle"
      ? 0
      : verificationStatus === "connecting"
        ? 1
        : verificationStatus === "submitting"
          ? 2
          : verificationStatus === "waiting"
            ? 3
            : verificationStatus === "complete"
              ? 4
              : verificationStatus === "error"
                ? 3
                : 0;

  const hasCompletedResult =
    verificationStatus === "complete" && verificationResult?.found;

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brandMark">P</div>

          <div>
            <strong>ProofFlow</strong>
            <span>Verify actions. Trigger outcomes.</span>
          </div>
        </div>

        <nav>
          <a href="#campaigns">Campaigns</a>
          <a href="#how">How it works</a>
        </nav>

        <div className="walletArea">
          <button className="walletButton" onClick={handleWalletButton}>
            <span className={wallet ? "walletDot connected" : "walletDot"} />
            {wallet ? shortenAddress(wallet) : "Connect Wallet"}
            {wallet && <span className="walletChevron">⌄</span>}
          </button>

          {wallet && walletMenuOpen && (
            <div className="walletMenu">
              <span>CONNECTED WALLET</span>
              <strong>{shortenAddress(wallet)}</strong>

              <button onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="heroContent">
            <div className="eyebrow">
              POWERED BY GENLAYER INTELLIGENT CONTRACTS
            </div>

            <h1>
              Prove an action.
              <br />
              <span>Unlock the outcome.</span>
            </h1>

            <p>
              ProofFlow lets organizations define verifiable actions and lets
              participants prove completion using live evidence evaluated
              through GenLayer validator consensus.
            </p>

            <div className="heroActions">
              <a className="primaryButton" href="#campaigns">
                Explore Campaigns
              </a>

              <button
                className="secondaryButton"
                onClick={openCampaignCreator}
              >
                Create Campaign
              </button>
            </div>

            <div className="networkInfo">
              <span className="statusDot" />
              <span>GenLayer Studionet</span>

              <span className="divider">&bull;</span>

              <span>
                Contract {shortenAddress(PROOFFLOW_CONTRACT)}
              </span>
            </div>
          </div>

          <div className="proofCard">
            <div className="proofHeader">
              <span>LIVE VERIFICATION FLOW</span>

              <span className="liveBadge">
                <span className="livePulse" />
                LIVE
              </span>
            </div>

            <div className="proofFlow">
              <div className="proofStep complete">
                <span>01</span>

                <div>
                  <strong>Action detected</strong>
                  <p>Ethereum Sepolia</p>
                </div>

                <b>✓</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>02</span>

                <div>
                  <strong>Evidence retrieved</strong>
                  <p>Live blockchain data</p>
                </div>

                <b>✓</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>03</span>

                <div>
                  <strong>Consensus reached</strong>
                  <p>GenLayer validators</p>
                </div>

                <b>✓</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>04</span>

                <div>
                  <strong>Outcome unlocked</strong>
                  <p>Participant eligible</p>
                </div>

                <b>✓</b>
              </div>
            </div>

            <div className="proofFooter">
              <span>Example verified flow</span>
              <strong>PASS</strong>
            </div>
          </div>
        </section>

        <section className="stats">
          <div>
            <strong>Live</strong>
            <span>Evidence</span>
          </div>

          <div>
            <strong>AI</strong>
            <span>Evaluation</span>
          </div>

          <div>
            <strong>Consensus</strong>
            <span>Verification</span>
          </div>

          <div>
            <strong>Onchain</strong>
            <span>Results</span>
          </div>
        </section>

        <section className="campaignSection" id="campaigns">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">ACTIVE CAMPAIGNS</span>
              <h2>Complete actions. Prove the result.</h2>
            </div>

            <button
              className="createCampaignButton"
              onClick={openCampaignCreator}
            >
              + Create Campaign
            </button>
          </div>

          {campaignLoading && (
            <div className="campaignNotice">
              Loading campaigns from GenLayer...
            </div>
          )}

          {!campaignLoading && campaignError && campaigns.length === 0 && (
            <div className="campaignNotice error">
              {campaignError}
            </div>
          )}

          <div className="campaignGrid">
            {campaigns.map((campaign, index) => (
              <article
                className={
                  index === 0
                    ? "campaignCard featuredCampaign"
                    : "campaignCard"
                }
                key={campaign.campaign_id}
              >
                <div className="cardTop">
                  <span className="category">
                    {campaign.category || "ONCHAIN"}
                  </span>

                  <span
                    className={
                      campaign.active
                        ? "activeBadge"
                        : "inactiveBadge"
                    }
                  >
                    {campaign.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <h3>{campaign.title}</h3>

                <p>
                  {campaign.description ||
                    "A verifiable ProofFlow campaign stored on GenLayer."}
                </p>

                <div className="requirement">
                  <span>REQUIREMENT</span>
                  <strong>{campaign.requirement}</strong>
                </div>

                <div className="campaignMeta">
                  <div>
                    <span>NETWORK</span>
                    <strong>{getNetworkLabel(campaign)}</strong>
                  </div>

                  <div>
                    <span>OUTCOME</span>
                    <strong>
                      {campaign.outcome_value || campaign.outcome_type}
                    </strong>
                  </div>
                </div>

                <button
                  className="verifyButton"
                  onClick={() => openVerification(campaign)}
                  disabled={!campaign.active}
                >
                  <span>
                    {campaign.active ? "View & Verify" : "Campaign Inactive"}
                  </span>
                  {campaign.active && (
                    <span className="buttonArrow">&rarr;</span>
                  )}
                </button>
              </article>
            ))}

            <article className="campaignCard coming">
              <div className="cardTop">
                <span className="category developer">DEVELOPER</span>
                <span className="soonBadge">COMING NEXT</span>
              </div>

              <h3>Developer Contribution Proof</h3>

              <p>
                Verify qualifying development activity using authoritative
                repository evidence and GenLayer consensus.
              </p>

              <div className="comingFeature">
                <span>Repository evidence</span>
                <span>Contribution rules</span>
                <span>Consensus verification</span>
              </div>

              <button className="disabledButton" disabled>
                Coming Soon
              </button>
            </article>

            <article className="campaignCard coming">
              <div className="cardTop">
                <span className="category realworld">REAL WORLD</span>
                <span className="soonBadge">COMING NEXT</span>
              </div>

              <h3>Real-World Proof Campaign</h3>

              <p>
                Evaluate authoritative digital evidence for courses, events,
                grants, loyalty programs and other real-world outcomes.
              </p>

              <div className="comingFeature">
                <span>Authoritative evidence</span>
                <span>AI evaluation</span>
                <span>Trusted outcomes</span>
              </div>

              <button className="disabledButton" disabled>
                Coming Soon
              </button>
            </article>
          </div>
        </section>

        <section className="howSection" id="how">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">THE PROOF LAYER</span>
              <h2>From action to trusted outcome.</h2>
            </div>
          </div>

          <div className="howGrid">
            <div>
              <span>01</span>
              <h3>Define</h3>

              <p>
                A campaign creator defines the action, evidence source and
                outcome.
              </p>
            </div>

            <div>
              <span>02</span>
              <h3>Complete</h3>

              <p>
                A participant performs the required onchain or real-world
                action.
              </p>
            </div>

            <div>
              <span>03</span>
              <h3>Verify</h3>

              <p>
                GenLayer validators independently evaluate authoritative
                evidence.
              </p>
            </div>

            <div>
              <span>04</span>
              <h3>Unlock</h3>

              <p>
                Consensus creates a trusted PASS or FAIL that controls the
                outcome.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footerBrand">
          <div className="brandMark">P</div>
          <strong>ProofFlow</strong>
        </div>

        <span>Powered by GenLayer</span>
      </footer>

      {showCampaignCreator && (
        <div
          className="verificationOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCampaignCreator();
            }
          }}
        >
          <div
            className="campaignCreatorModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-creator-title"
          >
            <div className="verificationModalTop">
              <div>
                <span className="verificationEyebrow">
                  CREATE ON GENLAYER
                </span>

                <h3 id="campaign-creator-title">
                  Create a ProofFlow campaign
                </h3>

                <p>
                  Define an action and the outcome it unlocks.
                </p>
              </div>

              <button
                className="closeVerification"
                onClick={closeCampaignCreator}
                disabled={creatorProcessing}
                aria-label="Close campaign creator"
              >
                &times;
              </button>
            </div>

            <form
              className="campaignCreatorBody"
              onSubmit={handleCreateCampaign}
            >
              <div className="creatorIntro">
                <div className="creatorIntroIcon">01</div>

                <div>
                  <strong>Onchain proof campaign</strong>
                  <p>
                    This MVP uses a live Ethereum Sepolia transaction as
                    evidence. ProofFlow retrieves the transaction facts and
                    GenLayer validators decide whether your requirement was
                    satisfied.
                  </p>
                </div>
              </div>

              <div className="creatorFormGrid">
                <label className="creatorField fullWidth">
                  <span>Campaign title</span>

                  <input
                    name="title"
                    value={campaignForm.title}
                    onChange={handleCampaignField}
                    placeholder="e.g. Sepolia Token Transfer"
                    disabled={creatorProcessing}
                  />
                </label>

                <label className="creatorField fullWidth">
                  <span>Description</span>

                  <textarea
                    name="description"
                    value={campaignForm.description}
                    onChange={handleCampaignField}
                    placeholder="Explain what this campaign is for."
                    rows="3"
                    disabled={creatorProcessing}
                  />
                </label>

                <label className="creatorField fullWidth">
                  <span>Verification requirement</span>

                  <textarea
                    name="requirement"
                    value={campaignForm.requirement}
                    onChange={handleCampaignField}
                    placeholder="e.g. Participant must have successfully transferred at least 0.1 Rel ERC20 tokens on Sepolia, and the transfer must originate from the participant wallet."
                    rows="4"
                    disabled={creatorProcessing}
                  />
                  <small>
                    Write the condition clearly. GenLayer validators will
                    evaluate the evidence against this requirement.
                  </small>
                </label>

                <label className="creatorField">
                  <span>Network</span>

                  <select
                    name="network"
                    value={campaignForm.network}
                    onChange={handleCampaignField}
                    disabled={creatorProcessing}
                  >
                    <option value="sepolia">
                      Ethereum Sepolia
                    </option>
                  </select>
                </label>

                <label className="creatorField">
                  <span>Outcome</span>

                  <input
                    name="outcomeValue"
                    value={campaignForm.outcomeValue}
                    onChange={handleCampaignField}
                    placeholder="e.g. DEMO_REWARD"
                    disabled={creatorProcessing}
                  />
                </label>

                <label className="creatorField fullWidth">
                  <span>Evidence transaction hash</span>

                  <input
                    className="monospaceInput"
                    name="transactionHash"
                    value={campaignForm.transactionHash}
                    onChange={handleCampaignField}
                    placeholder="0x..."
                    disabled={creatorProcessing}
                  />

                  <small>
                    ProofFlow automatically converts this into a live evidence
                    endpoint. The URL is not stored manually by the creator.
                  </small>
                </label>
              </div>

              {creatorStatus !== "idle" && (
                <div className={`creatorStatus ${creatorStatus}`}>
                  <div className="statusHeading">
                    {creatorProcessing && (
                      <span className="verificationSpinner" />
                    )}

                    {creatorStatus === "complete" && (
                      <span className="creatorSuccessIcon">✓</span>
                    )}

                    <strong>{creatorMessage}</strong>
                  </div>

                  {creatorTx && (
                    <div className="transactionBox">
                      <span>TRANSACTION</span>
                      <code>{creatorTx}</code>
                    </div>
                  )}
                </div>
              )}

              <div className="creatorActions">
                <button
                  type="button"
                  className="creatorCancelButton"
                  onClick={closeCampaignCreator}
                  disabled={creatorProcessing}
                >
                  {creatorStatus === "complete" ? "Close" : "Cancel"}
                </button>

                {creatorStatus !== "complete" && (
                  <button
                    type="submit"
                    className="creatorSubmitButton"
                    disabled={creatorProcessing}
                  >
                    {creatorStatus === "connecting"
                      ? "Connecting Wallet..."
                      : creatorStatus === "submitting"
                        ? "Creating Campaign..."
                        : creatorStatus === "waiting"
                          ? "Waiting for Consensus..."
                          : creatorStatus === "error"
                            ? "Retry Creation"
                            : "Create on GenLayer"}
                  </button>
                )}
              </div>
            </form>

            <div className="verificationModalFooter">
              Campaign creation is recorded through the ProofFlow Intelligent
              Contract on GenLayer Studionet
            </div>
          </div>
        </div>
      )}

      {showVerification && selectedCampaign && (
        <div
          className="verificationOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeVerification();
            }
          }}
        >
          <div
            className={`verificationModal ${
              hasCompletedResult ? "resultMode" : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-title"
          >
            <div className="verificationModalTop">
              <div>
                <span className="verificationEyebrow">
                  GENLAYER VERIFICATION
                </span>

                <h3 id="verification-title">
                  {hasCompletedResult
                    ? "Verification complete"
                    : "Verify campaign completion"}
                </h3>

                <p>{selectedCampaign.title}</p>
              </div>

              <button
                className="closeVerification"
                onClick={closeVerification}
                disabled={isProcessing}
                aria-label="Close verification"
              >
                &times;
              </button>
            </div>

            <div className="verificationCampaignSummary">
              <div>
                <span>NETWORK</span>
                <strong>
                  {getNetworkLabel(selectedCampaign)}
                </strong>
              </div>

              <div>
                <span>VERIFICATION</span>
                <strong>GenLayer Consensus</strong>
              </div>

              <div>
                <span>OUTCOME</span>
                <strong>
                  {selectedCampaign.outcome_value ||
                    selectedCampaign.outcome_type}
                </strong>
              </div>
            </div>

            <div className="verificationProgress">
              <div
                className={
                  currentStep >= 1
                    ? "progressStep active"
                    : "progressStep"
                }
              >
                <span>{currentStep > 1 ? "✓" : "1"}</span>
                <small>Wallet</small>
              </div>

              <div
                className={
                  currentStep >= 2
                    ? "progressLine active"
                    : "progressLine"
                }
              />

              <div
                className={
                  currentStep >= 2
                    ? "progressStep active"
                    : "progressStep"
                }
              >
                <span>{currentStep > 2 ? "✓" : "2"}</span>
                <small>Submit</small>
              </div>

              <div
                className={
                  currentStep >= 3
                    ? "progressLine active"
                    : "progressLine"
                }
              />

              <div
                className={
                  currentStep >= 3
                    ? "progressStep active"
                    : "progressStep"
                }
              >
                <span>{currentStep > 3 ? "✓" : "3"}</span>
                <small>Consensus</small>
              </div>

              <div
                className={
                  currentStep >= 4
                    ? "progressLine active"
                    : "progressLine"
                }
              />

              <div
                className={
                  currentStep >= 4
                    ? "progressStep active"
                    : "progressStep"
                }
              >
                <span>{currentStep >= 4 ? "✓" : "4"}</span>
                <small>Result</small>
              </div>
            </div>

            <div className="verificationBody">
              {!hasCompletedResult && (
                <>
                  <p className="verificationCopy">
                    Enter the wallet that completed the required action.
                    ProofFlow will retrieve the campaign's live evidence and
                    submit the verification to GenLayer validators for
                    consensus.
                  </p>

                  <label className="walletField">
                    <span>Participant wallet</span>

                    <input
                      value={participantWallet}
                      onChange={(event) =>
                        setParticipantWallet(event.target.value)
                      }
                      placeholder="0x..."
                      disabled={isProcessing}
                    />
                  </label>
                </>
              )}

              {hasCompletedResult && (
                <div className="completedWallet">
                  <span>PARTICIPANT</span>
                  <strong>{participantWallet}</strong>
                </div>
              )}

              <button
                className="runVerificationButton"
                onClick={handleVerify}
                disabled={isProcessing || !participantWallet.trim()}
              >
                {verificationStatus === "connecting"
                  ? "Connecting Wallet..."
                  : verificationStatus === "submitting"
                    ? "Submitting Verification..."
                    : verificationStatus === "waiting"
                      ? "Waiting for Consensus..."
                      : verificationStatus === "complete"
                        ? "Verify Again"
                        : verificationStatus === "error"
                          ? "Retry Verification"
                          : "Verify with GenLayer"}
              </button>

              {verificationStatus !== "idle" && (
                <div
                  className={`verificationStatus ${verificationStatus}`}
                >
                  {hasCompletedResult ? (
                    <>
                      <div
                        className={`resultSummary ${
                          verificationResult.passed ? "pass" : "fail"
                        }`}
                      >
                        <div className="resultSummaryIcon">
                          {verificationResult.passed ? "✓" : "×"}
                        </div>

                        <div className="resultSummaryCopy">
                          <span>
                            {verificationResult.passed
                              ? "VERIFICATION PASSED"
                              : "VERIFICATION FAILED"}
                          </span>

                          <strong>
                            {verificationResult.passed
                              ? "Action successfully verified"
                              : "Requirements were not satisfied"}
                          </strong>

                          <p>{verificationMessage}</p>
                        </div>

                        <div
                          className={
                            outcomeEligible
                              ? "outcomeBadge eligible"
                              : "outcomeBadge notEligible"
                          }
                        >
                          {outcomeEligible
                            ? "ELIGIBLE"
                            : "NOT ELIGIBLE"}
                        </div>
                      </div>

                      <div className="resultDetailsGrid">
                        <div className="resultDetailCard">
                          <span>CONSENSUS REASONING</span>
                          <p>{verificationResult.reasoning}</p>
                        </div>

                        {verificationResult.evidence_ref && (
                          <div className="resultDetailCard">
                            <span>EVIDENCE</span>
                            <p>{verificationResult.evidence_ref}</p>
                          </div>
                        )}
                      </div>

                      {verificationTx && (
                        <div className="compactTransaction">
                          <div>
                            <span>TRANSACTION</span>
                            <code>{verificationTx}</code>
                          </div>
                        </div>
                      )}

                      <div className="resultMeta">
                        <span>
                          Verification #
                          {verificationResult.verification_id}
                        </span>

                        <span className="storedBadge">
                          <i />
                          Stored on GenLayer
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="statusHeading">
                        {isProcessing && (
                          <span className="verificationSpinner" />
                        )}

                        <strong>{verificationMessage}</strong>
                      </div>

                      {verificationTx && (
                        <div className="transactionBox">
                          <span>TRANSACTION</span>
                          <code>{verificationTx}</code>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="verificationModalFooter">
              <span>
                Intelligent verification powered by GenLayer validator
                consensus
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;