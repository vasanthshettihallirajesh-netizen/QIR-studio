import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color Palette Constants
const COLOR_PRIMARY = '1E3A8A'; // Deep Navy
const COLOR_SECONDARY = '2563EB'; // Royal Blue
const COLOR_TEXT = '1F2937'; // Slate 800
const COLOR_MUTED = '64748B'; // Slate 500
const COLOR_CODE_BG = 'F1F5F9'; // Slate 100
const COLOR_CODE_BORDER = 'CBD5E1'; // Slate 300
const COLOR_HEADER_BG = '1E3A8A';
const COLOR_ROW_ALT = 'F8FAFC';
const COLOR_CALLOUT_BG = 'EFF6FF';
const COLOR_BORDER = 'E2E8F0';

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
    run: {
      color: COLOR_PRIMARY,
      bold: true,
      size: 32, // 16pt
      font: 'Calibri',
    },
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 140 },
    run: {
      color: COLOR_SECONDARY,
      bold: true,
      size: 26, // 13pt
      font: 'Calibri',
    },
  });
}

function createHeading3(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    run: {
      color: COLOR_TEXT,
      bold: true,
      size: 22, // 11pt
      font: 'Calibri',
    },
  });
}

function createParagraph(text: string, options: { bold?: boolean; italic?: boolean; color?: string; spacingAfter?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: options.spacingAfter ?? 140, line: 276 },
    children: [
      new TextRun({
        text,
        bold: options.bold ?? false,
        italics: options.italic ?? false,
        color: options.color ?? COLOR_TEXT,
        size: 21, // 10.5pt
        font: 'Calibri',
      }),
    ],
  });
}

function createBullet(text: string, prefixBold?: string): Paragraph {
  const children: TextRun[] = [];
  if (prefixBold) {
    children.push(
      new TextRun({
        text: prefixBold + ' ',
        bold: true,
        color: COLOR_TEXT,
        size: 21,
        font: 'Calibri',
      })
    );
  }
  children.push(
    new TextRun({
      text,
      color: COLOR_TEXT,
      size: 21,
      font: 'Calibri',
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100, line: 260 },
    children,
  });
}

