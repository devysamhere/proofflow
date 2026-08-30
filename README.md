# ProofFlow



**Verify actions. Trigger outcomes.**



ProofFlow is a programmable proof-of-action platform powered by **GenLayer**. Organizations define verifiable actions, users complete them, and GenLayer evaluates live or authoritative evidence through validator consensus before determining whether an outcome should be unlocked.



ProofFlow is designed for rewards, quests, credentials, grants, loyalty programs, access control, bounties, agent settlement, and other workflows where an outcome depends on proving that something actually happened.



## Live Demo



**ProofFlow App:**

https://proofflow-8nc.pages.dev



The live demo verifies a real ERC20 transfer performed on Ethereum Sepolia using live blockchain evidence.



## Source Code



https://github.com/devysamhere/proofflow



## GenLayer Deployment



**Network:** GenLayer Studionet



**ProofFlow Intelligent Contract:**

`0xfC46FC2C0Cb8A93b8B653EDe3764ECe1e03D642D`



**Deployment Transaction:**

`0x6f3e76aaf92eb52d34634efbb3ecb040b8f43ce2160046968ad78735b7b2bb2f`



**Explorer:**

https://explorer-studio.genlayer.com/address/0xfC46FC2C0Cb8A93b8B653EDe3764ECe1e03D642D



---



## What Problem Does ProofFlow Solve?



Many applications need to determine whether a user actually completed an action before granting a reward, credential, payment, access right, or other outcome.



Traditional implementations usually rely on:



- A centralized backend

- A manually operated review system

- A single API

- Hard-coded blockchain logic

- One party deciding whether evidence is valid



ProofFlow moves the final verification decision into a **GenLayer Intelligent Contract**.



External systems provide evidence, but they do **not** decide whether the requirement has been satisfied.



GenLayer validators independently evaluate the evidence against the campaign requirement and reach consensus on the result.



---



## How It Works



```text

Organization creates campaign

&#x20;         |

&#x20;         v

Defines verification requirement

&#x20;         |

&#x20;         v

User completes an action

&#x20;         |

&#x20;         v

Live / authoritative evidence

&#x20;         |

&#x20;         v

ProofFlow Intelligent Contract

&#x20;         |

&#x20;         v

Independent GenLayer validator evaluation

&#x20;         |

&#x20;         v

Consensus

&#x20;         |

&#x20;         v

PASS / FAIL

&#x20;         |

&#x20;         v

Reward / Credential / Payment / Access

```



---



## Create and Verify Your Own Campaign

ProofFlow is not limited to a preconfigured demo campaign. Users and reviewers can create a new ONCHAIN verification campaign directly from the production frontend.

The Campaign Creator allows the user to define:

- Campaign title
- Description
- Verification requirement
- Ethereum Sepolia evidence transaction
- Outcome

For the current ONCHAIN MVP, the user only provides the Sepolia transaction hash. ProofFlow automatically constructs the public evidence URL using the ProofFlow evidence worker, so campaign creators do not need to manually build or supply a raw evidence endpoint.

The campaign is submitted through the connected browser wallet and stored by the deployed ProofFlow Intelligent Contract on GenLayer.

Once finalized, the frontend dynamically discovers the newly created campaign and makes it available through **View & Verify**.

The complete user-created flow is:

```text
Create Campaign
      |
      v
Store Campaign on GenLayer
      |
      v
Discover Campaign in Frontend
      |
      v
Submit Participant
      |
      v
Retrieve Live Blockchain Evidence
      |
      v
GenLayer Validator Evaluation
      |
      v
Consensus
      |
      v
PASS / FAIL
      |
      v
Outcome Eligibility
```

### Production Campaign Creator Test

The complete flow was tested from the public ProofFlow frontend by creating a second campaign through the UI.

**Campaign ID:** `2`

**Campaign:** ProofFlow ERC20 Transfer Challenge

**Category:** `ONCHAIN`

**Requirement:**

Participant must have successfully transferred at least 0.1 Rel ERC20 tokens on Sepolia, and the transfer must originate from the participant wallet.

