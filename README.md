# ProofFlow

**Verify actions. Trigger outcomes.**

ProofFlow is a programmable proof-of-action platform powered by **GenLayer**. Campaign creators define a verifiable requirement and an outcome. Participants submit proof of an action, and GenLayer validators evaluate independently sourced evidence before reaching consensus on PASS or FAIL.

When verification passes, ProofFlow stores the verification result and automatically creates a one-time outcome record for that participant and campaign.

---

## Live App

**ProofFlow:**

https://proof-flow.pages.dev

---

## Source Code

https://github.com/devysamhere/proofflow

---

## GenLayer Deployment

**Network:** GenLayer Studionet

**ProofFlow Intelligent Contract V2.2:**

`0xB3ADF46f4ebF6534F090358Eeee177e66910F36B`

**Deployment Transaction:**

`0x77bbc0748a1bde6bc96edd079191a83244d7cadccb37491e610d4f0921091192`

**RPC:**

`https://studio.genlayer.com/api`

**Explorer:**

https://explorer-studio.genlayer.com/address/0xB3ADF46f4ebF6534F090358Eeee177e66910F36B

---

## What Problem Does ProofFlow Solve?

Many applications need to determine whether a user actually completed an action before granting a reward, credential, payment, access right, campaign completion, or another digital outcome.

Traditional approaches often depend on:

- a centralized backend;
- manual review;
- one API deciding the result;
- hard-coded verification logic;
- a single party deciding whether evidence is valid.

ProofFlow separates **evidence retrieval** from **evidence judgment**.

External evidence providers supply objective facts. They do not decide PASS or FAIL.

The final verification decision is made through a **GenLayer Intelligent Contract** and validator consensus.

---

## V2.2 Verification Model

ProofFlow V2.2 strengthens the evidence trust boundary and participant identity model.

The V2.2 architecture introduces three important changes:

1. **Independent evidence paths** — validators compare blockchain facts obtained through separate providers instead of relying on one mutable evidence response.
2. **Contract-derived participant identity** — the participant is derived from `gl.message.origin_address` rather than supplied manually by the user.
3. **Contract-derived verification timing** — verification timing is derived during contract execution rather than supplied by the frontend.

The campaign creator defines:

- campaign title;
- description;
- verification requirement;
- category;
- network;
- optional campaign time window;
- outcome type;
- outcome value.

The creator does **not** provide a participant transaction or arbitrary evidence URL.

When a participant verifies a campaign, the participant supplies only:

- their Ethereum Sepolia transaction hash.

The participant's identity is bound to the transaction origin by the Intelligent Contract.

---

## V2.2 Evidence Architecture

ProofFlow V2.2 uses two independent evidence paths.

```text
                        PARTICIPANT
                             |
                             | Sepolia transaction hash
                             v
                    PROOFFLOW CONTRACT
                             |
              +--------------+--------------+
              |                             |
              v                             v
      ProofFlow Evidence Worker      Direct Validator Request
              |                             |
              v                             v
          Routescan                     Blockscout
              |                             |
              +--------------+--------------+
                             |
                             v
                    GenLayer Validators
                             |
                             v
                  Compare Objective Facts
                             |
                             v
                       Consensus
                             |
                      +------+------+
                      |             |
                      v             v
                    FAIL           PASS
                                    |
                                    v
                           Verification Stored
                                    |
                                    v
                         One-Time Outcome Triggered
```

### Evidence Path A — ProofFlow Worker

The Intelligent Contract derives the ProofFlow evidence URL internally:

```text
https://proofflow-evidence.floptools.workers.dev/evidence?tx=<TRANSACTION_HASH>&network=sepolia
```

For Ethereum Sepolia, the Worker retrieves blockchain data through the **Routescan API** and normalizes relevant transaction facts.

### Evidence Path B — Independent Blockscout Request

The Intelligent Contract independently derives a second evidence URL:

```text
https://eth-sepolia.blockscout.com/api/v2/transactions/<TRANSACTION_HASH>
```

GenLayer validators therefore receive evidence from a separate provider path that does not pass through the ProofFlow Worker.

Validators compare the objective facts returned by both sources before evaluating the campaign requirement.

---

## Evidence Trust Boundary

V2.2 specifically reduces dependence on a single mutable evidence source.

The architecture is:

