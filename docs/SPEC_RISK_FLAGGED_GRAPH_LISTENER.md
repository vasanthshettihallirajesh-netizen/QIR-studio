# TECHNICAL SPECIFICATION: GRAPH LISTENER & RISK ATTESTATION ENGINE
**Document Version:** 1.0.0-PROD  
**Ledger Target:** Core Schema v1 (Append-Only Event Ledger)  
**Classification:** Engineering Architecture & Protocol Specification  
**Status:** Ready for Implementation / RFC  

---

## EXECUTIVE SUMMARY & ARCHITECTURAL SCOPE

The Core Schema v1 protocol defines an immutable, append-only, cryptographically verified event ledger for decentralized marketplace transactions. All state transitions—from deal formulation and escrow custody to deliverable submission, peer precheck, and dispute jury resolution—are memorialized as canonically serialized, Ed25519-signed events linked via cryptographic SHA-256 parent hash pointers (`prevHash`).

This specification establishes the architectural blueprint for the **Graph Listener & Risk Attestation Engine**. The engine operates as an asynchronous, deterministic, read-optimized daemon that continuously ingests raw ledger events, maintains an in-memory directed property multigraph of market participants and economic flows, executes topological anomaly detection algorithms, and emits non-blocking risk assessments back to the ledger via a novel `RiskFlagged` event type.

### Core Architectural Invariants

1. **Non-Blocking Attestation Model:** Risk evaluations do not execute inline with financial consensus, nor do they mutate ledger validation gates. Settlement operations (`DealAccepted`, `EscrowReleased`) proceed without blocking on risk calculations. Downstream consumers (wallets, marketplace search indexes, settlement escrow managers, and automated circuit breakers) query the risk attestation graph at their own policy boundaries.
2. **Open Authority Pattern ("Valid Only If Recomputed"):** Analogous to the schema's `JuryAssigned` and `DisputeResolved` primitives, any network participant or monitoring node may sign and publish a `RiskFlagged` envelope. An emitted risk attestation carries zero intrinsic authoritative weight based solely on the signer's identity. Instead, downstream consumers execute deterministic recomputation over the specified ledger window and graph parameters. If recomputation yields divergent results, the attestation is discarded.
3. **Immutability & Monotonicity:** Historical risk attestations are never mutated or expunged from the ledger. Updates, recalibrations, false-positive rectifications, and formal appeals are handled strictly via deterministic supersession chains anchored by cryptographic parent references (`supersedes_ref`).

---

## 1. PROPOSED `RiskFlagged` EVENT DESIGN

Per §10 of Core Schema v1, the protocol permits additive event types that adhere to strict envelope conventions, canonical JSON serialization, and Ed25519 signature guarantees. `RiskFlagged` follows the structured attestation pattern instantiated by `PrecheckCompleted` and `JuryVoted`.

### 1.1 TypeScript Interface Definitions

