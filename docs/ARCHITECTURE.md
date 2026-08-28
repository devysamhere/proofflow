\# ProofFlow Architecture



\## 1. Overview



ProofFlow is a programmable proof-of-action platform powered by GenLayer.



It allows organizations, communities, developers, protocols, and other campaign creators to define actions that users must complete. ProofFlow collects evidence that an action occurred and uses GenLayer's intelligent consensus to evaluate that evidence against the campaign's requirements.



Once consensus is reached, ProofFlow records a PASS or FAIL result and can use a successful verification to unlock an outcome such as a reward, credential, payment, access right, or campaign completion.



\### Core Principle



Define an action → Collect evidence → Verify with GenLayer → Reach consensus → Trigger an outcome.



\### Tagline



\*\*Verify actions. Trigger outcomes.\*\*



\---



\## 2. The Problem



Many digital reward, grant, loyalty, bounty, credential, and participation systems depend on proving that someone actually completed an action.



Traditional smart contracts work well when every relevant fact already exists onchain.



However, many useful conditions depend on:



\- blockchain activity across different protocols;

\- GitHub or developer activity;

\- APIs and external platforms;

\- course or program completion;

\- event participation;

\- public records;

\- multiple evidence sources;

\- rules that require interpretation rather than a simple numerical comparison.



Centralized verification solves some of these problems but requires users to trust a single server or organization.



ProofFlow introduces an intelligent verification layer between evidence and outcomes.



\---



\## 3. ProofFlow Workflow



The primary ProofFlow workflow is:



1\. A creator creates a campaign.

2\. The creator defines one or more requirements.

3\. A participant connects a wallet.

4\. The participant completes the required action.

5\. ProofFlow obtains evidence from an appropriate source.

6\. Evidence is supplied to the GenLayer Intelligent Contract.

7\. GenLayer validators independently evaluate the evidence.

8\. Validators reach consensus.

9\. The result becomes PASS or FAIL.

10\. The verification result is recorded.

11\. A successful result can unlock the configured outcome.



High-level flow:



Creator

↓

Campaign

↓

Requirements

↓

Participant

↓

Action

↓

Evidence

↓

GenLayer Validators

↓

Consensus

↓

PASS / FAIL

↓

Outcome



\---



\## 4. Campaign Model



A campaign represents something a participant can complete and have verified.



Each campaign should contain, at minimum:



\- campaign ID

\- creator wallet

\- title

\- description

\- category

\- status

\- start time

\- end time

\- verification requirements

\- evidence configuration

\- outcome configuration

\- creation timestamp



Possible campaign states:



\- DRAFT

\- ACTIVE

\- PAUSED

\- COMPLETED

\- CANCELLED



For the MVP, unnecessary lifecycle complexity may be reduced where appropriate.



\---



\## 5. Verification Categories



ProofFlow v1 will support three major categories.



\### 5.1 ONCHAIN



Used for actions that occur on blockchain networks.



Examples:



\- Swap at least $100 on Uniswap.

\- Supply at least $500 to Aave.

\- Interact with a specified contract.

\- Hold a specified asset.

\- Complete a required transaction.

\- Perform an action within a specified time window.



Possible evidence sources include:



\- blockchain RPC data;

\- transaction receipts;

\- blockchain explorers;

\- indexing services;

\- protocol APIs.



The authoritative evidence must ultimately describe what actually occurred onchain.



\---



\### 5.2 DEVELOPER



Used for developer and open-source activity.



Examples:



\- Submit an accepted contribution to a repository.

\- Have a pull request merged.

\- Complete a qualifying issue.

\- Make qualifying contributions during a specified period.

\- Meet campaign-specific repository activity requirements.



Evidence may come from authoritative developer-platform APIs such as GitHub.



The adapter retrieves the relevant evidence while GenLayer determines whether that evidence satisfies the campaign's rules.



\---



\### 5.3 REAL\_WORLD



Used for externally verifiable activities that are not inherently blockchain transactions.



Examples:



\- event participation;

\- course completion;

\- program milestone completion;

\- grant milestone verification;

\- loyalty activity;

\- qualifying purchases;

\- public-data conditions;

\- API-backed achievements.



ProofFlow does not assume that GenLayer can directly observe the physical world.



A real-world action must have credible digital evidence, such as:



\- an authoritative API;

\- a signed record;

\- an organizer-issued record;

\- a trusted public database;

\- another verifiable digital source.



GenLayer evaluates the available evidence rather than magically determining physical-world facts.



\---



\## 6. Mixed Requirements



A major future capability of ProofFlow is allowing one campaign to combine different verification categories.



Example:



\### Developer Grant Campaign



Participant must:



1\. Have at least three qualifying GitHub contributions.

2\. Complete a specified educational module.

3\. Perform a specified onchain transaction.

4\. Attend a qualifying event.



