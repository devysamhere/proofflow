import { useEffect, useState } from "react";
import "./App.css";
import {
  getCampaign,
  connectGenLayerWallet,
  verifyParticipant,
  getLatestParticipantResult,
  isOutcomeEligible,
} from "./genlayer";

const CONTRACT_ADDRESS = "0xfC46FC2C0Cb8A93b8B653EDe3764ECe1e03D642D";

function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function App() {
  const [wallet, setWallet] = useState("");

  const [campaign, setCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState("");

  const [showVerification, setShowVerification] = useState(false);

  const [participantWallet, setParticipantWallet] = useState(
    "0xe6ad325573eb0b6f8edc7ee5c54d3d6179bbf687"
  );

  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [outcomeEligible, setOutcomeEligible] = useState(null);
  const [verificationTx, setVerificationTx] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      try {
        setCampaignLoading(true);
        setCampaignError("");

        const liveCampaign = await getCampaign(1);
        setCampaign(liveCampaign);
      } catch (error) {
        console.error("Failed to load ProofFlow campaign:", error);
        setCampaignError("Unable to load campaign from GenLayer.");
      } finally {
        setCampaignLoading(false);
      }
    }

    loadCampaign();
  }, []);

  useEffect(() => {
    if (!showVerification) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowVerification(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showVerification]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert(
        "No compatible browser wallet was detected. Install MetaMask or another compatible wallet."
      );
      return;
    }

    try {
      const { account } = await connectGenLayerWallet();
      setWallet(account);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const openVerification = () => {
    setShowVerification(true);
  };

  const closeVerification = () => {
    if (
      verificationStatus === "connecting" ||
      verificationStatus === "submitting" ||
      verificationStatus === "waiting"
    ) {
      return;
    }

    setShowVerification(false);
  };

  const handleVerify = async () => {
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

      const tx = await verifyParticipant(client, participantWallet, 1);

      const txHash =
        typeof tx === "string" ? tx : tx?.hash || tx?.transactionHash || "";

      if (txHash) {
        setVerificationTx(txHash);
      }

      setVerificationStatus("waiting");
      setVerificationMessage(
        "Transaction submitted. Waiting for GenLayer validator consensus..."
      );

      if (client.waitForTransactionReceipt && txHash) {
        await client.waitForTransactionReceipt({
          hash: txHash,
        });
      }

      const result = await getLatestParticipantResult(participantWallet, 1);
      const eligible = await isOutcomeEligible(participantWallet, 1);

      setVerificationResult(result);
      setOutcomeEligible(Boolean(eligible));
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

        <button className="walletButton" onClick={connectWallet}>
          <span className={wallet ? "walletDot connected" : "walletDot"} />
          {wallet ? shortenAddress(wallet) : "Connect Wallet"}
        </button>
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

              <button className="secondaryButton">
                Create Campaign
              </button>
            </div>

            <div className="networkInfo">
              <span className="statusDot" />
              <span>GenLayer Studionet</span>

              <span className="divider">&bull;</span>

              <span>
                Contract {shortenAddress(CONTRACT_ADDRESS)}
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

                <b>&#10003;</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>02</span>

                <div>
                  <strong>Evidence retrieved</strong>
                  <p>Live blockchain data</p>
                </div>

                <b>&#10003;</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>03</span>

                <div>
                  <strong>Consensus reached</strong>
                  <p>GenLayer validators</p>
                </div>

                <b>&#10003;</b>
              </div>

              <div className="flowLine" />

              <div className="proofStep complete">
                <span>04</span>

                <div>
                  <strong>Outcome unlocked</strong>
                  <p>Participant eligible</p>
                </div>

                <b>&#10003;</b>
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

            <button className="filterButton">
              All campaigns
            </button>
          </div>

          <div className="campaignGrid">
            <article className="campaignCard featuredCampaign">
              <div className="cardTop">
                <span className="category">
                  {campaign?.category || "ONCHAIN"}
                </span>

                <span className="activeBadge">
                  {campaignLoading
                    ? "LOADING"
                    : campaign?.active
                      ? "ACTIVE"
                      : "INACTIVE"}
                </span>
              </div>

              <h3>
                {campaignLoading
                  ? "Loading campaign..."
                  : campaign?.title || "Campaign unavailable"}
              </h3>

              <p>
                {campaignError ||
                  campaign?.description ||
                  "Loading live campaign data from GenLayer..."}
              </p>

              <div className="requirement">
                <span>REQUIREMENT</span>

                <strong>
                  {campaign?.requirement || "Loading requirement..."}
                </strong>
              </div>

              <div className="campaignMeta">
                <div>
                  <span>NETWORK</span>
                  <strong>Ethereum Sepolia</strong>
                </div>

                <div>
                  <span>OUTCOME</span>
                  <strong>
                    {campaign?.outcome_value || "Loading..."}
                  </strong>
                </div>
              </div>

              <button
                className="verifyButton"
                onClick={openVerification}
                disabled={campaignLoading || Boolean(campaignError)}
              >
                <span>View & Verify</span>
                <span className="buttonArrow">&rarr;</span>
              </button>
            </article>

            <article className="campaignCard coming">
              <div className="cardTop">
                <span className="category developer">
                  DEVELOPER
                </span>

                <span className="soonBadge">
                  COMING NEXT
                </span>
              </div>

              <h3>Developer Contribution Quest</h3>

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
                <span className="category realworld">
                  REAL WORLD
                </span>

                <span className="soonBadge">
                  COMING NEXT
                </span>
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
              <span className="eyebrow">
                THE PROOF LAYER
              </span>

              <h2>
                From action to trusted outcome.
              </h2>
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

      {showVerification && (
        <div
          className="verificationOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeVerification();
            }
          }}
        >
          <div
            className="verificationModal"
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
                  Verify campaign completion
                </h3>

                <p>
                  {campaign?.title || "Sepolia ERC20 Transfer Quest"}
                </p>
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
                <strong>Ethereum Sepolia</strong>
              </div>

              <div>
                <span>VERIFICATION</span>
                <strong>GenLayer Consensus</strong>
              </div>

              <div>
                <span>OUTCOME</span>
                <strong>
                  {campaign?.outcome_value || "DEMO_REWARD"}
                </strong>
              </div>
            </div>

            <div className="verificationProgress">
              <div className={currentStep >= 1 ? "progressStep active" : "progressStep"}>
                <span>1</span>
                <small>Wallet</small>
              </div>

              <div className={currentStep >= 2 ? "progressLine active" : "progressLine"} />

              <div className={currentStep >= 2 ? "progressStep active" : "progressStep"}>
                <span>2</span>
                <small>Submit</small>
              </div>

              <div className={currentStep >= 3 ? "progressLine active" : "progressLine"} />

              <div className={currentStep >= 3 ? "progressStep active" : "progressStep"}>
                <span>3</span>
                <small>Consensus</small>
              </div>

              <div className={currentStep >= 4 ? "progressLine active" : "progressLine"} />

              <div className={currentStep >= 4 ? "progressStep active" : "progressStep"}>
                <span>4</span>
                <small>Result</small>
              </div>
            </div>

            <div className="verificationBody">
              <p className="verificationCopy">
                Enter the wallet that completed the required Sepolia action.
                ProofFlow will retrieve live evidence and submit the verification
                to GenLayer validators for consensus.
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
                  <div className="statusHeading">
                    {isProcessing && (
                      <span className="verificationSpinner" />
                    )}

                    <strong>
                      {verificationMessage}
                    </strong>
                  </div>

                  {verificationTx && (
                    <div className="transactionBox">
                      <span>TRANSACTION</span>
                      <code>{verificationTx}</code>
                    </div>
                  )}

                  {verificationResult?.found && (
                    <div className="verificationResult">
                      <div className="resultHeader">
                        <span
                          className={
                            verificationResult.passed
                              ? "resultBadge pass"
                              : "resultBadge fail"
                          }
                        >
                          {verificationResult.passed
                            ? "PASS"
                            : "FAIL"}
                        </span>

                        <span
                          className={
                            outcomeEligible
                              ? "outcomeBadge eligible"
                              : "outcomeBadge notEligible"
                          }
                        >
                          {outcomeEligible
                            ? "OUTCOME ELIGIBLE"
                            : "NOT ELIGIBLE"}
                        </span>
                      </div>

                      <div className="resultSection">
                        <span>CONSENSUS REASONING</span>

                        <p>
                          {verificationResult.reasoning}
                        </p>
                      </div>

                      {verificationResult.evidence_ref && (
                        <div className="resultSection">
                          <span>EVIDENCE</span>

                          <p className="evidenceText">
                            {verificationResult.evidence_ref}
                          </p>
                        </div>
                      )}

                      <div className="resultFooter">
                        <span>
                          Verification #
                          {verificationResult.verification_id}
                        </span>

                        <span>
                          Stored on GenLayer
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="verificationModalFooter">
              <span>
                Intelligent verification powered by GenLayer validator consensus
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;