```typescript
// ============================================================================
// Core Schema v1 Type Primitives
// ============================================================================
export type Pubkey = string; // Ed25519 SPKI-DER, base64
export type Hash   = string; // SHA-256 lowercase hex: /^[a-f0-9]{64}$/
export type Sig    = string; // Ed25519 signature, base64, 64 bytes
export type Uuid   = string; // lowercase UUIDv4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export type Amount = number; // positive safe integer: Number.isSafeInteger(n) && n > 0
export type IsoUtc = string; // YYYY-MM-DDTHH:mm:ss.sssZ

export interface EventEnvelope<T extends string, P> {
  readonly type: T;
  readonly version: 1;
  readonly payload: P;
  readonly signer: Pubkey;
  readonly timestamp: IsoUtc;
  readonly prevHash: Hash | null;
  readonly signature: Sig;
}

// ============================================================================
// Risk Attestation Sub-Types
// ============================================================================
export type RiskSubjectType = 'account' | 'deal';

export type RiskSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskCategory = 
  | 'WASH_TRADING_CIRCULAR'
  | 'REPUTATION_FARMING'
  | 'JURY_COLLUSION_CLIQUE'
  | 'ESCROW_VELOCITY_ANOMALY'
  | 'STRUCTURING_UNDER_REPORTING'
  | 'PRECHECK_BYPASS_EXPLOIT'
  | 'RAPID_DISPUTE_ABUSE';

export interface AttestationEvidence {
  readonly rule_id: string;
  readonly metric_name: string;
  readonly observed_value: number; // Scaled integer (basis points: 10000 = 100.00%)
  readonly threshold_value: number; // Scaled integer
  readonly supporting_event_hashes: readonly Hash[];
  readonly graph_subgraph_hash: Hash;
}

export interface RiskAttestationBody {
  readonly attestation_id: Uuid;
  readonly subject_type: RiskSubjectType;
  readonly subject_id: string; // Pubkey if 'account', Uuid if 'deal'
  readonly category: RiskCategory;
  readonly severity: RiskSeverity;
  readonly confidence_score: number; // Integer: 1 to 10000 (basis points, 10000 = 100.00%)
  readonly evidence: readonly AttestationEvidence[];
  readonly ruleset_version: string; // Semantic version e.g. "1.4.0"
  readonly ledger_window_start: Hash; // Lower bound event hash evaluated
  readonly ledger_window_end: Hash;   // Upper bound event hash evaluated
  readonly supersedes_ref: Hash | null; // Previous RiskFlagged event hash, or null
  readonly nonce: Uuid;
}

export interface RecomputationManifest {
  readonly algorithm_id: string; // Deterministic algo identifier, e.g. "tarjan-scc-v1"
  readonly parameter_hash: Hash; // SHA-256 hash of canonical detector hyperparameters
  readonly ledger_window_start: Hash;
  readonly ledger_window_end: Hash;
  readonly state_checkpoint_hash: Hash; // Graph state root hash at window_start
}

export interface RiskFlaggedPayload {
  readonly attestation_body: RiskAttestationBody;
  readonly attestation_sig: Sig; // Ed25519 signature over ("skillx/v1/risk-flag\n" + canonical(body))
  readonly recomputation_manifest: RecomputationManifest;
}

export type RiskFlaggedEvent = EventEnvelope<'RiskFlagged', RiskFlaggedPayload>;
```

### 1.2 Cryptographic Verification & Canonical Attestation Flow

The `RiskFlagged` event adheres to a two-tier cryptographic attestation pipeline:

```
+----------------------------------------------------------------------------------------------------+
| 1. Inner Attestation Signature (Claim Integrity)                                                   |
|    attestation_sig = Ed25519_Sign(                                                                 |
|        signer_privkey,                                                                             |
|        UTF8_Bytes("skillx/v1/risk-flag\n" + CanonicalJSON(payload.attestation_body))              |
|    )                                                                                               |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| 2. Outer Envelope Signature (Ledger Admission & Ordering)                                         |
|    envelope.signature = Ed25519_Sign(                                                              |
|        signer_privkey,                                                                             |
|        UTF8_Bytes(CanonicalJSON(envelope_without_signature))                                       |
|    )                                                                                               |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| 3. Event Identifier (Immutable Chain Linking)                                                      |
|    event_hash = SHA256_Hex(UTF8_Bytes(CanonicalJSON(complete_signed_envelope)))                   |
+----------------------------------------------------------------------------------------------------+
```

#### Deterministic Envelope Validation Pipeline:
1. **Schema Check:** Envelope matches `version: 1`, `type: 'RiskFlagged'`, with strictly conforming keys (rejecting `__proto__`, undefined, floating-point numbers, or unregistered fields).
2. **Time Window Check:** `timestamp` must fall between `now - 365 days` and `now + 5 minutes`.
3. **Cross-Field Assertion:**
   - If `subject_type === 'account'`, `subject_id` must match `Pubkey` regex.
   - If `subject_type === 'deal'`, `subject_id` must match `Uuid` regex.
   - `confidence_score` must be an integer within `[1, 10000]`.
   - `supersedes_ref` must either be `null` or a 64-character lowercase hex string (`Hash`).
4. **Attestation Signature Verification:**
   - Calculate `payload_digest = SHA256("skillx/v1/risk-flag\n" + canonical(payload.attestation_body))`.
   - Verify `attestation_sig` against `envelope.signer`.
5. **Outer Envelope Signature Verification:**
   - Strip `signature` field, canonicalize JSON, verify against `envelope.signer`.