**Outcome:** `PROOFFLOW_VERIFIED`

**Campaign Creation Transaction:**

`0x50a3e720a4200487782ded656ee2401229734faa5ff925d9cf8288347fa4446e`

**Evidence Transaction:**

`0x07ea8a8ac3eebdfd3382c49998ccb9dcdce7c6add97f9dfc5c0690dbe6bfe9ef`

**Participant:**

`0xe6ad325573eb0b6f8edc7ee5c54d3d6179bbf687`

GenLayer evaluated the live Sepolia evidence and stored **Verification ID 6** with:

- `passed: true`
- Observed transfer: `0.122226 Rel`
- Required minimum: `0.1 Rel`
- Outcome eligible: `true`

This demonstrates that ProofFlow supports a complete user-generated lifecycle rather than only a hard-coded demonstration campaign.

---
## Current End-to-End Demo



The production demo verifies a real action on Ethereum Sepolia.



### Campaign



**Sepolia ERC20 Transfer Quest**



Requirement:



> The participant must have successfully transferred at least 0.1 Rel ERC20 tokens on Sepolia, and the transfer must originate from the participant wallet.



### Participant



`0xe6ad325573eb0b6f8edc7ee5c54d3d6179bbf687`



### Sepolia Transaction



`0x07ea8a8ac3eebdfd3382c49998ccb9dcdce7c6add97f9dfc5c0690dbe6bfe9ef`



The transaction contains a successful ERC20 transfer of:



**0.122226 Rel**



---



## Live Evidence API



ProofFlow includes a public evidence service deployed with Cloudflare Workers.



**Worker:**

https://proofflow-evidence.floptools.workers.dev



**Demo Evidence Endpoint:**



```text

https://proofflow-evidence.floptools.workers.dev/evidence?tx=0x07ea8a8ac3eebdfd3382c49998ccb9dcdce7c6add97f9dfc5c0690dbe6bfe9ef\&network=sepolia

```



The evidence service retrieves and normalizes blockchain facts including:



- Transaction status

- Network

- Block

- Timestamp

- Sender

- Recipient

- Contract

- ERC20 Transfer event

- Token symbol

- Decimals

- Transferred amount



The evidence service intentionally does **not** decide PASS or FAIL.



That decision belongs to GenLayer.



---



## GenLayer Verification Flow



When a participant selects **Verify with GenLayer**:



1\. The browser connects through the user's wallet.

2\. The frontend submits `verify_participant` to the ProofFlow Intelligent Contract.

3\. The contract retrieves live evidence.

4\. Validators evaluate the campaign requirement against that evidence.

5\. Validators compare their conclusions through GenLayer consensus.

6\. The finalized verification is stored on GenLayer.

7\. ProofFlow reads the stored result.

8\. The frontend displays the result and outcome eligibility.



The production flow has been tested successfully from the public web application.



---



## Example Result



For the current Sepolia ERC20 campaign, GenLayer verified that:



- The transaction succeeded

- The transfer originated from the required participant wallet

- An ERC20 Transfer event was present

- The token was Rel

- `0.122226 Rel` was transferred

- The required minimum was `0.1 Rel`



The resulting decision is:



```text

PASS

Outcome: ELIGIBLE

```



---



## Trust Model



ProofFlow separates **evidence collection** from **evidence judgment**.



### Evidence Adapters



Adapters retrieve and normalize facts from external systems.



They do not determine whether a campaign has passed.



### Intelligent Contract



The ProofFlow contract:



- Stores campaign requirements

- Retrieves evidence

- Instructs validators how the evidence must be evaluated

- Runs nondeterministic evaluation

- Reaches validator consensus

- Stores finalized verification results

- Exposes outcome eligibility



### Validators



Independent GenLayer validators evaluate the evidence and compare results through consensus.



A single external API or application server therefore does not have unilateral authority over the final verification result.



---



## Error Semantics



ProofFlow distinguishes a genuine failed requirement from a verification-system failure.



