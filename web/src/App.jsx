import { useEffect, useState } from "react";
import "./App.css";
import { getCampaign, connectGenLayerWallet, verifyParticipant, getLatestParticipantResult, isOutcomeEligible } from "./genlayer";

const CONTRACT_ADDRESS = "0x38b3d27976344Ab6293816D97f4Bc36DF3071c17";

function shortenAddress(address) {
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

  const handleVerify = async () => {
    try {
      setVerificationStatus("connecting");
      setVerificationMessage("Connecting wallet...");
      setVerificationResult(null);
      setOutcomeEligible(null);
      setVerificationTx("");

      const { client } = await connectGenLayerWallet();

      setVerificationStatus("submitting");
      setVerificationMessage("Submitting verification to GenLayer...");

      const tx = await verifyParticipant(client, participantWallet, 1);

      if (typeof tx === "string") {
        setVerificationTx(tx);
      } else if (tx?.hash) {
        setVerificationTx(tx.hash);
      }

      setVerificationStatus("waiting");
      setVerificationMessage(
        "Transaction submitted. Waiting for GenLayer consensus..."
      );

      if (client.waitForTransactionReceipt) {
        const txHash =
          typeof tx === "string" ? tx : tx?.hash || tx?.transactionHash;

        if (txHash) {
          await client.waitForTransactionReceipt({
            hash: txHash,
          });
        }
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
      setVerificationMessage(
        error?.message || "Verification failed. Please try again."
      );
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("No compatible browser wallet was detected.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts?.length) {
        setWallet(accounts[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

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
              <span className="statusDot"></span>
              GenLayer Studionet
              <span className="divider">•</span>
              Contract {shortenAddress(CONTRACT_ADDRESS)}
            </div>
          </div>

          <div className="proofCard">
            <div className="proofHeader">
              <span>LIVE VERIFICATION</span>
              <span className="liveBadge">PASS</span>
            </div>

            <div className="proofFlow">
              <div className="proofStep complete">
                <span>01</span>
                <div>
                  <strong>Action detected</strong>
                  <p>Ethereum Sepolia</p>
                </div>
                <b>?</b>
              </div>

              <div className="flowLine"></div>

              <div className="proofStep complete">
                <span>02</span>
                <div>
                  <strong>Evidence retrieved</strong>
                  <p>Live blockchain data</p>
                </div>
                <b>?</b>
              </div>

              <div className="flowLine"></div>

              <div className="proofStep complete">
                <span>03</span>
                <div>
                  <strong>Consensus reached</strong>
                  <p>GenLayer validators</p>
                </div>
                <b>?</b>
              </div>

              <div className="flowLine"></div>

              <div className="proofStep complete">
                <span>04</span>
                <div>
                  <strong>Outcome unlocked</strong>
                  <p>Participant eligible</p>
                </div>
                <b>?</b>
              </div>
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

            <button className="filterButton">All campaigns</button>
          </div>

          <div className="campaignGrid">
            <article className="campaignCard">
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
                  <span>Network</span>
                  <strong>Sepolia</strong>
                </div>
                <div>
                  <span>Outcome</span>
                  <strong>
                    {campaign?.outcome_value || "Loading..."}
                  </strong>
                </div>
              </div>

              <button
                className="verifyButton"
                onClick={() => setShowVerification(true)}
              >
                View & Verify
                <span>?</span>
              </button>

              {showVerification && (
                <div className="verificationPanel">
                  <div className="verificationHeader">
                    <div>
                      <span className="verificationEyebrow">
                        LIVE GENLAYER VERIFICATION
                      </span>
                      <h4>Verify campaign completion</h4>
                    </div>
                    <button
                      className="closeVerification"
                      onClick={() => setShowVerification(false)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>

                  <p className="verificationCopy">
                    Enter the participant wallet that completed the Sepolia
                    action. ProofFlow will submit the verification to GenLayer
                    and wait for validator consensus.
                  </p>

                  <label className="walletField">
                    <span>Participant wallet</span>
                    <input
                      value={participantWallet}
                      onChange={(event) =>
                        setParticipantWallet(event.target.value)
                      }
                      placeholder="0x..."
                    />
                  </label>

                  <button
                    className="runVerificationButton"
                    onClick={handleVerify}
                    disabled={
                      verificationStatus === "connecting" ||
                      verificationStatus === "submitting" ||
                      verificationStatus === "waiting"
                    }
                  >
                    {verificationStatus === "connecting"
                      ? "Connecting..."
                      : verificationStatus === "submitting"
                        ? "Submitting..."
                        : verificationStatus === "waiting"
                          ? "Waiting for Consensus..."
                          : "Verify with GenLayer"}
                  </button>

                  {verificationStatus !== "idle" && (
                    <div
                      className={`verificationStatus ${verificationStatus}`}
                    >
                      <strong>{verificationMessage}</strong>

                      {verificationTx && (
                        <span className="verificationTx">
                          Transaction: {verificationTx}
                        </span>
                      )}

                      {verificationResult?.found && (
                        <div className="verificationResult">
                          <span
                            className={
                              verificationResult.passed
                                ? "resultBadge pass"
                                : "resultBadge fail"
                            }
                          >
                            {verificationResult.passed ? "PASS" : "FAIL"}
                          </span>

                          <p>{verificationResult.reasoning}</p>

                          {verificationResult.evidence_ref && (
                            <small>
                              Evidence: {verificationResult.evidence_ref}
                            </small>
                          )}

                          <small>
                            Verification ID:{" "}
                            {verificationResult.verification_id}
                          </small>

                          <strong className="eligibilityResult">
                            Outcome:{" "}
                            {outcomeEligible
                              ? "ELIGIBLE"
                              : "NOT ELIGIBLE"}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </article>

            <article className="campaignCard coming">
              <div className="cardTop">
                <span className="category developer">DEVELOPER</span>
                <span className="soonBadge">COMING NEXT</span>
              </div>

              <h3>Developer Contribution Quest</h3>

              <p>
                Verify qualifying development activity using authoritative
                repository evidence and GenLayer consensus.
              </p>

              <div className="placeholderLines">
                <span></span>
                <span></span>
                <span></span>
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

              <div className="placeholderLines">
                <span></span>
                <span></span>
                <span></span>
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
    </div>
  );
}

export default App;