6. **Open Authority Deterministic Recomputation:**
   - Client executes the graph traversal routine identified in `recomputation_manifest.algorithm_id` using parameters committed in `recomputation_manifest.parameter_hash` over the historical slice `[ledger_window_start, ledger_window_end]`.
   - If the generated `RiskAttestationBody` differs by even 1 byte from the published payload, downstream systems flag the attestation as `REJECTED_INVALID_RECOMPUTATION` and ignore it.

---

## 2. (a) CONSUMED EVENT TYPES

The Graph Listener continuously monitors the append-only ledger, parsing events and updating the directed graph projection. Below is the mapping of consumed Core Schema v1 event types to graph state mutations:

| Consumed Event Type | Extracted Fields | Graph State Mutation & Topological Meaning |
| :--- | :--- | :--- |
| `AccountCreated` | `account_id (Pubkey)`, `timestamp` | Inserts `Account` node $v_A$. Initializes reputation vector, volume accumulators, and zero-degree state. |
| `DealCreated` | `deal_id (Uuid)`, `buyer (Pubkey)`, `amount`, `terms_hash`, `timestamp` | Inserts `Deal` node $v_D$. Emits directed edge: $(v_{Buyer} \xrightarrow{\text{PARTICIPATES\_IN [role: BUYER]}} v_D)$. Records escrow expectation. |
| `DealConsented` | `deal_id (Uuid)`, `seller (Pubkey)`, `timestamp` | Emits directed edge: $(v_{Seller} \xrightarrow{\text{PARTICIPATES\_IN [role: SELLER]}} v_D)$. Transitions $v_D$ state to `CONSENTED`. |
| `EscrowFunded` | `deal_id (Uuid)`, `funder (Pubkey)`, `amount`, `timestamp` | Transitions $v_D$ state to `ESCROW_LOCKED`. Updates buyer's historical outflow accumulator and deals-in-flight counter. |
| `DeliverableSubmitted` | `deal_id (Uuid)`, `seller (Pubkey)`, `artifact_hash`, `timestamp` | Emits `DELIVERED` state on $v_D$. Computes deliverable turnaround velocity: $\Delta t = t_{DeliverableSubmitted} - t_{EscrowFunded}$. |
| `PrecheckCompleted` | `deal_id (Uuid)`, `checker_id (Pubkey)`, `result`, `score`, `timestamp` | Emits directed edge: $(v_{Checker} \xrightarrow{\text{VALIDATED}} v_D)$. Triggers checker-seller collusion check. |
| `DealAccepted` | `deal_id (Uuid)`, `buyer (Pubkey)`, `timestamp` | Transitions $v_D$ state to `ACCEPTED`. Marks path for settlement flow validation. |
| `DealRejected` | `deal_id (Uuid)`, `buyer (Pubkey)`, `reason_hash`, `timestamp` | Transitions $v_D$ state to `REJECTED`. Increments buyer rejection frequency metrics. |
| `DisputeOpened` | `deal_id (Uuid)`, `initiator (Pubkey)`, `claim_hash`, `timestamp` | Transitions $v_D$ state to `DISPUTED`. Inserts `Dispute` sub-entity, attaches dispute counter on initiator and respondent. |
| `JuryAssigned` | `deal_id (Uuid)`, `jurors (Pubkey[])`, `seed_hash`, `timestamp` | Emits $N$ assignment edges: $(v_{Juror_i} \xrightarrow{\text{ASSIGNED\_TO}} v_D)$. Enforces assignment randomness verification against `seed_hash`. |
| `JuryVoted` | `deal_id (Uuid)`, `juror (Pubkey)`, `vote_choice`, `timestamp` | Emits directed edge: $(v_{Juror} \xrightarrow{\text{VOTED\_FOR}} v_D)$. Updates co-voting matrix across all pairwise jurors. |
| `DisputeResolved` | `deal_id (Uuid)`, `resolution_split`, `timestamp` | Transitions $v_D$ state to `RESOLVED`. Computes juror conformity scores and consensus alignment. |
| `EscrowReleased` | `deal_id (Uuid)`, `recipient (Pubkey)`, `amount`, `timestamp` | Emits economic edge: $(v_D \xrightarrow{\text{SETTLED\_PAYOUT [amount]}} v_{Seller})$. Updates net volume flows between counterparties. |
| `FeeBurned` | `deal_id (Uuid)`, `burn_amount`, `timestamp` | Records platform protocol fee sink. Validates conservation of balance across the deal lifecycle. |
| `ReputationEvent` | `target (Pubkey)`, `delta`, `source_deal`, `timestamp` | Emits edge: $(v_{Source} \xrightarrow{\text{REPUTATION\_LINK [\Delta r]}} v_{Target})$. Updates target node cumulative PageRank and reputation vector. |
| `RiskFlagged` | `subject_id`, `category`, `severity`, `supersedes_ref`, `timestamp` | Emits edge: $(v_{Attestation} \xrightarrow{\text{RISK\_ATTESTATION}} v_{Subject})$. Checks and updates the active risk frontier and supersession graph. |

