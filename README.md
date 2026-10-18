# QIR Studio ⚛️
### Modern Cloud Workspace for Quantum Intermediate Representation (QIR) & LLVM Compiler Toolchains

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38b2ac.svg)](https://tailwindcss.com/)
[![LLVM](https://img.shields.io/badge/LLVM%20%2F%20Clang-17.0.6-darkgreen.svg)](https://llvm.org/)
[![QIR Profile](https://img.shields.io/badge/QIR-Base%20Profile%20v1.0-blueviolet.svg)](https://www.qir-alliance.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**QIR Studio** is a cloud-based development environment and compiler workbench inspired by VS Code, engineered specifically for developing, optimizing, validating, and testing quantum programs compiled into **Quantum Intermediate Representation (QIR)** and LLVM bitcode.

---

## 🌟 Core Features

### 1. Full-Featured VS Code-Inspired Interface
- **Activity Bar & Navigation:** Quick-switch between File Explorer, Live Compiler Diagnostics, Pass Debugger, and AI Copilot.
- **Multi-Tab Code Editor:** Syntax highlighting for C++20, QuantumCode (`.qc`), OpenQASM (`.qua`), LLVM IR (`.ll`), and YAML hardware specifications.
- **Live Terminal & CLI Toolchain:** Built-in simulated build system supporting `make`, `ctest`, `qir-opt`, `qir-compile`, and `qir-validate`.
- **Diagnostics & Problems Pane:** Real-time semantic linting that checks against the QIR Base Profile specification.

### 2. Quantum IR Compiler & Optimization Pipeline
- **Gate Fusion & Peephole Optimization (`qir-opt`):**
  - Self-inverse gate pair cancellation ($H \cdot H = I$, $X \cdot X = I$, $Z \cdot Z = I$, $CNOT \cdot CNOT = I$).
  - Continuous parameterized rotation merging ($Rz(\theta_1) + Rz(\theta_2) = Rz(\theta_1 + \theta_2)$).
  - Telemetry tracking: gate cancellation counts, circuit depth reduction, and structured JSON reports.
- **Fluent QIRBuilder API:** High-level C++20 builder for programmatic quantum instruction emission (`CreateH`, `CreateCNOT`, `CreateMz`, `CreateQubitAllocate`, `CreateQubitRelease`).
- **Profile Conformance Validation (`qir-validate`):**
  - **Base Profile v1.0:** Strict enforcement of static control flow (no dynamic branching `br i1` on mid-circuit measurement outcomes).
  - **Opaque Qubit Handles:** Guarantees `%Qubit*` and `%Result*` pointers remain opaque and safe from arithmetic coercion.

### 3. Integrated AI Quantum Compiler Copilot
- **Automated Fault Diagnosis:** Deep-dive analysis of QIR Base Profile violations, No-Cloning theorem breaches, and C++ template errors.
- **One-Click Remediation:** Generates corrected, production-grade QIR constructs directly into your active editor tab.

---

## 📂 Project Structure

```text
├── src/
│   ├── components/vscode/        # VS Code-style UI elements
│   │   ├── ActivityBar.tsx       # Primary navigation icon dock
│   │   ├── EditorArea.tsx        # Multi-tab code editor with syntax highlighting
│   │   ├── Sidebar.tsx           # File tree explorer and project outline
│   │   ├── BottomPanel.tsx       # Terminal, build logs, and diagnostic problems pane
│   │   ├── PassDebuggerPanel.tsx # Interactive quantum pass visualization
│   │   └── AiCopilotPanel.tsx    # Live compiler debugging assistant
│   ├── data/
│   │   ├── initialWorkspace.ts   # Pre-loaded quantum circuits and compiler headers
│   │   ├── quantumCodeEngine.ts  # QuantumCode (.qc/.qua) DSL engine
│   │   ├── bleedingEdgeArchitecture.ts # Clifford+T synthesis & hypergraphs
│   │   └── passDebuggerData.ts   # Peephole pass states and metrics
│   ├── types/
│   │   └── workspace.ts          # Core TypeScript models for files, diagnostics, and tabs
│   ├── App.tsx                   # Main state machine and terminal execution controller
│   ├── main.tsx                  # React application entry point
│   └── index.css                 # Tailwind CSS styles
├── public/
│   └── qir-studio.zip            # Clean standalone source code package
├── server.ts                     # Express server with Vite middleware and AI endpoints
├── package.json                  # Dependencies and build scripts
├── tsconfig.json                 # TypeScript compiler options
└── vite.config.ts                # Vite build and plugin configuration
```

---

## 🚀 Getting Started

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

### Development Mode

```bash
# Launch the local development server (runs Express + Vite on port 3000)
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Building for Production

```bash
# Compile TypeScript and build production bundle
npm run build

# Start the production server
npm start
```

---

## ⌨️ Terminal Commands in QIR Studio

Inside the QIR Studio bottom terminal panel, you can run:

| Command | Action |
| :--- | :--- |
| `make` / `make -j8` | Compiles `qir_core`, `qir-opt`, and test binaries via simulated CMake & Ninja |
| `./tools/qir-opt --passes=gate-fusion` | Executes the gate fusion & rotation merging optimization pass |
| `./tools/qir-validate <file.ll>` | Validates bitcode adherence to the QIR Base Profile v1.0 standard |
| `./tools/qir-compile <file.qasm>` | Lowers OpenQASM 3 circuits into canonical LLVM QIR bitcode |
| `ctest` | Executes Catch2 unit test suites across all quantum compiler passes |
| `clear` | Clears terminal screen output |
| `help` | Displays all available developer commands |

---

## 🤝 Contributing

Contributions to QIR Studio are welcome! Feel free to open issues or submit pull requests for:
- New quantum compiler optimization passes (e.g., commutation analysis, T-depth reduction).
- Additional hardware backend pulse schedule mappings.
- Expanded OpenQASM 3 / QIR lowering adapters.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
