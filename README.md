# ProofFlow

**Verify actions. Trigger outcomes.**

ProofFlow is a programmable proof-of-action platform powered by **GenLayer**. Campaign creators define a verifiable requirement and an outcome. Participants submit their own proof of action, and GenLayer validators independently evaluate authoritative evidence before reaching consensus on PASS or FAIL.

When verification passes, ProofFlow automatically creates a one-time outcome record for that participant and campaign.

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

**ProofFlow Intelligent Contract V2.1:**

`0xe6C111eDE3C5a687304503011eff6e9289100B28`

**RPC:**

`https://studio.genlayer.com/api`

**Explorer:**

https://explorer-studio.genlayer.com/address/0xe6C111eDE3C5a687304503011eff6e9289100B28

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

External evidence services provide facts. They do not decide PASS or FAIL.

The final verification decision is made through a **GenLayer Intelligent Contract** and validator consensus.

---

## V2.1 Verification Model

ProofFlow V2.1 changes the verification model so that evidence is participant-specific.

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

When a participant verifies a campaign, the participant supplies:

- their wallet address;
- their Ethereum Sepolia transaction hash.

The Intelligent Contract validates the proof format and derives the trusted evidence endpoint itself.

This prevents a campaign creator or participant from substituting an arbitrary evidence source.

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
Participant submits wallet + Sepolia transaction hash
        |
        v
ProofFlow contract derives trusted evidence URL
        |
        v
Evidence worker retrieves and normalizes blockchain facts
        |
        v
Independent GenLayer validators evaluate requirement
        |
        v
Consensus
        |
        v
PASS / FAIL
        |
        +----------------------+
        |                      |
        v                      v
      FAIL                    PASS
        |                      |
        v                      v
Verification stored     Verification stored
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

> Participant must have successfully transferred at least 0.1 Rel ERC20 tokens on Sepolia, and the transfer must originate from the participant wallet.

A campaign stores the requirement and the configured outcome. It does not store a participant proof.

### Campaign Record