```text
Path A:
ProofFlow Contract
-> ProofFlow Worker
-> Routescan

Path B:
ProofFlow Contract
-> Blockscout
```

The two paths are independently queried.

The ProofFlow Worker remains an evidence adapter. It does **not** decide whether a participant passes or fails.

GenLayer validator consensus remains the decision layer.

---

## End-to-End Flow

```text
Creator defines campaign
        |
        v
Requirement + outcome stored on GenLayer
        |
        v
Participant completes action
        |
        v
Participant submits Sepolia transaction hash
        |
        v
Participant identity derived from transaction origin
        |
        v
Verification timing derived during contract execution
        |
        v
Contract derives both evidence requests
        |
        +----------------------------+
        |                            |
        v                            v
Worker -> Routescan            Blockscout
        |                            |
        +-------------+--------------+
                      |
                      v
          GenLayer validators compare evidence
                      |
                      v
                   Consensus
                      |
               +------+------+
               |             |
               v             v
             FAIL           PASS
               |             |
               v             v
      Verification       Verification
         stored             stored
                              |
                              v
                    One-time outcome triggered
```

---

## Campaign Creation

The ProofFlow frontend includes a browser-based Campaign Creator.

For the current MVP, the supported configuration is:

- **Category:** `ONCHAIN`
- **Network:** `SEPOLIA`

A creator can define a human-readable requirement such as:

> Participant must successfully send at least 0.001 ETH on Ethereum Sepolia from their own wallet.

A campaign stores the requirement and configured outcome. It does not store a participant proof.

### Campaign Record

The V2.2 contract stores:

```text
campaign_id
creator
title
description
category
requirement
network
outcome_type
outcome_value
active
start_time
end_time
created_at_hint
```

Campaigns are active immediately after creation unless later paused by the creator.

---

## Participant Verification

A participant selects a campaign and submits:

```text
Sepolia transaction hash
```

The frontend does **not** ask the participant to manually enter a wallet address.

The Intelligent Contract derives the participant from:

```text
gl.message.origin_address
```

This binds the verification attempt to the wallet that originated the GenLayer transaction.

The contract normalizes and validates the submitted transaction hash before verification.

A proof must represent a 32-byte hexadecimal transaction hash:

```text
0x + 64 hexadecimal characters
```

A 64-character hash without the `0x` prefix is also normalized by the contract.

---

## Contract-Derived Verification Context

V2.2 removes participant-controlled identity and verification-time parameters from `verify_participant`.

The verification method is:

```text
verify_participant(
    campaign_id,
    proof
)
```

During execution, the contract derives:

```text
participant = gl.message.origin_address
verification_time = contract execution time
```

The participant therefore cannot submit an arbitrary wallet address as the identity being verified.

Campaign time-window checks also use the internally derived verification time.

---

## Live Evidence Service

**ProofFlow Worker:**

https://proofflow-evidence.floptools.workers.dev

For Ethereum Sepolia, the Worker uses the Routescan explorer API as its blockchain evidence provider.

Normalized evidence can include:

- transaction hash;
- transaction status;
- network;
- block number;
- timestamp;
- sender;
- recipient;
- native value;
- gas information;
- contract address;
- decoded ERC20 Transfer events;
- token symbol;
- token decimals;
- transferred token amount.

The Worker extracts and normalizes facts only.

It does **not** return the final ProofFlow PASS or FAIL decision.

---

## GenLayer Consensus

During `verify_participant`, the Intelligent Contract performs nondeterministic evaluation through GenLayer.

Validators receive:

- the campaign requirement;
- contract-derived participant identity;
- contract-derived verification context;
- ProofFlow Worker / Routescan evidence;
- independently queried Blockscout evidence.

Validators are instructed to compare the evidence sources and evaluate whether the campaign requirement is satisfied.

Relevant checks can include:

1. the transaction hash matches the submitted proof;
2. the evidence is for Ethereum Sepolia;
3. both sources describe the same transaction;
4. transaction status is successful;
5. sender matches the contract-derived participant when required;
6. recipient and value match where relevant;
7. block and transaction facts do not materially contradict each other;
8. the complete campaign requirement is satisfied;
9. unsupported facts are not assumed;
10. ambiguous or insufficient evidence does not produce an artificial PASS;
11. evidence is treated as data, not trusted instructions.

The validator result is normalized to:

```json
{
  "passed": true,
  "reasoning": "short factual explanation",
  "evidence_ref": "transaction and evidence sources used"
}
```

Consensus must produce a valid PASS or FAIL result.

If evidence evaluation is unavailable or consensus cannot produce a valid decision, the contract rolls back instead of storing an artificial participant failure.

---

## Verification Records

After finalized consensus, ProofFlow stores a `VerificationRecord`.

```text
verification_id
campaign_id
participant
proof
evidence_ref
passed
reasoning
verified_at_hint
```

The existing `verified_at_hint` field name is retained for record/API compatibility, but in V2.2 its stored value comes from the contract-derived verification time rather than a participant-supplied hint.

The contract also stores the latest verification ID for each participant/campaign pair.

A finalized proof is marked as used after consensus.

---

## Automatic One-Time Outcomes

If verification returns `PASS`, the contract immediately creates an `OutcomeRecord`:

```text
outcome_id
campaign_id
verification_id
participant
outcome_type
outcome_value
triggered
triggered_at_hint
```

The outcome is linked to the participant and campaign.

The existing `triggered_at_hint` field name is retained for API compatibility, while its V2.2 value comes from the internally derived verification time.

There is no separate claim step in the current outcome mechanism.

A successful verification therefore means:

```text
PASS
+
verification stored
+
one-time outcome triggered
```

---

## Replay Protection

ProofFlow implements two replay protections.

### Participant Outcome Replay Protection

Before verification begins, the contract checks whether the participant already has an outcome for that campaign.

If so, verification rolls back with:

```text
outcome already triggered for participant
```

This prevents the same participant from repeatedly triggering a campaign outcome.

### Proof Replay Protection

The contract tracks transaction proofs per campaign.

If a proof has already been consumed for that campaign, verification rolls back with:

```text
proof already used for this campaign
```

Proof usage is scoped by:

```text
campaign_id + transaction_hash
```

---

## V2.2 End-to-End Validation

ProofFlow V2.2 has been tested end to end using a real Ethereum Sepolia transaction.

### Tested Campaign

**Campaign ID:** `2`

**Campaign:** ProofFlow V2.2 Sepolia ETH Transfer

**Category:** `ONCHAIN`

**Network:** `SEPOLIA`

**Requirement:**

> Participant must successfully send at least 0.001 ETH on Ethereum Sepolia from their own wallet.

**Outcome Type:** `ELIGIBILITY`

**Outcome Value:** `PROOFFLOW_VERIFIED`

### Participant

```text
0x24199034c9ceDe510B35F37471D553f25C84e9eB
```

The participant was derived from the GenLayer transaction origin rather than supplied as a verification argument.

### Sepolia Proof

```text
0x6df19ef3aaf295214a2ba1306d03a83b2cdb4df5768bb81075dfc41708354435
```

The Sepolia transaction successfully sent:

```text
0.001 ETH
```

### Independent Evidence Result

GenLayer validators compared evidence from:

```text
ProofFlow Worker -> Routescan
```

and:

```text
Blockscout Sepolia API
```

The sources agreed on the relevant objective transaction facts, including:

- transaction hash;
- participant/sender;
- recipient;
- native ETH value;
- successful status;
- block number;
- gas information.

The verification reached consensus with:

```text
PASS
```

The verification was persisted as:

```text
Verification ID: 1
```

The configured campaign outcome was automatically triggered as:

```text
Outcome ID: 1
Triggered: true
```

A subsequent read of `is_outcome_triggered` returned:

```text
true
```

This validates the complete V2.2 flow:

```text
Real Sepolia action
-> contract-derived participant
-> independently sourced evidence
-> GenLayer consensus
-> PASS
-> verification persisted
-> one-time outcome triggered
```

---

## Browser V2.2 Validation

The V2.2 browser frontend has also been tested against the deployed V2.2 Intelligent Contract.

The frontend:

- loads campaigns from the new V2.2 deployment;
- requests only the Sepolia transaction hash;
- does not request a participant wallet manually;
- submits the new `verify_participant(campaign_id, proof)` call;
- uses the connected account for participant-specific result reads;
- retains the Wallet -> Submit -> Consensus -> Result flow;
- detects finalized contract rollbacks;
- surfaces replay-protection errors correctly.

After the successful Campaign #2 outcome had already been triggered during the initial end-to-end test, submitting the same verification from the browser correctly surfaced:

```text
Outcome Already Triggered - this participant has already completed this campaign successfully.
```

This confirms the browser is communicating with the V2.2 contract and correctly displaying contract-level replay protection.

---

## Frontend

The ProofFlow interface is built with:

- React;
- Vite;
- `genlayer-js`;
- browser wallet integration.

The V2.2 frontend supports:

- connect a compatible browser wallet;
- display and locally disconnect the connected wallet;
- create ONCHAIN campaigns;
- dynamically load campaigns using `get_campaign_count`;
- view campaign requirements and outcomes;
- submit a Sepolia transaction proof;
- derive participant identity from the connected transaction origin rather than manual input;
- track Wallet -> Submit -> Consensus -> Result;
- display PASS / FAIL;
- display validator reasoning;
- display proof/evidence reference;
- display verification ID;
- display triggered outcome information;
- display transaction references;
- handle GenLayer receipt-wait timeouts;
- detect contract rollback results returned inside finalized receipts;
- surface proof-reuse and participant-outcome replay errors.

---

## Resilient Transaction Finalization

GenLayer consensus can take longer than a browser receipt waiter expects.

ProofFlow does not automatically interpret a receipt-wait timeout as a failed verification.

If the SDK receipt wait times out, the frontend checks the contract for the participant's stored verification result and can continue polling briefly for finalized state.

ProofFlow also distinguishes a timeout from a contract rollback.

A finalized receipt whose leader result contains:

```text
status: rollback
```

is surfaced as the actual contract error instead of being mistaken for a missing verification result.

This is particularly important for replay-protection UX.

---

## Intelligent Contract Interface

The deployed V2.2 contract exposes:

```text
create_campaign(
    title,
    description,
    category,
    requirement,
    network,
    start_time,
    end_time,
    outcome_type,
    outcome_value,
    created_at_hint
)

get_campaign(campaign_id)

get_campaign_count()

set_campaign_active(
    campaign_id,
    active
)

verify_participant(
    campaign_id,
    proof
)

get_verification(
    verification_id
)

get_latest_participant_result(
    participant,
    campaign_id
)

get_outcome(
    outcome_id
)

get_participant_outcome(
    participant,
    campaign_id
)

is_outcome_triggered(
    participant,
    campaign_id
)

is_proof_used(
    campaign_id,
    proof
)
```

The critical V2.2 verification change is:

```text
V2.1:
verify_participant(
    campaign_id,
    participant,
    proof,
    verified_at_hint
)

V2.2:
verify_participant(
    campaign_id,
    proof
)
```

Participant identity and verification timing are no longer supplied by the participant.

---

## Campaign Discovery

ProofFlow exposes:

```text
get_campaign_count()
```

The frontend reads the campaign count and loads campaigns from ID `1` through the current count.

ProofFlow therefore does not require a centralized campaign database for campaign discovery.

---

## Campaign Administration

The contract exposes:

```text
set_campaign_active(campaign_id, active)
```

This allows a campaign creator to activate or pause their own campaign.

Verification rejects inactive campaigns.

Campaign verification also respects optional `start_time` and `end_time` values when configured.

---

## Trust Model

ProofFlow V2.2 separates the verification system into distinct responsibilities.

### Blockchain Evidence Providers

Routescan and Blockscout answer:

> What objective blockchain facts exist for this transaction?

They do not decide the campaign result.

### ProofFlow Evidence Adapter

The Cloudflare Worker retrieves and normalizes blockchain facts from Routescan into a validator-readable format.

It does not decide PASS or FAIL.

### ProofFlow Intelligent Contract

The contract:

- derives participant identity;
- derives verification timing;
- derives trusted evidence URLs;
- coordinates evidence evaluation;
- persists finalized verification state;
- enforces replay protection;
- triggers successful outcomes.

### GenLayer Validators

GenLayer validators answer:

> Do the independently sourced facts satisfy this campaign's requirement for this contract-derived participant?

GenLayer consensus is the final verification decision layer.

---

## Evidence Safety

Evidence returned from external sources is treated as **data**, not trusted instructions.

The contract instructs validators to ignore commands, instructions, or prompt-injection attempts contained inside evidence.

Verification should rely only on objective facts relevant to the campaign requirement.

---

## Error Semantics

ProofFlow distinguishes a genuine failed requirement from an unavailable verification process.