function createCallout(title: string, body: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.SINGLE, size: 36, color: COLOR_SECONDARY },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLOR_CALLOUT_BG },
            margins: { top: 140, bottom: 140, left: 200, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    color: COLOR_PRIMARY,
                    size: 21,
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: body,
                    color: COLOR_TEXT,
                    size: 20,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createCodeBlock(code: string): Table {
  const lines = code.trim().split('\n');
  const paragraphs = lines.map(line =>
    new Paragraph({
      spacing: { before: 0, after: 0, line: 220 },
      children: [
        new TextRun({
          text: line,
          font: 'Consolas',
          size: 18, // 9pt
          color: '0F172A',
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_CODE_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_CODE_BORDER },
      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_CODE_BORDER },
      right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_CODE_BORDER },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLOR_CODE_BG },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers: string[], rows: string[][], colWidthsPercent?: number[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((headerText, i) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        width: colWidthsPercent ? { size: colWidthsPercent[i], type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: headerText,
                bold: true,
                color: 'FFFFFF',
                size: 19,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      })
    ),
  });

  const bodyRows = rows.map((rowData, rowIndex) => {
    const isAlt = rowIndex % 2 === 1;
    return new TableRow({
      children: rowData.map((cellText, cellIndex) =>
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: isAlt ? COLOR_ROW_ALT : 'FFFFFF' },
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          width: colWidthsPercent ? { size: colWidthsPercent[cellIndex], type: WidthType.PERCENTAGE } : undefined,
          children: [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: cellText,
                  color: COLOR_TEXT,
                  size: 18,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    },
    rows: [headerRow, ...bodyRows],
  });
}

async function buildDocx(): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            color: COLOR_TEXT,
            size: 21,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Core Schema v1 | Graph Listener & Risk Attestation Engine Specification',
                    color: COLOR_MUTED,
                    size: 16,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', color: COLOR_MUTED, size: 16, font: 'Calibri' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: COLOR_MUTED,
                    size: 16,
                    font: 'Calibri',
                  }),
                  new TextRun({ text: ' of ', color: COLOR_MUTED, size: 16, font: 'Calibri' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: COLOR_MUTED,
                    size: 16,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: '  •  Append-Only Cryptographic Ledger RFC',
                    color: COLOR_MUTED,
                    size: 16,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // COVER TITLE BANNER
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({
                text: 'TECHNICAL SPECIFICATION',
                bold: true,
                size: 38, // 19pt
                color: COLOR_PRIMARY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: 'Graph Listener & Risk Attestation Engine for Append-Only Cryptographic Marketplace Ledgers',
                bold: true,
                size: 28, // 14pt
                color: COLOR_SECONDARY,
                font: 'Calibri',
              }),
            ],
          }),

          // Metadata Table
          createStyledTable(
            ['Parameter', 'Specification Invariant', 'Target Environment'],
            [
              ['Document Version', '1.0.0-PROD (Formal Protocol RFC)', 'SkillX Decentralized Marketplace'],
              ['Base Specification', 'Core Schema v1 (Frozen Envelope & Signing Rules)', 'Append-Only Cryptographic Ledger'],
              ['Cryptographic Primitives', 'Ed25519 SPKI-DER, SHA-256 Canonical JSON', 'Cross-Platform Deterministic Runtime'],
              ['Authority Model', 'Open Authority Pattern ("Valid Only If Recomputed")', 'Asynchronous Non-Settlement Attestation'],
            ],
            [25, 45, 30]
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // EXECUTIVE SUMMARY
          createHeading1('Executive Summary & Architectural Scope'),
          createParagraph(
            'The Core Schema v1 protocol defines an immutable, append-only, cryptographically verified event ledger for decentralized marketplace transactions. All state transitions—from deal formulation and escrow custody to deliverable submission, peer precheck, and dispute jury resolution—are memorialized as canonically serialized, Ed25519-signed events linked via cryptographic SHA-256 parent hash pointers (prevHash).'
          ),
          createParagraph(
            'This specification establishes the architectural blueprint for the Graph Listener & Risk Attestation Engine. The engine operates as an asynchronous, deterministic, read-optimized daemon that continuously ingests raw ledger events, maintains an in-memory directed property multigraph of market participants and economic flows, executes topological anomaly detection algorithms, and emits non-blocking risk assessments back to the ledger via a novel RiskFlagged event type.'
          ),

          createCallout(
            'Three Core Architectural Invariants',
            '1. Non-Blocking Attestation Model: Risk evaluations never execute inline with financial consensus, nor do they mutate ledger validation gates. Settlement operations (DealAccepted, EscrowReleased) proceed without blocking on risk calculations.\n' +
            '2. Open Authority Pattern: Any network participant may sign and publish a RiskFlagged envelope. The signer is not the authority; downstream consumers execute deterministic recomputation over the specified ledger window and graph parameters.\n' +
            '3. Immutability & Monotonicity: Historical risk attestations are never mutated or expunged from the ledger. Updates, recalibrations, false-positive rectifications, and formal appeals are handled strictly via deterministic supersession chains anchored by cryptographic parent references (supersedes_ref).'
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 1
          createHeading1('1. Proposed RiskFlagged Event Design'),
          createParagraph(
            'Per §10 of Core Schema v1, the protocol permits additive event types that adhere to strict envelope conventions, canonical JSON serialization, and Ed25519 signature guarantees. RiskFlagged follows the structured attestation pattern instantiated by PrecheckCompleted and JuryVoted.'
          ),

          createHeading2('1.1 TypeScript Interface Definitions'),
          createParagraph('The complete TypeScript definitions for the RiskFlagged event and its payload components are defined below:'),

          createCodeBlock(
`export type Pubkey = string; // Ed25519 SPKI-DER, base64
export type Hash   = string; // SHA-256 lowercase hex: /^[a-f0-9]{64}$/
export type Sig    = string; // Ed25519 signature, base64, 64 bytes
export type Uuid   = string; // lowercase UUIDv4
export type Amount = number; // positive safe integer
export type IsoUtc = string; // YYYY-MM-DDTHH:mm:ss.sssZ

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
  readonly confidence_score: number; // Integer: 1 to 10000 (basis points)
  readonly evidence: readonly AttestationEvidence[];
  readonly ruleset_version: string; // e.g. "1.4.0"
  readonly ledger_window_start: Hash;
  readonly ledger_window_end: Hash;
  readonly supersedes_ref: Hash | null; // Previous RiskFlagged event hash, or null
  readonly nonce: Uuid;
}

export interface RecomputationManifest {
  readonly algorithm_id: string; // e.g. "tarjan-scc-v1"
  readonly parameter_hash: Hash; // SHA-256 hash of canonical hyperparameters
  readonly ledger_window_start: Hash;
  readonly ledger_window_end: Hash;
  readonly state_checkpoint_hash: Hash; // Graph state root hash at window_start
}

export interface RiskFlaggedPayload {
  readonly attestation_body: RiskAttestationBody;
  readonly attestation_sig: Sig; // Ed25519 over ("skillx/v1/risk-flag\\n" + canonical(body))
  readonly recomputation_manifest: RecomputationManifest;
}

export interface EventEnvelope<T extends string, P> {
  readonly type: T;
  readonly version: 1;
  readonly payload: P;
  readonly signer: Pubkey;
  readonly timestamp: IsoUtc;
  readonly prevHash: Hash | null;
  readonly signature: Sig;
}

export type RiskFlaggedEvent = EventEnvelope<'RiskFlagged', RiskFlaggedPayload>;`
          ),

          createHeading2('1.2 Cryptographic Verification & Canonical Attestation Flow'),
          createParagraph(
            'The RiskFlagged event utilizes a two-tier cryptographic attestation pipeline. First, an inner attestation signature binds the analytical findings to the attestation body. Second, an outer envelope signature anchors the complete event to the append-only ledger chain.'
          ),
          createBullet('Inner Attestation Signature: Ed25519_Sign(signer_privkey, UTF8_Bytes("skillx/v1/risk-flag\\n" + canonical(body)))', '1. Claim Integrity:'),
          createBullet('Outer Envelope Signature: Ed25519_Sign(signer_privkey, UTF8_Bytes(canonical(envelope_without_signature)))', '2. Ledger Chain:'),
          createBullet('Event Hash: SHA256_Hex(UTF8_Bytes(canonical(complete_signed_event)))', '3. Global Pointer:'),
          createBullet('Open Authority Recomputation: Client re-runs detection over [ledger_window_start, ledger_window_end]. If recomputed body diverges from payload, the attestation is rejected without affecting ledger state.', '4. Recomputation Invariant:'),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 2
          createHeading1('2. Consumed Event Types'),
          createParagraph(
            'The Graph Listener continuously monitors the append-only ledger, ingesting each canonical event and updating its in-memory directed multigraph projection. Below is the exhaustive mapping of consumed Core Schema v1 event types to graph state mutations:'
          ),

          createStyledTable(
            ['Event Type', 'Extracted Fields', 'Graph State Mutation & Topological Meaning'],
            [
              ['AccountCreated', 'account_id (Pubkey), timestamp', 'Inserts Account node v_A. Initializes reputation vector, volume accumulators, and zero-degree state.'],
              ['DealCreated', 'deal_id (Uuid), buyer (Pubkey), amount, terms_hash', 'Inserts Deal node v_D. Emits edge (v_Buyer -> v_D) with role BUYER. Records escrow expectation.'],
              ['DealConsented', 'deal_id (Uuid), seller (Pubkey), timestamp', 'Emits edge (v_Seller -> v_D) with role SELLER. Transitions v_D state to CONSENTED.'],
              ['EscrowFunded', 'deal_id (Uuid), funder, amount, timestamp', 'Transitions v_D to ESCROW_LOCKED. Updates buyer historical outflow accumulator.'],
              ['DeliverableSubmitted', 'deal_id (Uuid), seller, artifact_hash, timestamp', 'Records submission. Computes turnaround velocity: dt = t_DeliverableSubmitted - t_EscrowFunded.'],
              ['PrecheckCompleted', 'deal_id (Uuid), checker_id, result, score', 'Emits edge (v_Checker -> v_D). Triggers checker-seller collusion check.'],
              ['DealAccepted', 'deal_id (Uuid), buyer, timestamp', 'Transitions v_D to ACCEPTED. Marks path for settlement flow validation.'],
              ['DealRejected', 'deal_id (Uuid), buyer, reason_hash, timestamp', 'Transitions v_D to REJECTED. Increments buyer rejection frequency metrics.'],
              ['DisputeOpened', 'deal_id (Uuid), initiator, claim_hash, timestamp', 'Transitions v_D to DISPUTED. Inserts Dispute sub-entity, attaches dispute counter.'],
              ['JuryAssigned', 'deal_id (Uuid), jurors[], seed_hash, timestamp', 'Emits N assignment edges (v_Juror -> v_D). Enforces assignment randomness verification.'],
              ['JuryVoted', 'deal_id (Uuid), juror, vote_choice, timestamp', 'Emits edge (v_Juror -> v_D). Updates co-voting matrix across all pairwise jurors.'],
              ['DisputeResolved', 'deal_id (Uuid), resolution_split, timestamp', 'Transitions v_D to RESOLVED. Computes juror conformity scores and consensus alignment.'],
              ['EscrowReleased', 'deal_id (Uuid), recipient, amount, timestamp', 'Emits economic edge (v_D -> v_Seller). Updates net volume flows between counterparties.'],
              ['FeeBurned', 'deal_id (Uuid), burn_amount, timestamp', 'Records platform protocol fee sink. Validates conservation of balance across deal lifecycle.'],
              ['ReputationEvent', 'target, delta, source_deal, timestamp', 'Emits edge (v_Source -> v_Target). Updates target node cumulative PageRank and reputation vector.'],
              ['RiskFlagged', 'subject_id, category, severity, supersedes_ref', 'Emits edge (v_Attestation -> v_Subject). Updates active risk frontier and supersession graph.'],
            ],
            [20, 32, 48]
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 3
          createHeading1('3. Graph State Maintenance'),
          createParagraph(
            'To guarantee deterministic, low-latency graph queries without sacrificing cryptographic auditability, the engine maintains an in-memory directed property multigraph G = (V, E) backed by append-only ledger checkpoints.'
          ),

          createHeading2('3.1 Node Structure Schema'),
          createParagraph('The graph maintains two primary vertex types: AccountNodeState and DealNodeState:'),

          createCodeBlock(
`export interface AccountNodeState {
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

export interface DealNodeState {
  readonly deal_id: Uuid;
  readonly creation_event_hash: Hash;
  buyer_id: Pubkey;
  seller_id: Pubkey | null;
  state: 'CREATED' | 'CONSENTED' | 'ESCROW_LOCKED' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED' | 'DISPUTED' | 'RESOLVED' | 'SETTLED';
  escrow_amount: Amount;
  created_at: IsoUtc;
  settled_at: IsoUtc | null;
  assigned_jurors: Set<Pubkey>;
  juror_votes: Map<Pubkey, { choice: string; timestamp: IsoUtc }>;
}`
          ),

          createHeading2('3.2 Directional Edge Semantics'),
          createBullet('PARTICIPATES_IN (Account -> Deal): Attributes: { role: BUYER | SELLER, timestamp, initial_stake }. Establishes contractual participation.', '1.'),
          createBullet('VOTED_FOR (Account -> Deal): Attributes: { vote_choice, fee_claim, timestamp }. Records juror voting behavior for collusion ring clustering.', '2.'),
          createBullet('REPUTATION_LINK (Source -> Account): Attributes: { delta, source_deal_id, decay_factor, timestamp }. Directed flow of economic trust.', '3.'),
          createBullet('RISK_ATTESTATION (Attestation -> Subject): Attributes: { category, severity, confidence_score, supersedes_ref }. Attaches warning signal.', '4.'),
          createBullet('SETTLED_PAYOUT (Deal -> Account): Attributes: { amount, burned_fee, timestamp }. Confirms transfer of capital; completes credit cycle.', '5.'),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 4
          createHeading1('4. Patterns + Thresholds (Heuristic Detection Rules)'),
          createParagraph(
            'The engine runs three distinct heuristic detection pipelines across each sliding graph window, featuring concrete mathematical definitions, operational pseudocode, and fixed parameter thresholds.'
          ),

          createHeading2('4.1 Pattern 1: Circular Reputation Farming & Wash Trading (Sybil Rings)'),
          createParagraph(
            'Topology: A closed ring of k accounts creates synthetic deals among themselves, funding escrows and releasing funds in cyclic fashion (A1 -> A2 -> ... -> Ak -> A1). The objective is to farm reputation transitions and inflate transaction volume using recycled capital.'
          ),
          createBullet('Elementary Directed Cycle: Exists C = (v1, e1, v2, ..., vk, ek, v1) where k in [2, 6].', 'Condition 1:'),
          createBullet('Volume Recycling Ratio (VRR): VRR = (Sum of Escrow Amounts in C) / ExternalInflow > 3.0 over the rolling 30-day window.', 'Condition 2:'),
          createBullet('Turnaround Velocity Anomaly: MeanCompletionTime = (1/k) Sum(t_Accepted - t_Created) < 300 seconds.', 'Condition 3:'),
          createBullet('Counterparty Reciprocity Index (CRI): min(Vol(A->B), Vol(B->A)) / max(Vol(A->B), Vol(B->A)) > 0.85 for deals >= 5.', 'Condition 4:'),

          createCodeBlock(
`export function detectCircularWashTrading(
  graph: DirectedGraph,
  targetAccount: Pubkey,
  maxCycleLength: number = 6
): RiskAttestationBody | null {
  const cycles = graph.findElementaryCycles(targetAccount, maxCycleLength);
  for (const cycle of cycles) {
    const k = cycle.nodes.length;
    let totalCycleVolume = 0;
    let totalDurationSeconds = 0;
    const dealHashes: Hash[] = [];

    for (const deal of cycle.deals) {
      totalCycleVolume += deal.escrow_amount;
      const duration = (new Date(deal.settled_at!).getTime() - new Date(deal.created_at).getTime()) / 1000;
      totalDurationSeconds += duration;
      dealHashes.push(deal.creation_event_hash);
    }

    const meanDuration = totalDurationSeconds / k;
    const externalInflow = graph.computeExternalCapitalInflow(cycle.nodes, 30 /* days */);
    const vrr = externalInflow === 0 ? 9999.0 : totalCycleVolume / externalInflow;

    if (vrr > 3.0 && meanDuration < 300) {
      return {
        attestation_id: crypto.randomUUID() as Uuid,
        subject_type: 'account',
        subject_id: targetAccount,
        category: 'WASH_TRADING_CIRCULAR',
        severity: vrr > 10.0 ? 'CRITICAL' : 'HIGH',
        confidence_score: Math.min(10000, Math.floor((vrr / 5.0) * 8000 + (300 / Math.max(meanDuration, 1)) * 2000)),
        evidence: [{
          rule_id: 'RULE_WASH_CYCLE_VRR',
          metric_name: 'VolumeRecyclingRatio',
          observed_value: Math.floor(vrr * 100),
          threshold_value: 300,
          supporting_event_hashes: dealHashes,
          graph_subgraph_hash: graph.computeSubgraphHash(cycle.nodes)
        }],
        ruleset_version: '1.0.0',
        ledger_window_start: graph.windowStartHash,
        ledger_window_end: graph.windowEndHash,
        supersedes_ref: null,
        nonce: crypto.randomUUID() as Uuid
      };
    }
  }
  return null;
}`
          ),

          createHeading2('4.2 Pattern 2: Jury Collusion Rings & Co-Voting Cliques'),
          createParagraph(
            'Topology: A syndicate of juror accounts coordinates to control dispute outcomes on assigned deals, voting in lockstep to guarantee a specific party wins and dividing the disputed escrow.'
          ),
          createBullet('Jaccard Agreement Index: J_vote(J1, J2) = |Mutual Same Choice| / |Total Mutual Disputes| > 0.90 for N_co >= 8 disputes.', 'Rule 1:'),
          createBullet('Chi-Square Baseline Test: Chi^2 = Sum((Observed - Expected)^2 / Expected) > 10.828 (p < 0.001, df = 1) relative to network distribution.', 'Rule 2:'),
          createBullet('Beneficiary Concentration Index: BCI(J1, J2 -> Seller) = |Votes favoring S| / |Total mutual votes involving S| > 0.85.', 'Rule 3:'),

          createHeading2('4.3 Pattern 3: Escrow Velocity Anomalies & Structuring Micro-Churn'),
          createBullet('Short-Term Velocity Multiplier: V_7d / max(V_30d_avg, 1000) > 5.0.', 'Velocity Spike:'),
          createBullet('Instant Delivery Abuse: Fraction of deals with (t_DeliverableSubmitted - t_EscrowFunded) < 15s exceeds 40% over >= 10 deals.', 'Instant Turnaround:'),
          createBullet('Threshold Structuring Index: Deal counts clustering in [0.90 * T_precheck, 0.99 * T_precheck] exceed 4x uniform density.', 'Structuring / Smurfing:'),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 5
          createHeading1('5. False-Positive Handling & Mitigation'),
          createParagraph(
            'Because risk attestations are broadcast across an open network, false positives can degrade user experience. The engine incorporates three deterministic mitigation layers:'
          ),

          createHeading2('5.1 Account Age & Volume Weighting'),
          createParagraph(
            'To prevent penalizing established high-frequency market makers, nominal thresholds are scaled dynamically by a two-factor dampening coefficient W(A) = W_age(A) * W_vol(A):'
          ),
          createBullet('W_age(A) = 1.0 + ln(1 + account_age_days / 90)', 'Age Factor:'),
          createBullet('W_vol(A) = 1.0 + log10(1 + SettledHistoricalVolume(A) / 10000)', 'Volume Factor:'),
          createBullet('Threshold_adjusted = Threshold_nominal * W(A)', 'Adjusted Rule:'),

          createHeading2('5.2 Multi-Observer Quorum Requirements'),
          createStyledTable(
            ['Target Severity', 'Observer Quorum (k-of-m)', 'Independent Signer Constraints'],
            [
              ['INFORMATIONAL', '1 of N', 'Any registered listener node.'],
              ['LOW', '1 of N', 'Valid recomputation hash.'],
              ['MEDIUM', '2 of m independent listeners', 'Distinct staking pubkeys and zero co-tenancy.'],
              ['HIGH', '3 of m independent listeners', 'Minimum 24-hour observation window or 95% confidence.'],
              ['CRITICAL', '5 of m independent listeners', '100% deterministic recomputation alignment across all quorum nodes.'],
            ],
            [25, 30, 45]
          ),

          createHeading2('5.3 Deterministic Recomputation Invariant'),
          createParagraph(
            'Downstream consumers validate risk events by independently fetching the ledger slice [ledger_window_start, ledger_window_end], re-running the detector algorithm identified by algorithm_id and parameter_hash, and asserting that the output matches the attested payload within 0.5% floating tolerance.'
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 6
          createHeading1('6. Flag Retraction & Supersession'),
          createParagraph(
            'In an append-only ledger, records cannot be mutated or deleted. Corrections, false-positive rectifications, successful user appeals, and risk status degradations must be executed as forward-progressing cryptographic supersessions via the supersedes_ref field.'
          ),

          createBullet('Pointing to Prior State: Any RiskFlagged payload may supply a non-null supersedes_ref containing the SHA-256 Hash of an earlier RiskFlagged event envelope.', '1. Pointer:'),
          createBullet('DAG Traversal: ActiveFlag(Subject, Category) = Leaf_highest_timestamp(Chain(supersedes_ref)). Circular references are rejected at ingestion.', '2. Resolution:'),
          createBullet('Formal Retraction: Emitting an event with confidence_score = 0, severity = INFORMATIONAL, and rule_id = "RETRACTION_APPEAL_GRANTED" formally clears the risk state.', '3. Clearing:'),

          createCodeBlock(
`export function createRetractionAttestation(
  priorEventHash: Hash,
  subjectId: string,
  subjectType: RiskSubjectType,
  category: RiskCategory,
  justificationCode: 'APPEAL_VERIFIED_DOCUMENTATION' | 'ALGORITHM_BUG_CORRECTION' | 'QUORUM_RECALIBRATION',
  auditorPubkey: Pubkey
): RiskAttestationBody {
  return {
    attestation_id: crypto.randomUUID() as Uuid,
    subject_type: subjectType,
    subject_id: subjectId,
    category: category,
    severity: 'INFORMATIONAL',
    confidence_score: 0, // Zero confidence = Flag cleared
    evidence: [{
      rule_id: \`RETRACTION_\${justificationCode}\`,
      metric_name: 'RiskClearedStatus',
      observed_value: 0,
      threshold_value: 0,
      supporting_event_hashes: [priorEventHash],
      graph_subgraph_hash: '0000000000000000000000000000000000000000000000000000000000000000'
    }],
    ruleset_version: '1.0.0',
    ledger_window_start: priorEventHash,
    ledger_window_end: priorEventHash,
    supersedes_ref: priorEventHash,
    nonce: crypto.randomUUID() as Uuid
  };
}`
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 7
          createHeading1('7. Metrics & Telemetry Specification'),
          createParagraph(
            'The engine exposes a Prometheus-compatible scrape endpoint (/metrics) adhering to OpenMetrics standards.'
          ),

          createStyledTable(
            ['Metric Name', 'Type', 'Labels', 'Description & Unit'],
            [
              ['graph_listener_ingestion_events_total', 'Counter', 'event_type, status', 'Total number of ledger events processed by the listener.'],
              ['graph_listener_ingestion_lag_events', 'Gauge', 'partition, stream_id', 'Difference between ledger head sequence and graph engine cursor.'],
              ['graph_listener_ingestion_duration_seconds', 'Histogram', 'event_type', 'Latency to parse, verify signatures, and apply graph mutations.'],
              ['graph_state_nodes_count', 'Gauge', 'node_type', 'Active count of distinct nodes stored in graph memory.'],
              ['graph_state_edges_count', 'Gauge', 'edge_type', 'Active count of directed edges in graph projection.'],
              ['graph_state_memory_bytes', 'Gauge', 'segment', 'Resident memory allocated by the graph engine.'],
              ['risk_detection_run_duration_seconds', 'Histogram', 'detector_id', 'Execution latency of anomaly algorithms over graph windows.'],
              ['risk_attestations_emitted_total', 'Counter', 'category, severity', 'Number of RiskFlagged events broadcast to ledger.'],
              ['risk_recomputation_evaluations_total', 'Counter', 'algorithm_id, result', 'Total number of recomputations executed by consumer nodes.'],
              ['risk_flag_supersessions_total', 'Counter', 'category, action', 'Total number of risk flags superseded via forward append-only events.'],
              ['risk_false_positive_recovery_ratio', 'Gauge', 'category, ruleset', 'Rolling 30-day ratio: Retractions / EmittedFlags. Target: < 0.02 (2%).'],
              ['risk_quorum_consensus_latency_seconds', 'Histogram', 'severity', 'Elapsed seconds to reach required multi-observer quorum.'],
            ],
            [30, 12, 20, 38]
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 8
          createHeading1('8. Complete End-to-End Verification Workflow'),
          createParagraph('The chronological lifecycle below illustrates an end-to-end detection and appeal cycle:'),

          createStyledTable(
            ['Time', 'Ledger Event Stream', 'Graph Engine & Downstream Policy Lifecycle'],
            [
              ['T0', 'AccountCreated (A1, A2)', 'Nodes v_A1, v_A2 initialized in graph state.'],
              ['T1', 'DealCreated (D1: A1 -> A2, $10,000)', 'Edge (v_A1 -> v_D1) added with role BUYER.'],
              ['T2', 'DealConsented (D1), EscrowFunded (D1)', 'Deal v_D1 enters ESCROW_LOCKED state.'],
              ['T3', 'DeliverableSubmitted (D1, +4 seconds)', 'Fast deliverable turnaround recorded (dt = 4s).'],
              ['T4', 'DealAccepted (D1), EscrowReleased (D1)', 'Deal settled; capital flows from A1 to A2.'],
              ['T5', 'DealCreated (D2: A2 -> A1, $9,950)', 'Reverse deal initiated; creates bidirectional link.'],
              ['T6', 'EscrowFunded (D2), DeliverableSubmitted (D2)', 'Instant turnaround repeated (dt = 3s).'],
              ['T7', 'DealAccepted (D2), EscrowReleased (D2)', 'Closed cycle C = (A1, A2, A1) completes.'],
              ['T8', '[DETECTOR TRIGGERED]', 'detectCircularWashTrading() fires: VRR = 39.9, Mean dt = 3.5s, CRI = 0.995.'],
              ['T9', 'RiskFlagged Emitted (Hash: 0x9a8f...)', 'Listener signs inner attestation and outer envelope; appends to ledger.'],
              ['T10', '[DOWNSTREAM POLICY CONSUMER]', 'Search index recomputes graph slice: VALID. Dampens search rank by 80% (non-blocking).'],
              ['T11', '[APPEAL SUBMISSION]', 'Entity submits verifiable market maker inventory logs.'],
              ['T12', 'RiskFlagged Supersession (Hash: 0xbb42...)', 'Auditor appends superseding event with confidence_score = 0 and supersedes_ref: 0x9a8f...'],
              ['T13', '[STATE RESTORATION]', 'Engine resolves DAG leaf to 0xbb42...; search index restores natural rank.'],
            ],
            [10, 38, 52]
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // SECTION 9
          createHeading1('9. Conclusion & Production Readiness Checklist'),
          createBullet('Schema Conformance: All types compile cleanly in TypeScript 5+ and adhere strictly to Core Schema v1 envelope standards.', '[x]'),
          createBullet('Open Authority Invariant: Zero trust is placed in listener identities; all downstream actions depend on deterministic recomputation.', '[x]'),
          createBullet('Non-Blocking Settlement: Escrow and acceptance pipelines execute without synchronous dependency on the risk attestation daemon.', '[x]'),
          createBullet('Telemetry Complete: Prometheus table covers latency, throughput, error rates, and the 2% false-positive target.', '[x]'),
          createBullet('Audit Trail Sealed: Full historical chain preserved via immutable supersedes_ref forward DAG pointers.', '[x]'),

          new Paragraph({
            spacing: { before: 300, after: 100 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '— END OF SPECIFICATION —',
                bold: true,
                color: COLOR_MUTED,
                size: 18,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

async function run() {
  console.log('Generating Technical Specification Word (.docx) document...');
  const buffer = await buildDocx();

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const primaryDocxPath = path.resolve(publicDir, 'Technical_Specification_Graph_Listener_Risk_Engine.docx');
  const aliasDocxPath = path.resolve(publicDir, 'Risk_Attestation_Graph_Listener_Core_Schema_v1.docx');

  fs.writeFileSync(primaryDocxPath, buffer);
  fs.writeFileSync(aliasDocxPath, buffer);

  console.log(`Successfully generated DOCX files:`);
  console.log(` - ${primaryDocxPath} (${buffer.length} bytes)`);
  console.log(` - ${aliasDocxPath} (${buffer.length} bytes)`);
}

run().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