---

## 3. (b) GRAPH STATE MAINTENANCE

To guarantee deterministic, low-latency graph queries without sacrificing cryptographic auditability, the engine maintains an in-memory directed property multigraph $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ backed by append-only ledger checkpoints.

### 3.1 Node Structure Schema

#### Account Node ($v_A \in \mathcal{V}_{Account}$)
```typescript
export interface AccountNodeState {
  readonly pubkey: Pubkey;
  readonly first_seen_at: IsoUtc;
  readonly first_seen_block: Hash;
  deals_as_buyer_count: number;
  deals_as_seller_count: number;
  gross_bought_volume: Amount;
  gross_sold_volume: Amount;
  settled_counterparties: Map<Pubkey, number>; // Counterparty Pubkey -> Deal Count
  total_disputes_participated: number;
  total_disputes_lost: number;
  jury_duty_count: number;
  reputation_raw_score: number;
  eigen_trust_rank: number; // Normalized basis points [0, 10000]
  active_risk_flags: Map<RiskCategory, Hash>; // Category -> Event Hash of active flag
}
```

#### Deal Node ($v_D \in \mathcal{V}_{Deal}$)
```typescript
export type DealLifecycleState = 
  | 'CREATED' | 'CONSENTED' | 'ESCROW_LOCKED' | 'DELIVERED' 
  | 'ACCEPTED' | 'REJECTED' | 'DISPUTED' | 'RESOLVED' | 'SETTLED';

export interface DealNodeState {
  readonly deal_id: Uuid;
  readonly creation_event_hash: Hash;
  buyer_id: Pubkey;
  seller_id: Pubkey | null;
  state: DealLifecycleState;
  escrow_amount: Amount;
  created_at: IsoUtc;
  consented_at: IsoUtc | null;
  funded_at: IsoUtc | null;
  delivered_at: IsoUtc | null;
  accepted_at: IsoUtc | null;
  settled_at: IsoUtc | null;
  dispute_id: Uuid | null;
  assigned_jurors: Set<Pubkey>;
  juror_votes: Map<Pubkey, { choice: string; timestamp: IsoUtc }>;
}
```

### 3.2 Directional Edge Semantics

The multigraph supports multiple directed edges between identical node pairs, distinguished by type and timestamp:

1. **`PARTICIPATES_IN`** $(v_{Account} \to v_{Deal})$:
   - Attributes: `{ role: 'BUYER' | 'SELLER', timestamp: IsoUtc, initial_stake: Amount }`
   - Semantics: Establishes contractual obligation and counterparty relationship.
2. **`VOTED_FOR`** $(v_{Account} \to v_{Deal})$:
   - Attributes: `{ vote_choice: 'REFUND_BUYER' | 'PAY_SELLER' | 'SPLIT', fee_claim: Amount, timestamp: IsoUtc }`
   - Semantics: Records juror adjudication behavior for collusion ring clustering.
3. **`REPUTATION_LINK`** $(v_{Source} \to v_{Account})$:
   - Attributes: `{ delta: number, source_deal_id: Uuid, decay_factor: number, timestamp: IsoUtc }`
   - Semantics: Directed flow of social/economic trust. Cycles of reputation links are prime candidates for wash detection.