If all required conditions pass:



→ Participant becomes eligible for a $100 grant.



This demonstrates why ProofFlow is more powerful than a single-purpose blockchain quest application.



\---



\## 7. Evidence Architecture



ProofFlow separates evidence collection from intelligent verification.



\### Evidence Adapter



An adapter communicates with an external data source and converts the returned information into a predictable ProofFlow evidence format.



Examples:



Blockchain Adapter

→ Retrieves transaction information.



GitHub Adapter

→ Retrieves repository, pull request, issue, or contribution information.



External API Adapter

→ Retrieves evidence from an authoritative real-world service.



The adapter does NOT make the final PASS or FAIL decision.



Its responsibility is evidence retrieval and normalization.



The final verification decision belongs to the GenLayer verification layer.



\---



\## 8. Evidence Object



A normalized evidence object should contain information such as:



\- source

\- source type

\- subject

\- action

\- target

\- observed value

\- unit

\- timestamp

\- status

\- reference

\- raw or summarized evidence

\- retrieval timestamp



Different adapters may provide additional fields.



ProofFlow should preserve enough information for validators to independently reason about whether the campaign requirements were satisfied.



\---



\## 9. GenLayer's Role



GenLayer is central to ProofFlow.



ProofFlow must NOT simply call an LLM from the frontend and accept its answer.



The GenLayer Intelligent Contract is responsible for the trust-critical verification decision.



The contract should:



1\. receive or retrieve evidence;

2\. evaluate evidence against campaign requirements;

3\. execute intelligent verification logic;

4\. allow validators to independently evaluate the evidence;

5\. use GenLayer consensus;

6\. determine PASS or FAIL;

7\. store the verification result.



This makes GenLayer part of the application's core trust model rather than an optional feature.



\---



\## 10. Verification Record



Every verification attempt should produce a record containing information such as:



\- verification ID

\- campaign ID

\- participant wallet

\- result

\- evidence reference

\- observed value where applicable

\- reasoning

\- verification timestamp

\- consensus-related information where available



Possible result states:



\- PENDING

\- PASSED

\- FAILED

\- ERROR



The frontend must display the actual transaction and verification lifecycle rather than immediately pretending verification succeeded.



\---



\## 11. Outcome Layer



A successful verification can unlock an outcome.



Possible outcomes include:



\### Reward



Examples:



\- token reward;

\- campaign points;

\- stablecoin reward;

\- prize eligibility.



\### Credential



Examples:



\- completion credential;

\- contributor credential;

\- achievement;

\- verified participation record.



\### Access



Examples:



\- community access;

\- gated content;

\- program eligibility;

\- allowlist membership.



\### Payment



Examples:



\- bounty payment;

\- grant installment;

\- milestone payment.



For the first MVP, we should implement the simplest reliable outcome and design the architecture so additional outcome types can be added later.



\---



\## 12. Reward Safety



ProofFlow must prevent obvious reward abuse.



Important protections include:



\- one claim per qualifying verification where appropriate;

\- campaign status checks;

\- participant verification checks;

\- duplicate claim prevention;

\- creator authorization;

\- reward availability checks;

\- campaign time-window enforcement.



More advanced anti-Sybil mechanisms can be introduced later.



\---



\## 13. Frontend Architecture



The ProofFlow web application will provide two main experiences.



\### Creator Experience



Creators should be able to:



\- connect a wallet;

\- create a campaign;

\- configure verification rules;

\- choose the verification category;

\- configure an evidence source;

\- configure an outcome;

\- activate a campaign;

\- inspect participants;

\- inspect verification results.



\### Participant Experience



Participants should be able to:



\- connect a wallet;

\- browse active campaigns;

\- inspect campaign requirements;

\- complete the required action;

\- request verification;

\- observe verification status;

\- inspect PASS or FAIL results;

\- view reasoning;

\- claim or receive the configured outcome where applicable.



\---



\## 14. Public Verification Page



ProofFlow should provide a clear public verification view.



Example:



VERIFIED BY GENLAYER



Campaign:

Swap ≥ $100 on Uniswap



Participant:

0x2419...e9eb



Observed:

$150



Result:

PASS



Evidence:

Ethereum / Uniswap transaction



Consensus:

Accepted



Outcome:

Eligible



\[View GenLayer Transaction]



This page gives campaigns an understandable proof record that can be independently inspected.



\---



\## 15. Transaction Lifecycle



The frontend must correctly handle the full transaction lifecycle.



Typical states:



1\. Waiting for wallet

2\. Wallet connected

3\. Transaction preparation

4\. User approval

5\. Transaction submitted

6\. GenLayer processing

7\. Consensus pending

8\. Consensus reached

9\. Result retrieved

10\. PASS / FAIL displayed

11\. Outcome available where applicable



Errors must also be surfaced clearly.



\---



\## 16. Contract Architecture