The V2.1 contract stores:

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
participant wallet
+
Sepolia transaction hash
```

The contract normalizes and validates the transaction hash before verification.

The submitted proof must be a 32-byte hexadecimal transaction hash:

```text
0x + 64 hexadecimal characters
```

A 64-character hash without the `0x` prefix is normalized automatically by the contract.

---

## Contract-Controlled Evidence

ProofFlow V2.1 uses a trusted evidence base URL defined inside the Intelligent Contract:

```text
https://proofflow-evidence.floptools.workers.dev/evidence
```

For a submitted transaction hash, the contract derives:

```text
https://proofflow-evidence.floptools.workers.dev/evidence?tx=<TRANSACTION_HASH>&network=sepolia
```

The participant therefore submits a proof, not an evidence URL.

The evidence service retrieves and normalizes blockchain facts. It does **not** determine whether the campaign passed.

That decision remains with GenLayer.

---

## Live Evidence Service

**Worker:**

https://proofflow-evidence.floptools.workers.dev

For the current Ethereum Sepolia flow, normalized evidence may include:

- transaction status;
- network;
- block information;
- timestamp;
- sender;
- recipient;
- contract address;
- decoded ERC20 Transfer events;
- token symbol;
- decimals;
- transferred amount.

The worker acts as an evidence adapter only.

---

## GenLayer Consensus

During `verify_participant`, the Intelligent Contract performs nondeterministic evaluation through GenLayer.

Validators are instructed to evaluate only the supplied campaign requirement and evidence.

The verification rules require validators to confirm, where relevant, that:

1. the evidence identifies the submitted transaction hash;
2. the evidence is for Ethereum Sepolia;
3. the transaction succeeded;
4. the evidence relates to the required participant;
5. sender/from requirements match the participant when required;
6. the complete campaign requirement is satisfied;
7. another transaction or participant is not substituted;
8. unsupported facts are not assumed;
9. ambiguous or insufficient evidence fails verification;
10. evidence is treated as data, not trusted instructions.

The validator result is normalized to:

```json
{
  "passed": true,
  "reasoning": "short factual explanation",
  "evidence_ref": "transaction and evidence used"
}
```

Consensus must produce a valid `PASS` or `FAIL` result.

If evidence evaluation is unavailable or consensus returns an invalid result, the contract rolls back instead of storing an artificial failure.

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

The contract also stores the latest verification ID for each participant/campaign pair.

A finalized proof is marked as used after consensus.

---

## Automatic One-Time Outcomes

V2.1 replaces the old outcome-eligibility model with persistent outcome records.

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

The record is linked to the participant and campaign.

There is no separate claim step in the current V2.1 outcome mechanism.

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

ProofFlow V2.1 implements two replay protections.

### Participant Outcome Replay Protection

Before verification begins, the contract checks whether the participant already has an outcome for that campaign.

If so, verification rolls back with:

```text
outcome already triggered for participant
```

This prevents the same participant from repeatedly triggering the campaign outcome.

### Proof Replay Protection

The contract tracks transaction proofs per campaign.

If a proof has already been consumed for that campaign, verification rolls back with:

```text
proof already used for this campaign
```

This prevents the same transaction from being reused by another participant or resubmitted to the same campaign.

Proof usage is scoped by:

```text
campaign_id + transaction_hash
```

---

## Tested V2.1 Campaign

**Campaign ID:** `1`

**Campaign:** ProofFlow ERC20 Transfer Challenge

**Category:** `ONCHAIN`

**Network:** `SEPOLIA`

**Requirement:**

> Participant must have successfully transferred at least 0.1 Rel ERC20 tokens on Sepolia, and the transfer must originate from the participant wallet.

**Outcome Type:** `ELIGIBILITY`

**Outcome Value:** `PROOFFLOW_VERIFIED`

### Verified Participant

```text
0xe6ad325573eb0b6f8edc7ee5c54d3d6179bbf687
```

### Verified Proof

```text
0x07ea8a8ac3eebdfd3382c49998ccb9dcdce7c6add97f9dfc5c0690dbe6bfe9ef
```

GenLayer verified a successful transfer of:

```text
0.122226 Rel
```

against the required minimum:

```text
0.1 Rel
```

The result was `PASS`, and the campaign outcome was triggered.

The frontend also successfully tested both replay-protection paths:

```text
proof already used for this campaign
```

and:

```text
outcome already triggered for participant
```

---

## Frontend

The ProofFlow interface is built with:

- React;
- Vite;
- `genlayer-js`;
- browser wallet integration.

The current frontend supports:

- connect a compatible browser wallet;
- display and locally disconnect the connected wallet;
- create ONCHAIN campaigns;
- dynamically load campaigns using `get_campaign_count`;
- view campaign requirements and outcomes;
- submit participant wallet + Sepolia transaction proof;
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

V2.1 also distinguishes a timeout from a contract rollback.

A finalized receipt whose leader result contains:

```text
status: rollback
```

is surfaced as the actual contract error instead of being mistaken for a missing verification result.

This is required for clear replay-protection UX.

---

## Intelligent Contract Interface

The deployed V2.1 contract exposes:

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

set_campaign_active(campaign_id, active)

verify_participant(
    campaign_id,
    participant,
    proof,
    verified_at_hint
)

get_verification(verification_id)

get_latest_participant_result(
    participant,
    campaign_id
)

get_outcome(outcome_id)

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

The old V1 `is_outcome_eligible` interface is not part of V2.1.

---

## Campaign Discovery

V2.1 exposes:

```text
get_campaign_count()
```

The frontend reads the campaign count and then loads campaigns from ID `1` through the current count.

ProofFlow therefore does not need a centralized campaign database or the previous contiguous-ID probing workaround.

---

## Campaign Administration

The contract exposes:

```text
set_campaign_active(campaign_id, active)
```

This allows a campaign creator to activate or pause their own campaign.

Verification rejects inactive campaigns.

Campaign verification also respects optional `start_time` and `end_time` values when they are configured.

---

## Trust Model

ProofFlow separates three trust responsibilities.

### Evidence Source

Answers:

> What facts exist?

For the current MVP, this is the Ethereum Sepolia evidence worker.

### ProofFlow Evidence Adapter

Retrieves and normalizes authoritative blockchain facts into a format validators can inspect.

It does not decide PASS or FAIL.

### GenLayer Intelligent Contract

Answers:

> Does this participant-specific evidence satisfy the campaign requirement?

GenLayer is the trust-critical decision layer.

---

## Evidence Safety

Evidence returned from external sources is treated as **data**, not trusted instructions.

The contract explicitly instructs validators to ignore commands, instructions, or prompt-injection attempts contained inside evidence.

Verification should rely only on facts relevant to the campaign requirement.

---

## Error Semantics

ProofFlow distinguishes a genuine failed requirement from an unavailable verification process.

### FAIL

A verification is stored as `FAIL` when validators successfully evaluate the supplied evidence and consensus determines that the requirement was not satisfied.

### ERROR / Rollback

If evidence cannot be fetched, model output cannot be interpreted, or consensus does not produce a valid decision, the contract rolls back.

For example:

```text
verification evaluation unavailable; please retry
```

Infrastructure failure should therefore not be stored as a participant failure.

---

## Supported Category and Network

The current V2.1 MVP supports:

```text
Category: ONCHAIN
Network:  SEPOLIA
```

Other categories remain future extensions.

Potential future verification categories include:

- developer activity;
- GitHub contributions;
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
+-- docs/
|   +-- ARCHITECTURE.md
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

The current V2.1 frontend production build has been validated successfully with Vite.

---

## Current V2.1 Status

Working:

- [x] GenLayer Intelligent Contract V2.1
- [x] Campaign creation
- [x] Campaign retrieval
- [x] Native campaign count
- [x] Campaign activation state
- [x] Ethereum Sepolia proof submission
- [x] Contract-derived trusted evidence URL
- [x] Public Cloudflare evidence service
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
- [x] Participant proof input
- [x] Consensus/result modal UX
- [x] Receipt-timeout recovery
- [x] Contract rollback detection in finalized receipts
- [x] Local production build validation

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
Authoritative Evidence
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

ProofFlow demonstrates how GenLayer Intelligent Contracts can act as a programmable consensus layer between **participant-specific evidence** and **digital outcomes**.

**Verify actions. Trigger outcomes.**