4. **`RISK_ATTESTATION`** $(v_{RiskEvent} \to v_{Subject})$:
   - Attributes: `{ category: RiskCategory, severity: RiskSeverity, confidence_score: number, supersedes_ref: Hash | null }`
   - Semantics: Attaches a cryptographic warning to an account or deal without altering ledger execution state.
5. **`SETTLED_PAYOUT`** $(v_{Deal} \to v_{Account})$:
   - Attributes: `{ amount: Amount, burned_fee: Amount, timestamp: IsoUtc }`
   - Semantics: Confirms transfer of capital; completes the counterparty credit cycle.

---

## 4. (c) PATTERNS + THRESHOLDS

The engine runs three distinct heuristic detection pipelines across each sliding graph window. Each rule features rigorous mathematical definitions, operational pseudocode, and fixed parameter thresholds.

### 4.1 Pattern 1: Circular Reputation Farming & Wash Trading (Sybil Rings)

#### Topology & Threat Model
A closed ring of $k$ accounts $\{A_1, A_2, \dots, A_k\}$ creates synthetic deals among themselves, funding escrows and releasing funds in cyclic fashion ($A_1 \to A_2 \to \dots \to A_k \to A_1$). The objective is to farm positive `ReputationEvent` transitions and inflate marketplace transaction volume while recycling the same capital.

#### Mathematical Formulation & Detection Criteria
A directed subgraph $\mathcal{G}_{sub} = (\mathcal{V}_{sub}, \mathcal{E}_{sub})$ constitutes an actionable Wash Ring if and only if:
1. **Cycle Existence:** There exists an elementary directed cycle $C = (v_1, e_1, v_2, e_2, \dots, v_k, e_k, v_1)$ where $k \in [2, 6]$.
2. **Volume Recycling Ratio:**
   $$\text{VRR}(C) = \frac{\sum_{i=1}^k \text{Amount}(e_i)}{\text{ExternalInflow}(\mathcal{V}_{sub})} > 3.0$$
   where $\text{ExternalInflow}(\mathcal{V}_{sub})$ is the total settled volume originating from accounts outside $\mathcal{V}_{sub}$ within the past 30 days.
3. **Turnaround Velocity Anomaly:**
   $$\text{MeanCompletionTime}(C) = \frac{1}{k} \sum_{i=1}^k (t_{Accepted}(D_i) - t_{Created}(D_i)) < 300\text{ seconds}$$
4. **Counterparty Reciprocity Index:**
   $$\text{CRI}(A, B) = \frac{\min(\text{Vol}(A \to B), \text{Vol}(B \to A))}{\max(\text{Vol}(A \to B), \text{Vol}(B \to A))} > 0.85 \quad \text{for } \text{TotalDeals} \ge 5$$

---

### 4.2 Pattern 2: Jury Collusion Rings & Co-Voting Cliques

#### Topology & Threat Model
A syndicate of juror accounts coordinates to control dispute outcomes on assigned deals. When a colluding buyer or seller opens a dispute, members of the syndicate vote in lockstep to guarantee a specific party wins, dividing the disputed escrow and earning jury reward fees.

#### Mathematical Formulation & Detection Criteria
For any pair of jurors $(J_1, J_2)$ that have been co-assigned to $N_{co} \ge 8$ mutual disputes within a 90-day window:
1. **Jaccard Agreement Index:**
   $$J_{\text{vote}}(J_1, J_2) = \frac{|D(J_1) \cap D(J_2)|_{\text{same\_choice}}}{|D(J_1) \cap D(J_2)|_{\text{total\_disputes}}} > 0.90$$
2. **Outcome Skewness (Chi-Square $\chi^2$ Baseline Test):**
   Evaluate the distribution of votes cast by juror $J$ relative to the aggregate non-syndicate network distribution:
   $$\chi^2 = \sum_{k \in \{\text{Buyer}, \text{Seller}\}} \frac{(O_k - E_k)^2}{E_k}$$
   A clique is flagged if $p < 0.001$ ($\chi^2 > 10.828$ with $df = 1$), indicating statistical deviation from organic community distributions.
3. **Beneficiary Concentration:**
   $$\text{BCI}(J_1, J_2 \to \text{Seller}_S) = \frac{|\text{Votes favoring } S|}{|\text{Total co-assigned votes involving } S|} > 0.85$$