A result is only stored as `FAIL` when the evidence was successfully evaluated and the requirement was not satisfied.



If evidence cannot be reliably evaluated, the verification returns an error and should be retried instead of permanently storing an artificial failure.



This prevents infrastructure or evaluation errors from being misrepresented as participant failures.



---



## Evidence Safety



Evidence returned by external sources is treated as **data**, not trusted instructions.



The Intelligent Contract instructs validators to ignore commands or prompt-injection attempts contained inside evidence.



Verification is based only on facts relevant to the campaign requirement.



---



## Campaign Categories



ProofFlow is designed around three verification categories.



### ONCHAIN



Verify actions such as:



- Token transfers

- Swaps

- Lending

- Staking

- Contract interactions

- NFT actions

- Other blockchain activity



The current working MVP implements this category.



### DEVELOPER



Planned support for verifiable developer activity such as:



- GitHub contributions

- Merged pull requests

- Repository activity

- Issue completion

- Deployment evidence



### REAL_WORLD



Planned support for authoritative real-world evidence such as:



- Course completion

- Event participation

- Certifications

- Public records

- API-confirmed milestones



---



## Intelligent Contract Methods



The ProofFlow contract exposes the following main methods:



```text

create_campaign(...)

get_campaign(...)

set_campaign_active(...)

verify_participant(...)

get_verification(...)

get_latest_participant_result(...)

is_outcome_eligible(...)

```



---



## Repository Structure



```text

proofflow/

â”œâ”€â”€ adapters/

â”‚   â”œâ”€â”€ ethereum_rpc.py

â”‚   â”œâ”€â”€ onchain_adapter.py

â”‚   â”œâ”€â”€ transaction_interpreter.py

â”‚   â””â”€â”€ evidence_builder.py

â”‚

â”œâ”€â”€ contracts/

â”‚   â””â”€â”€ proofflow.py

â”‚

â”œâ”€â”€ docs/

â”‚   â””â”€â”€ ARCHITECTURE.md

â”‚

â”œâ”€â”€ web/

â”‚   â””â”€â”€ ProofFlow React frontend

â”‚

â”œâ”€â”€ worker/

â”‚   â””â”€â”€ Cloudflare evidence API

â”‚

â””â”€â”€ README.md

```



---



## Frontend



The ProofFlow interface is built with:



- React

- Vite

- `genlayer-js`

- Browser wallet integration



The interface handles the complete transaction lifecycle:



```text

Wallet

&#x20; ->

Submit

&#x20; ->

Consensus

&#x20; ->

Result

```



The completed result view displays:



- PASS / FAIL

- Validator reasoning

- Evidence

- Transaction reference

- Verification ID

- Outcome eligibility



---



## Production Frontend Capabilities

The public ProofFlow frontend directly interacts with the deployed GenLayer Intelligent Contract and handles the complete campaign and verification lifecycle.

Current capabilities include:

- Connect a compatible browser wallet
- Display the connected wallet
- Disconnect the wallet from the local ProofFlow session
- Create ONCHAIN campaigns from the browser
- Automatically construct Sepolia evidence URLs from transaction hashes
- Dynamically discover campaigns stored on GenLayer
- Select any discovered campaign for verification
- Submit participant verification transactions
- Track GenLayer consensus progress
- Read persisted verification results
- Display PASS / FAIL
- Display validator reasoning and evidence references
- Display verification IDs
- Check and display outcome eligibility
- Recover from browser receipt-wait timeouts without incorrectly reporting a successful verification as failed

### Resilient GenLayer Finalization

GenLayer consensus may sometimes take longer than the browser SDK receipt waiter expects.

ProofFlow therefore does not automatically interpret a receipt-wait timeout as a failed verification.

When this occurs, the frontend checks the Intelligent Contract for a stored participant result. If necessary, it polls the contract for a short recovery window before offering another attempt.

If GenLayer has already finalized and persisted the verification, ProofFlow retrieves that result and displays the actual PASS / FAIL state and outcome eligibility.