ProofFlow will build on the lessons and verification architecture demonstrated by the previously developed OnchainTaskVerifier Intelligent Contract.



However, ProofFlow is a separate application and repository.



The new contract architecture should support:



\- campaign creation;

\- campaign retrieval;

\- requirement configuration;

\- evidence references;

\- intelligent verification;

\- verification history;

\- participant result lookup;

\- outcome eligibility;

\- creator authorization.



We should reuse proven concepts without unnecessarily modifying the already accepted standalone contract.



\---



\## 17. Offchain Components



Some components are intentionally offchain.



These may include:



\- external API communication;

\- evidence normalization;

\- caching;

\- frontend metadata;

\- adapter configuration;

\- rate-limit management.



Trust-critical PASS/FAIL verification should remain anchored to the GenLayer contract and consensus process.



\---



\## 18. Initial Adapters



ProofFlow v1 should demonstrate at least three meaningful evidence flows.



\### Adapter 1 — Blockchain



Retrieves real blockchain evidence for an onchain campaign.



\### Adapter 2 — GitHub



Retrieves real developer contribution evidence.



\### Adapter 3 — Authoritative External Source



Retrieves evidence for a non-blockchain activity from a credible digital source.



The exact third integration will be selected based on reliability, API accessibility, development time, and demonstration value.



\---



\## 19. MVP Scope



The MVP should prove that ProofFlow works end-to-end.



Required:



\- wallet connection;

\- campaign creation;

\- campaign browsing;

\- multiple verification categories;

\- real evidence retrieval;

\- GenLayer Intelligent Contract integration;

\- GenLayer consensus;

\- PASS / FAIL result;

\- verification history;

\- transaction lifecycle UI;

\- public verification view;

\- at least one functional outcome mechanism;

\- documentation;

\- deployed public frontend.



Nice to have:



\- campaign analytics;

\- creator dashboard;

\- credentials;

\- funded reward pools;

\- multiple-chain support;

\- reusable campaign templates.



\---



\## 20. Out of Scope for Initial MVP



To avoid unnecessary complexity, the first version will NOT attempt to build:



\- a full DAO governance system;

\- a universal oracle network;

\- complex tokenomics;

\- a ProofFlow native token;

\- advanced identity verification;

\- full Sybil resistance;

\- dozens of integrations;

\- cross-chain reward settlement;

\- decentralized file storage infrastructure;

\- a mobile application.



These can be considered after the core product works.



\---



\## 21. Technical Structure



Repository structure:



proofflow/

│

├── contracts/

│   └── GenLayer Intelligent Contracts

│

├── adapters/

│   ├── blockchain evidence

│   ├── developer evidence

│   └── external API evidence

│

├── web/

│   └── ProofFlow frontend

│

├── docs/

│   └── architecture and documentation

│

├── README.md

└── .gitignore



\---



\## 22. Trust Model



ProofFlow separates three responsibilities:



\### Data Source



Answers:



"What evidence exists?"



\### ProofFlow Adapter



Answers:



"How do we retrieve and normalize that evidence?"



\### GenLayer



Answers:



"Does this evidence satisfy the campaign requirements?"



This separation is fundamental to ProofFlow's architecture.



\---



\## 23. Example End-to-End Scenario



Campaign:



"Swap at least $100 into USDC on Uniswap."



Creator configures:



Category:

ONCHAIN



Chain:

Ethereum



Protocol:

Uniswap



Action:

Swap



Target:

USDC



Minimum:

100 USD



Participant connects wallet.



Participant performs the swap.



ProofFlow retrieves real transaction evidence.



The evidence is submitted to the GenLayer verification process.



Validators evaluate:



\- Is this the correct wallet?

\- Is the transaction on Ethereum?

\- Was Uniswap used?

\- Was the action a swap?

\- Was USDC the required target?

\- Was the value at least $100?

\- Did it happen within the allowed period?



Consensus is reached.



If valid:



PASS



The result is stored.



The participant becomes eligible for the campaign outcome.



\---



\## 24. Product Positioning



ProofFlow is not simply a quest application.



It is a programmable verification platform.



Potential users include:



\- Web3 protocols;

\- developer ecosystems;

\- hackathons;

\- grant programs;

\- educational platforms;

\- communities;

\- loyalty programs;

\- event organizers;

\- bounty platforms;

\- organizations requiring verifiable milestones.



The same verification infrastructure can support many different products.



\---



\## 25. ProofFlow Vision



ProofFlow aims to make outcomes programmable based on evidence rather than centralized trust.



Instead of asking:



"Do we trust this person or platform when they say the action happened?"



ProofFlow asks:



"What evidence exists, and does independent GenLayer consensus agree that it satisfies the defined conditions?"



That verified answer can then trigger an outcome.



\*\*ProofFlow — Verify actions. Trigger outcomes.\*\*