---

### 4.3 Pattern 3: Escrow Velocity Anomalies & Structuring Micro-Churn

#### Topology & Threat Model
An entity rapidly churns deals through the protocol at speeds that preclude legitimate human or computational verification, or deliberately fragments transactions into micro-amounts below threshold lines (structuring) to evade prechecks or manual review gates.

#### Mathematical Formulation & Detection Criteria
1. **Short-Term Escrow Velocity Spike:**
   $$\text{VelocityMultiplier} = \frac{V_{7d}}{\max(V_{30d\_avg}, 1000)} > 5.0$$
2. **Instant Delivery Abuse:**
   Fraction of completed deals where deliverable submission occurs almost instantly post-funding:
   $$F_{\text{instant}} = \frac{|\{d \in \text{Deals}(A) \mid (t_{DeliverableSubmitted} - t_{EscrowFunded}) < 15\text{ seconds}\}|}{|\text{Deals}(A)|} > 0.40$$
3. **Threshold Structuring Index (Smurfing):**
   Deal counts clustering in the band $[0.90 \cdot T_{\text{precheck}}, 0.99 \cdot T_{\text{precheck}}]$ at a density $4\times$ greater than the uniform historical deal-size density.

---

## 5. (d) FALSE-POSITIVE HANDLING & MITIGATION

### 5.1 Account Age and Volume Weighting

High-volume institutional market makers and programmatic arbitrage bots exhibit velocity patterns that trip naive threshold alarms. Raw anomaly metrics are adjusted by a two-factor dampening coefficient $W(A)$:

$$W(A) = W_{\text{age}}(A) \times W_{\text{vol}}(A)$$

Where:
$$W_{\text{age}}(A) = 1.0 + \ln\left(1 + \frac{\Delta t_{\text{account\_age\_days}}}{90}\right)$$
$$W_{\text{vol}}(A) = 1.0 + \log_{10}\left(1 + \frac{\text{SettledHistoricalVolume}(A)}{10{,}000}\right)$$

$$\text{Threshold}_{\text{adjusted}} = \text{Threshold}_{\text{nominal}} \times W(A)$$

### 5.2 Multi-Observer Quorum & Cross-Validation

| Target Severity | Required Observer Quorum ($k$-of-$m$) | Independent Signer Constraints |
| :--- | :--- | :--- |
| `INFORMATIONAL` | 1 of $N$ | Any registered listener node. |
| `LOW` | 1 of $N$ | Valid recomputation hash. |
| `MEDIUM` | 2 of $m$ independent listeners | Distinct staking pubkeys and zero co-tenancy. |
| `HIGH` | 3 of $m$ independent listeners | Minimum 24-hour observation window or $95\%$ confidence score. |
| `CRITICAL` | 5 of $m$ independent listeners | Requires full recomputation alignment across $100\%$ of quorum nodes. |

---

## 6. (e) FLAG RETRACTION AND SUPERSESSION

In an append-only ledger, records cannot be mutated, scrubbed, or deleted. Corrections, false-positive rectifications, successful user appeals, and risk status degradations must be executed as forward-progressing cryptographic supersessions.

### 6.1 The `supersedes_ref` Mechanics

1. **Pointing to Prior State:** Any `RiskFlagged` payload may supply a non-null `supersedes_ref` field containing the lowercase hex `Hash` of a prior `RiskFlagged` event envelope.
2. **Resolution Graph Traversal:** When computing the active risk profile for a subject, the graph engine traverses the DAG:
   $$\text{ActiveFlag}(Subject, Category) = \text{Leaf}_{\text{highest\_timestamp}}(\text{Chain}(\text{supersedes\_ref}))$$

---

## 7. (f) METRICS & TELEMETRY SPECIFICATION