This prevents browser timing behavior from being confused with the result of validator consensus.

### Campaign Discovery

The currently deployed contract does not expose a public campaign-count view method. The frontend therefore discovers campaigns by reading contiguous campaign IDs from GenLayer until it reaches the first campaign that does not exist.

This allows campaigns created through the production UI to appear dynamically without maintaining a separate centralized campaign database.

### Wallet Disconnect

The Disconnect control clears ProofFlow's local connected-wallet session. Revoking a site's permission inside a browser wallet such as MetaMask remains controlled by the wallet itself.

---
## Run the Frontend Locally



Enter the frontend directory:



```bash

cd web

```



Install dependencies:



```bash

npm install

```



Start the development server:



```bash

npm run dev

```



Create a production build:



```bash

npm run build

```



---



## Evidence Adapter Development



The current demo uses Ethereum Sepolia.



The adapter pipeline retrieves transaction information from a public Ethereum RPC endpoint, interprets transaction data and logs, and produces normalized evidence for the GenLayer contract.



The adapter does not determine campaign eligibility.



---



## Networks



### Verification



**GenLayer Studionet**



### Demo Evidence



**Ethereum Sepolia**



Chain ID: `11155111`



---



## Why GenLayer Is Central



ProofFlow would lose its core trust model without GenLayer.



The important part of ProofFlow is not simply retrieving blockchain data. The core problem is deciding whether potentially complex external evidence satisfies a human-readable requirement without placing that decision entirely under the control of one backend.



GenLayer enables ProofFlow to combine:



- Programmable Intelligent Contracts

- External evidence

- Nondeterministic reasoning

- Multiple validators

- Consensus

- Persistent verification state



This allows applications to build outcomes around independently evaluated proof instead of trusting a single verifier.



---



## Current MVP Status



Working today:



- [x] GenLayer Intelligent Contract

- [x] Campaign creation

- [x] Campaign state

- [x] Live Ethereum Sepolia evidence

- [x] Transaction interpretation

- [x] ERC20 Transfer decoding

- [x] Evidence normalization

- [x] Public Cloudflare evidence API

- [x] GenLayer validator evaluation

- [x] Consensus-based PASS / FAIL

- [x] Persistent verification records

- [x] Outcome eligibility

- [x] Browser wallet integration

- [x] React frontend

- [x] Complete transaction lifecycle UI

- [x] Public production deployment

- [x] End-to-end production verification

- [x] Browser campaign creator

- [x] Dynamic campaign discovery

- [x] Campaign-specific verification

- [x] Automatic Sepolia evidence URL construction

- [x] Wallet connect / disconnect UX

- [x] Reviewer-created production campaign

- [x] Resilient GenLayer finalization recovery



---



## GenVM Local Tooling Note



The contract source passes the available local GenVM lint checks.



The local validation environment currently cannot load the historical GenLayer SDK runner referenced by the deployed contract and reports:



```text

Failed to load SDK:

filename 'runners/py-genlayer/15/qfivjvy80800rh998pcxmd2m8va1wq2qzqhz850n8ggcr4i9q0.tar' not found

```



This is a local runner-archive availability issue rather than a contract lint failure.



The contract itself is deployed and functioning on GenLayer Studionet, where the complete verification flow has successfully reached validator consensus.



---



## Product Vision



ProofFlow can become a reusable verification layer for applications that need trustworthy proof that an action occurred.



Instead of every application building its own centralized verification backend, developers could define:



```text

Action

\+

Requirement

\+

Evidence source

\+

Outcome

```



and let GenLayer determine whether the proof satisfies the requirement.



Potential integrations include:



- Web3 quests

- Token incentives

- Grants

- Bounties

- Loyalty systems

- Credentials

- Education

- Developer rewards

- Communities

- Agent workflows

- Conditional payments

- Access control



---



## Built for GenLayer



ProofFlow demonstrates how GenLayer Intelligent Contracts can act as a programmable consensus layer between **real-world or onchain evidence** and **digital outcomes**.



**Verify actions. Trigger outcomes.**

