# QIR Studio ⚛️
### Quantum Intermediate Representation Development Workspace & Append-Only Ledger Graph Engine

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38b2ac.svg)](https://tailwindcss.com/)
[![LLVM](https://img.shields.io/badge/LLVM%20%2F%20QIR-Base%20Profile%20v1.0-darkgreen.svg)](https://www.qir-alliance.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**QIR Studio** is a cloud-native development environment and distributed systems analysis platform designed for quantum compiler engineers, hardware runtime architects, and ledger protocol researchers. It combines a full-fidelity, VS Code-inspired quantum IDE with an append-only event ledger graph listener and topological risk attestation engine.

---

## 🚀 Key Features

### 1. Quantum IR (QIR) Compiler & IDE Workspace
- **VS Code-Inspired Cloud IDE:** Activity bar, multi-file tabbed editor, interactive sidebar file explorer, bottom panel with interactive terminal, and problems pane.
- **QIR Base Profile v1.0 Conformance:** Real-time semantic linting that identifies dynamic branching violations (`br i1`), invalid `%Qubit*` handle casts, and missing unitary definitions.
- **Optimization Pass Engine:** Visual and terminal-driven gate fusion and peephole optimization passes (adjacent self-inverse cancellation $H \cdot H = I$, $CNOT \cdot CNOT = I$, and rotation merging $Rz(\theta_1) + Rz(\theta_2)$).
- **Comprehensive Test Harness:** Catch2 test runner with simulated pipelines for Clifford+T synthesis, stabilizer tableau simulation, and sliding-window scheduling.

### 2. Append-Only Ledger Graph Listener & Risk Attestation Engine
- **Core Schema v1 Integration:** Full cryptographic support for Ed25519 SPKI-DER signing, canonical lexicographical JSON serialization, and SHA-256 hash chains (`prevHash`).
- **`RiskFlagged` Event Subsystem:** Asynchronous, non-blocking risk attestations signed via `"skillx/v1/risk-flag\n" + canonical(body)`.
- **Open Authority Pattern ("Valid Only If Recomputed"):** Emitted risk attestations require no centralized authority; downstream consumers validate signals through deterministic recomputation over historical graph slices.
- **Topological Anomaly Detection:**
  - **Circular Wash Trading:** Elementary directed cycle analysis, Volume Recycling Ratio ($VRR > 3.0$), and turnaround latency anomalies ($t < 300\text{s}$).
  - **Jury Collusion Cliques:** Jaccard agreement matrix ($J_{\text{vote}} > 0.90$) and $\chi^2$ goodness-of-fit testing ($p < 0.001$).
  - **Escrow Velocity & Structuring:** Sudden 7-day velocity spikes ($V_{7d}/V_{30d} > 5.0$) and threshold smurfing detection.
- **Append-Only Supersession:** Monotonic audit chains using `supersedes_ref` pointers for formal retractions, appeals, and confidence recalibrations without history mutation.

---

## 📁 Repository Structure

```text
├── docs/
│   └── SPEC_RISK_FLAGGED_GRAPH_LISTENER.md  # Complete 3-page Technical Specification
├── public/
│   ├── Technical_Specification_Graph_Listener_Risk_Engine.docx # Publication-grade Word doc
│   └── qir-studio.zip                      # Standalone downloadable codebase archive
├── scripts/
│   └── generate_spec_docx.ts               # Programmatic OpenXML / DOCX generator script
├── src/
│   ├── components/vscode/                  # Modular VS Code UI components
│   │   ├── ActivityBar.tsx                 # View switcher (Explorer, Debug, Copilot, Settings)
│   │   ├── EditorArea.tsx                  # Syntax-highlighted code editor
│   │   ├── Sidebar.tsx                     # File tree and project outline
│   │   ├── BottomPanel.tsx                 # Terminal, build logs, and diagnostic output
│   │   └── PassDebuggerPanel.tsx           # Optimization pass visualization
│   ├── data/                               # QIR architectures, quantum DB, and mock schemas
│   ├── types/                              # TypeScript interfaces for workspace & ledger
│   ├── App.tsx                             # Application root and state machine
│   └── main.tsx                            # React DOM entry point
├── server.ts                               # Full-stack Express server with Vite middleware
├── package.json                            # Dependencies & npm scripts
└── tsconfig.json                           # TypeScript configuration
```

---

## 🛠️ Quick Start

### Prerequisites
- **Node.js:** v20.x or higher
- **npm** or **bun**

### Installation

```bash
# Clone the repository
git clone https://github.com/vasanthshettihallirajesh-netizen/QIR-studio.git
cd QIR-studio

# Install dependencies
npm install
```

### Running Locally

```bash
# Start the full-stack development server
npm run dev
```

Open your browser at `http://localhost:3000`.

### Building for Production

```bash
# Build client assets and compile TypeScript
npm run build

# Start the production server
npm start
```

---

## 📑 Technical Documentation & Downloads

The repository includes the complete formal specification for the **Graph Listener & Risk Attestation Engine**:

| Format | File Path | Direct Download / View |
| :--- | :--- | :--- |
| **Markdown Specification** | `docs/SPEC_RISK_FLAGGED_GRAPH_LISTENER.md` | [View Markdown Spec](docs/SPEC_RISK_FLAGGED_GRAPH_LISTENER.md) |
| **Word Document (.docx)** | `public/Technical_Specification_Graph_Listener_Risk_Engine.docx` | [Download Word Document](public/Technical_Specification_Graph_Listener_Risk_Engine.docx) |
| **Codebase ZIP Archive** | `public/qir-studio.zip` | [Download qir-studio.zip](public/qir-studio.zip) |

### Re-generating the Word Document

You can re-compile the publication-grade Word document at any time:

```bash
npx tsx scripts/generate_spec_docx.ts
```

---

## 📊 Telemetry & Metrics Reference

The embedded Graph Listener exposes Prometheus-compatible metrics:

- `graph_listener_ingestion_events_total`: Total ledger events ingested.
- `graph_listener_ingestion_lag_events`: Real-time cursor lag behind the ledger head.
- `risk_detection_run_duration_seconds`: Algorithm execution latency histograms.
- `risk_recomputation_evaluations_total`: Validation match/divergence counts.
- `risk_false_positive_recovery_ratio`: 30-day retraction ratio (enforcing $< 2\%$ threshold).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