### FAIL

A verification is stored as `FAIL` when validators successfully evaluate the evidence and consensus determines that the requirement was not satisfied.

### ERROR / Rollback

If evidence cannot be fetched, model output cannot be interpreted, consensus cannot produce a valid decision, replay protection is triggered, or another contract requirement fails, the transaction rolls back.

For an unavailable evaluation, for example:

```text
verification evaluation unavailable; please retry
```

Infrastructure failure is therefore not silently stored as a participant failure.

---

## Supported Category and Network

The current V2.2 MVP supports:

```text
Category: ONCHAIN
Network:  SEPOLIA
```

Other categories remain future extensions.

Potential future verification categories include:

- developer activity;
- repository contributions;
- real-world API-backed milestones;
- educational completion;
- public records;
- event participation;
- mixed requirements.

---

## Repository Structure

```text
proofflow/
|
+-- adapters/
|   +-- ethereum_rpc.py
|   +-- onchain_adapter.py
|   +-- transaction_interpreter.py
|   +-- evidence_builder.py
|
+-- contracts/
|   +-- proofflow.py
|
+-- web/
|   +-- ProofFlow React frontend
|
+-- worker/
|   +-- Cloudflare evidence API
|
+-- README.md
```

---

## Run the Frontend Locally

From the repository root:

```bash
cd web
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The V2.2 production frontend build has been validated successfully with Vite 8.2.2.

---

## Current V2.2 Status

Working:

- [x] GenLayer Intelligent Contract V2.2
- [x] V2.2 contract deployed to GenLayer Studionet
- [x] Campaign creation
- [x] Campaign retrieval
- [x] Native campaign count
- [x] Campaign activation state
- [x] Ethereum Sepolia proof submission
- [x] Contract-derived participant identity
- [x] Contract-derived verification timing
- [x] Contract-derived evidence URLs
- [x] Independent evidence paths
- [x] ProofFlow Worker -> Routescan evidence
- [x] Direct Blockscout evidence
- [x] Cross-source evidence comparison
- [x] Public Cloudflare evidence service
- [x] Native ETH evidence validation
- [x] ERC20 evidence interpretation
- [x] GenLayer nondeterministic evaluation
- [x] Validator consensus
- [x] PASS / FAIL verification records
- [x] Latest participant result lookup
- [x] Persistent outcome records
- [x] Automatic one-time outcome trigger on PASS
- [x] Participant outcome lookup
- [x] Participant outcome replay protection
- [x] Campaign-scoped proof replay protection
- [x] Browser wallet integration
- [x] Browser campaign creator
- [x] Dynamic campaign discovery
- [x] Transaction-hash-only participant verification UI
- [x] Consensus/result modal UX
- [x] Receipt-timeout recovery
- [x] Contract rollback detection in finalized receipts
- [x] Browser replay-protection validation
- [x] End-to-end real Sepolia validation
- [x] Local production build validation

---

## V2.2 Improvement

The main V2.2 architectural improvement is the removal of two important single-party trust assumptions.

### Before

```text
Participant supplied wallet identity
+
Validators relied on one normalized evidence path
```

### V2.2

```text
Participant identity derived by contract
+
Verification timing derived during execution
+
Evidence Path A: Worker -> Routescan
+
Evidence Path B: Direct Blockscout
+
GenLayer validators compare both
```

This creates a stronger relationship between:

```text
Transaction Origin
+
Participant Identity
+
Independent Evidence
+
Campaign Requirement
+
Validator Consensus
+
Outcome
```

---

## Product Vision

ProofFlow is not limited to blockchain quests.

Its core primitive is:

```text
Action
+
Requirement
+
Participant Proof
+
Independent Evidence
+
GenLayer Consensus
+
Outcome
```

This model can support:

- Web3 quests;
- token incentives;
- grants;
- bounties;
- loyalty programs;
- credentials;
- education;
- developer rewards;
- communities;
- agent workflows;
- conditional payments;
- access control.

Instead of every application operating its own centralized verification authority, ProofFlow provides a reusable layer for turning independently evaluated evidence into programmable outcomes.

---

## Built for GenLayer

ProofFlow demonstrates how GenLayer Intelligent Contracts can act as a programmable consensus layer between **contract-bound participant identity**, **independently sourced evidence**, and **digital outcomes**.

**Verify actions. Trigger outcomes.**