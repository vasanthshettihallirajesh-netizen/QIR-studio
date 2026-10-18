/**
 * @file src/data/passDebuggerData.ts
 * @brief High-Fidelity Multi-Pass Quantum Optimization Data for the Pass Debugger
 */

export interface PassStepInfo {
  id: string;
  index: number;
  passName: string;
  shortName: string;
  category: 'frontend' | 'peephole' | 'synthesis' | 'fault-tolerance' | 'routing' | 'backend';
  description: string;
  metrics: {
    gatesBefore: number;
    gatesAfter: number;
    netChange: string;
    tCountBefore: number;
    tCountAfter: number;
    depthBefore: number;
    depthAfter: number;
    latencyReduction: string;
  };
  notes: string[];
  beforeIR: string;
  afterIR: string;
}

export const COMPILER_PASS_STEPS: PassStepInfo[] = [
  {
    id: 'pass-0-initial',
    index: 0,
    passName: 'Raw Front-End AST Lowering (Unoptimized)',
    shortName: 'Input AST',
    category: 'frontend',
    description: 'Initial translation from OpenQASM 3 AST into unoptimized QIR bitcode. Contains redundant gates and disconnected couplers.',
    metrics: {
      gatesBefore: 32,
      gatesAfter: 32,
      netChange: '0%',
      tCountBefore: 12,
      tCountAfter: 12,
      depthBefore: 24,
      depthAfter: 24,
      latencyReduction: '0.0%',
    },
    notes: [
      'Emitted by OpenQASM 3 front-end AST parser',
      'Includes redundant back-to-back Hadamard and CNOT pairs',
      'Continuous angle rotations uncombined',
      'Qubits 0 and 3 targeted directly without hardware topological routing',
    ],
    beforeIR: `; ModuleID = 'circuit_unoptimized.ll'
source_filename = "quantum_program.qasm"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "qir-unknown-qpu"

%Qubit = type opaque
%Result = type opaque

declare %Qubit* @__quantum__rt__qubit_allocate()
declare void @__quantum__rt__qubit_release(%Qubit*)
declare void @__quantum__qis__h__body(%Qubit*)
declare void @__quantum__qis__x__body(%Qubit*)
declare void @__quantum__qis__z__body(%Qubit*)
declare void @__quantum__qis__t__body(%Qubit*)
declare void @__quantum__qis__rz__body(double, %Qubit*)
declare void @__quantum__qis__cnot__body(%Qubit*, %Qubit*)
declare void @__quantum__qis__mz__body(%Qubit*, %Result*)

define void @main() #0 {
entry:
  ; Qubit Allocation
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q2 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q3 = call %Qubit* @__quantum__rt__qubit_allocate()

  ; Layer 1: Redundant Self-Inverse Operations
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__x__body(%Qubit* %q1)

  ; Layer 2: Consecutive Parameterized Rotations
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)

  ; Layer 3: Fault-Tolerant T Sequences
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)

  ; Layer 4: Disjoint Commutable Gates
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__h__body(%Qubit* %q0)

  ; Layer 5: Non-Adjacent Two-Qubit Interaction (q0, q3)
  call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q3)

  ; Final Measurements
  %r0 = call %Result* @__quantum__rt__result_allocate()
  call void @__quantum__qis__mz__body(%Qubit* %q0, %Result* %r0)

  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q2)
  call void @__quantum__rt__qubit_release(%Qubit* %q3)
  ret void
}`,
    afterIR: `; ModuleID = 'circuit_unoptimized.ll'
source_filename = "quantum_program.qasm"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "qir-unknown-qpu"

%Qubit = type opaque
%Result = type opaque

declare %Qubit* @__quantum__rt__qubit_allocate()
declare void @__quantum__rt__qubit_release(%Qubit*)
declare void @__quantum__qis__h__body(%Qubit*)
declare void @__quantum__qis__x__body(%Qubit*)
declare void @__quantum__qis__z__body(%Qubit*)
declare void @__quantum__qis__t__body(%Qubit*)
declare void @__quantum__qis__rz__body(double, %Qubit*)
declare void @__quantum__qis__cnot__body(%Qubit*, %Qubit*)
declare void @__quantum__qis__mz__body(%Qubit*, %Result*)

define void @main() #0 {
entry:
  ; Qubit Allocation
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q2 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q3 = call %Qubit* @__quantum__rt__qubit_allocate()

  ; Layer 1: Redundant Self-Inverse Operations
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__x__body(%Qubit* %q1)

  ; Layer 2: Consecutive Parameterized Rotations
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)

  ; Layer 3: Fault-Tolerant T Sequences
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)

  ; Layer 4: Disjoint Commutable Gates
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__h__body(%Qubit* %q0)

  ; Layer 5: Non-Adjacent Two-Qubit Interaction (q0, q3)
  call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q3)

  ; Final Measurements
  %r0 = call %Result* @__quantum__rt__result_allocate()
  call void @__quantum__qis__mz__body(%Qubit* %q0, %Result* %r0)

  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q2)
  call void @__quantum__rt__qubit_release(%Qubit* %q3)
  ret void
}`,
  },
  {
    id: 'pass-1-peephole-cancellation',
    index: 1,
    passName: 'GateFusionPass: Self-Inverse Cancellation',
    shortName: 'Self-Inverse',
    category: 'peephole',
    description: 'Scans basic blocks for contiguous Hermitian unitary pairs (H*H = I, X*X = I, CNOT*CNOT = I) and removes both instructions.',
    metrics: {
      gatesBefore: 32,
      gatesAfter: 28,
      netChange: '-12.5%',
      tCountBefore: 12,
      tCountAfter: 12,
      depthBefore: 24,
      depthAfter: 20,
      latencyReduction: '16.7%',
    },
    notes: [
      'Detected adjacent H(q0) * H(q0) -> Annihilated to Identity',
      'Detected adjacent X(q1) * X(q1) -> Annihilated to Identity',
      '4 redundant quantum instructions eliminated from use-def chain',
    ],
    beforeIR: `  ; Layer 1: Redundant Self-Inverse Operations
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__x__body(%Qubit* %q1)

  ; Layer 2: Consecutive Parameterized Rotations
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)`,
    afterIR: `  ; Layer 1: Annihilated to Identity via Self-Inverse Cancellation Pass
  ; [OPT-INFO] H(q0)*H(q0) and X(q1)*X(q1) eliminated

  ; Layer 2: Consecutive Parameterized Rotations
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)`,
  },
  {
    id: 'pass-2-rotation-merging',
    index: 2,
    passName: 'Symbolic & Continuous Rotation Merging',
    shortName: 'Rotation Fold',
    category: 'peephole',
    description: 'Folds consecutive rotations along identical axes into a single angle addition: Rz(θ1) · Rz(θ2) = Rz(θ1 + θ2).',
    metrics: {
      gatesBefore: 28,
      gatesAfter: 27,
      netChange: '-3.6%',
      tCountBefore: 12,
      tCountAfter: 12,
      depthBefore: 20,
      depthAfter: 19,
      latencyReduction: '21.0%',
    },
    notes: [
      'Rz(0.392699) + Rz(0.392699) folded into single Rz(0.785398) [pi/4 = T gate]',
      'Eliminated 1 rotation instruction and normalized floating point register',
    ],
    beforeIR: `  ; Layer 2: Consecutive Parameterized Rotations
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)
  call void @__quantum__qis__rz__body(double 0.392699, %Qubit* %q0)

  ; Layer 3: Fault-Tolerant T Sequences
  call void @__quantum__qis__t__body(%Qubit* %q0)`,
    afterIR: `  ; Layer 2: Folded into single canonical rotation Rz(pi/4)
  call void @__quantum__qis__rz__body(double 0.785398, %Qubit* %q0)

  ; Layer 3: Fault-Tolerant T Sequences
  call void @__quantum__qis__t__body(%Qubit* %q0)`,
  },
  {
    id: 'pass-3-commutation-scheduler',
    index: 3,
    passName: 'Commutation-Aware Sliding Window Scheduler',
    shortName: 'Commutation',
    category: 'synthesis',
    description: 'Leverages Pauli commutation relations to slide non-interfering single-qubit gates past disjoint multi-qubit boundaries, exposing hidden cancellations.',
    metrics: {
      gatesBefore: 27,
      gatesAfter: 25,
      netChange: '-7.4%',
      tCountBefore: 12,
      tCountAfter: 12,
      depthBefore: 19,
      depthAfter: 17,
      latencyReduction: '28.5%',
    },
    notes: [
      'H(q0) and X(q1) commute because they act on disjoint qubit registers',
      'Slid H(q0) past X(q1) to meet trailing H(q0)',
      'H(q0) * H(q0) cancelled out, leaving only X(q1)',
    ],
    beforeIR: `  ; Layer 4: Disjoint Commutable Gates
  call void @__quantum__qis__h__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)
  call void @__quantum__qis__h__body(%Qubit* %q0)`,
    afterIR: `  ; Layer 4: Commuted H(q0) past disjoint X(q1) -> H(q0)*H(q0) cancelled!
  call void @__quantum__qis__x__body(%Qubit* %q1)`,
  },
  {
    id: 'pass-4-clifford-t-synthesis',
    index: 4,
    passName: 'Clifford+T Phase Polynomial Synthesis',
    shortName: 'Clifford+T',
    category: 'synthesis',
    description: 'Compresses sequences of T-gates into phase polynomial representations using Patel-Markov-Hayes algorithms to minimize expensive fault-tolerant T-counts.',
    metrics: {
      gatesBefore: 25,
      gatesAfter: 22,
      netChange: '-12.0%',
      tCountBefore: 12,
      tCountAfter: 6,
      depthBefore: 17,
      depthAfter: 14,
      latencyReduction: '45.0%',
    },
    notes: [
      'Identified T^4 sequence on q0 -> T^4 = S^2 = Z (Clifford gate)',
      'Converted 4 fault-tolerant T-gates into 1 single-qubit Z gate',
      'T-count reduced from 12 down to 6 (-50% distillation overhead)',
    ],
    beforeIR: `  ; Layer 3: Fault-Tolerant T Sequences
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)
  call void @__quantum__qis__t__body(%Qubit* %q0)`,
    afterIR: `  ; Layer 3: Phase Polynomial Synthesis: T^4 simplified to Z(q0)
  call void @__quantum__qis__z__body(%Qubit* %q0)`,
  },
  {
    id: 'pass-5-topology-routing',
    index: 5,
    passName: 'Topology-Aware Routing & SABRE Lookahead SWAP Insertion',
    shortName: 'A* Routing',
    category: 'routing',
    description: 'Maps logical entangling gates to target hardware coupling topology (e.g. IBM Heavy-Hex) by inserting minimal-cost SWAP gates via A* search heuristics.',
    metrics: {
      gatesBefore: 22,
      gatesAfter: 23,
      netChange: '+4.5% (Routed)',
      tCountBefore: 6,
      tCountAfter: 6,
      depthBefore: 14,
      depthAfter: 15,
      latencyReduction: '52.0%',
    },
    notes: [
      'Target QPU coupling map does not have direct edge (q0, q3)',
      'Shortest path on heavy-hex lattice: q0 -> q1 -> q2 -> q3',
      'Inserted calibrated SWAP(q0, q1) to bridge non-local interaction',
      'Preserves logical unitary equivalence while satisfying hardware connectivity',
    ],
    beforeIR: `  ; Layer 5: Non-Adjacent Two-Qubit Interaction (q0, q3)
  call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q3)`,
    afterIR: `  ; Layer 5: Hardware Topology Routing for IBM Heavy-Hex (Coupling edge: q1-q3)
  call void @__quantum__qis__swap__body(%Qubit* %q0, %Qubit* %q1)
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3)
  call void @__quantum__qis__swap__body(%Qubit* %q0, %Qubit* %q1)`,
  },
  {
    id: 'pass-6-error-mitigation',
    index: 6,
    passName: 'Automated Error-Mitigation: Zero-Noise Extrapolation (ZNE)',
    shortName: 'ZNE Mitigation',
    category: 'fault-tolerance',
    description: 'Injects unitary digital folding (U * U^dagger * U) to deliberately scale noise by controlled factors for Richardson extrapolation.',
    metrics: {
      gatesBefore: 23,
      gatesAfter: 25,
      netChange: '+8.7% (Mitigated)',
      tCountBefore: 6,
      tCountAfter: 6,
      depthBefore: 15,
      depthAfter: 17,
      latencyReduction: '48.0%',
    },
    notes: [
      'Zero-Noise Extrapolation (ZNE) scale factor lambda = 3.0 configured',
      'Injected identity folding subroutines around noisy two-qubit entangling gates',
      'Readout fidelity improvement factor: 1.42x',
    ],
    beforeIR: `  ; Layer 5: Two-Qubit Interaction (Unmitigated)
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3)`,
    afterIR: `  ; Layer 5: ZNE Digital Noise Scaling Layer (Scale Factor = 3.0)
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3)
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3) ; U_dag
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3) ; U_fold`,
  },
  {
    id: 'pass-7-dead-qubit-elimination',
    index: 7,
    passName: 'Dead Qubit & Unused Handle Elimination',
    shortName: 'DCE Qubits',
    category: 'peephole',
    description: 'Static use-def analysis identifies unreferenced qubit allocations (%q2) and removes them along with boundary lifecycle instructions.',
    metrics: {
      gatesBefore: 25,
      gatesAfter: 23,
      netChange: '-8.0%',
      tCountBefore: 6,
      tCountAfter: 6,
      depthBefore: 17,
      depthAfter: 15,
      latencyReduction: '58.0%',
    },
    notes: [
      'Qubit %q2 has 0 gate uses across basic block use-def chains',
      'Eliminated redundant %q2 allocate and release runtime calls',
      'Total required physical qubits reduced from 4 down to 3',
    ],
    beforeIR: `entry:
  ; Qubit Allocation
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q2 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q3 = call %Qubit* @__quantum__rt__qubit_allocate()
...
  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q2)
  call void @__quantum__rt__qubit_release(%Qubit* %q3)`,
    afterIR: `entry:
  ; Qubit Allocation (Dead Qubit %q2 eliminated)
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q3 = call %Qubit* @__quantum__rt__qubit_allocate()
...
  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q3)`,
  },
  {
    id: 'pass-8-final-qir-emission',
    index: 8,
    passName: 'Final QIR Base Profile Bitcode Emission',
    shortName: 'Final QIR',
    category: 'backend',
    description: 'Final canonical QIR emission enforcing static memory guarantees, entry-point attributes (#0 = { "qir_profiles"="base_profile" }), and verified LLVM bitcode.',
    metrics: {
      gatesBefore: 23,
      gatesAfter: 14,
      netChange: '-56.3% Total',
      tCountBefore: 12,
      tCountAfter: 6,
      depthBefore: 24,
      depthAfter: 11,
      latencyReduction: '62.5%',
    },
    notes: [
      'All 8 optimization and routing passes verified',
      'Conforms 100% to QIR Alliance Base Profile Specification v1.0',
      'Linear qubit typing and no-cloning static guarantees enforced',
      'Ready for host compilation or QPU execution via LLVM ORC JIT',
    ],
    beforeIR: `; Intermediate QIR bitcode prior to profile emission
define void @main() #0 {
  ... [intermediate unverified bitcode] ...
}`,
    afterIR: `; ModuleID = 'circuit_optimized.ll'
source_filename = "quantum_program.qasm"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "qir-unknown-qpu"

%Qubit = type opaque
%Result = type opaque

define void @main() #0 {
entry:
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q3 = call %Qubit* @__quantum__rt__qubit_allocate()

  ; Optimized Gates: Combined Rz(pi/4) and Phase Polynomial Z
  call void @__quantum__qis__rz__body(double 0.785398, %Qubit* %q0)
  call void @__quantum__qis__z__body(%Qubit* %q0)
  call void @__quantum__qis__x__body(%Qubit* %q1)

  ; Routed & Error-Mitigated Interaction (q1, q3)
  call void @__quantum__qis__swap__body(%Qubit* %q0, %Qubit* %q1)
  call void @__quantum__qis__cnot__body(%Qubit* %q1, %Qubit* %q3)
  call void @__quantum__qis__swap__body(%Qubit* %q0, %Qubit* %q1)

  ; Measurement & Clean Deallocation
  %r0 = call %Result* @__quantum__rt__result_allocate()
  call void @__quantum__qis__mz__body(%Qubit* %q0, %Result* %r0)

  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  call void @__quantum__rt__qubit_release(%Qubit* %q3)
  ret void
}

attributes #0 = { "entry_point" "qir_profiles"="base_profile" "output_labeling_schema" "required_num_qubits"="3" "required_num_results"="1" }`,
  },
];