| Metric Name | Type | Label Dimensions | Description & Unit |
| :--- | :--- | :--- | :--- |
| `graph_listener_ingestion_events_total` | Counter | `event_type`, `status` | Total number of ledger events processed by the listener. |
| `graph_listener_ingestion_lag_events` | Gauge | `partition`, `stream_id` | Difference between the latest ledger head sequence and the graph cursor. |
| `graph_listener_ingestion_duration_seconds` | Histogram | `event_type` | Latency incurred to parse, verify signatures, and apply graph mutations. |
| `graph_state_nodes_count` | Gauge | `node_type` | Active count of distinct nodes stored in graph memory. |
| `graph_state_edges_count` | Gauge | `edge_type` | Active count of directed edges maintained in the graph projection. |
| `graph_state_memory_bytes` | Gauge | `segment` | Total resident memory allocated by the graph engine (bytes). |
| `risk_detection_run_duration_seconds` | Histogram | `detector_id` | Execution latency of heuristic detection algorithms over graph windows. |
| `risk_attestations_emitted_total` | Counter | `category`, `severity` | Number of `RiskFlagged` event envelopes broadcast to the network. |
| `risk_recomputation_evaluations_total` | Counter | `algorithm_id`, `result` | Total number of recomputations executed by downstream consumer nodes. |
| `risk_flag_supersessions_total` | Counter | `category`, `action` | Total number of risk flags superseded via forward append-only events. |
| `risk_false_positive_recovery_ratio` | Gauge | `category`, `ruleset_version` | Rolling 30-day ratio: Retractions / EmittedFlags. Target: $< 0.02$ ($2\%$). |
| `risk_quorum_consensus_latency_seconds` | Histogram | `severity` | Elapsed seconds to reach required multi-observer quorum. |

---

## 8. COMPLETE END-TO-END VERIFICATION WORKFLOW

```
Timeline  Ledger Event Streams                           Graph Engine & Policy Lifecycle
────────  ────────────────────────────────────────────    ──────────────────────────────────────────────────
T0        AccountCreated (A_1), AccountCreated (A_2)     Nodes v_{A1}, v_{A2} seeded in memory
T1        DealCreated (D_1: A_1 -> A_2, $10,000)         Edge (v_{A1} -[PARTICIPATES_IN]-> v_{D1}) created
T2        DealConsented (D_1), EscrowFunded (D_1)        v_{D1} status = ESCROW_LOCKED
T3        DeliverableSubmitted (D_1, t + 4 seconds)      Rapid turnaround flag recorded (dt = 4s)
T4        DealAccepted (D_1), EscrowReleased (D_1)       v_{D1} status = SETTLED; Volume flows A_1 -> A_2
T5        DealCreated (D_2: A_2 -> A_1, $9,950)          Reverse counterparty deal initiated
T6        EscrowFunded (D_2), DeliverableSubmitted (D_2) Instant turnaround repeated (dt = 3s)
T7        DealAccepted (D_2), EscrowReleased (D_2)       Reverse flow completes closed cycle C = (A_1, A_2, A_1)
T8        [DETECTOR TRIGGERED]                           detectCircularWashTrading() fires: VRR=39.9, dt=3.5s, CRI=0.995
T9        RiskFlagged Emitted (Hash: 0x9a8f...)          Listener signs inner attestation & outer envelope; appends to ledger
T10       [DOWNSTREAM POLICY CONSUMER]                   Search index recomputes graph slice: VALID. Dampens search rank 80%
T11       [APPEAL & RECTIFICATION]                       Entities submit proof of high-frequency market making
T12       RiskFlagged (Supersession) (Hash: 0xbb42...)   Auditor appends superseding event (confidence_score: 0, supersedes: 0x9a8f...)
T13       [GRAPH STATE RESOLUTION]                       Engine updates DAG leaf to 0xbb42...; search rank restored natural
```

---

## 9. CONCLUSION & PRODUCTION READINESS CHECKLIST

- [x] **Schema Conformance:** Envelope fields, canonical JSON ordering, and Ed25519 signing primitives comply strictly with Core Schema v1.
- [x] **Open Authority Invariant:** Complete decoupling of attestation generation and validation; all policy consumers recompute state before acting.
- [x] **Non-Blocking Execution:** Financial settlement channels (`DealAccepted`, `EscrowReleased`) remain isolated from analytical daemon workloads.
- [x] **Forward Retraction:** Supersession DAG mechanics provide cryptographic auditability without mutating ledger history.
- [x] **Production Telemetry:** Prometheus metrics and alerting rules monitor latency, throughput, recomputation consensus, and false-positive recovery ratios.
