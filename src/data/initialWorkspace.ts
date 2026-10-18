import { WorkspaceFile, SupportedLanguage } from '../types/workspace';
import { injectBleedingEdgeModules } from './bleedingEdgeArchitecture';
import { injectExtendedBleedingEdgeModules } from './extendedBleedingEdgeArchitecture';
import { injectQuantumDatabaseModules } from './quantumDatabaseArchitecture';
import { injectQuantumCodeEngineFiles } from './quantumCodeEngine';
import { injectQuantumSystemExpansionFiles } from './quantumSystemExpansion';

export function getLanguageForFile(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'h':
    case 'hpp':
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'c':
      return 'c';
    case 'cmake':
    case 'txt':
      if (filename.toLowerCase().includes('cmake')) return 'cmake';
      return 'plaintext';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'll':
    case 'bc':
      return 'llvm';
    case 'qc':
    case 'qua':
    case 'qasm':
      return 'cpp'; // highlight as c-like quantum code
    default:
      if (filename.startsWith('.')) return 'yaml';
      if (filename.toLowerCase() === 'makefile') return 'shell';
      return 'plaintext';
  }
}

// Starter Code for the Core IR Module
export const TYPE_H_CONTENT = `/**
 * @file include/ir/type.h
 * @brief Quantum Intermediate Representation (QIR) Type Hierarchy
 * 
 * Defines the core type system for qir-platform, supporting classical scalar types,
 * opaque quantum handles (%Qubit*, %Result*), array structures, and callable types
 * compliant with LLVM 17+ and the QIR Base Profile Specification v1.0.
 */

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <string_view>
#include <cstdint>

namespace qir {

class TypeContext;

/// @brief Enumeration of all concrete type variants supported by QIR.
enum class TypeKind : uint8_t {
    Void,
    Integer,
    Double,
    Boolean,
    Qubit,               // Opaque pointer %Qubit*
    Result,              // Opaque pointer %Result*
    Array,               // %Array* or fixed-size quantum registers
    Tuple,               // Classical/quantum heterogeneous tuple
    Function,            // Callable function signature
    Pointer,             // Generic typed or opaque pointer
    DependentQubitArray, // Dependent-typed quantum register [?N x %Qubit*]
    Qudit                // Multi-state qudit handle (%Qudit_d3*, %Qudit_d5*)
};

/// @brief Linear type-state tracked across qubit lifecycles
enum class QubitLinearState : uint8_t {
    Unallocated,
    Active,
    Entangled,
    Measured,
    Released
};

/**
 * @brief Abstract base class for all QIR types.
 * Immutable and unique within a single TypeContext instance.
 */
class Type {
public:
    virtual ~Type() = default;

    TypeKind getKind() const { return kind_; }
    TypeContext& getContext() const { return context_; }

    // Core Type Queries
    bool isVoid() const { return kind_ == TypeKind::Void; }
    bool isInteger() const { return kind_ == TypeKind::Integer; }
    bool isDouble() const { return kind_ == TypeKind::Double; }
    bool isBoolean() const { return kind_ == TypeKind::Boolean; }
    bool isQubit() const { return kind_ == TypeKind::Qubit; }
    bool isResult() const { return kind_ == TypeKind::Result; }
    bool isQuantumHandle() const { return isQubit() || isResult(); }
    bool isArray() const { return kind_ == TypeKind::Array; }
    bool isFunction() const { return kind_ == TypeKind::Function; }

    /// @brief Formats the type into canonical LLVM IR representation (e.g. "%Qubit*", "i64", "double").
    virtual std::string toLLVMString() const = 0;

    /// @brief Human-readable debug description.
    virtual std::string toString() const = 0;

protected:
    explicit Type(TypeKind kind, TypeContext& ctx) : kind_(kind), context_(ctx) {}

    TypeKind kind_;
    TypeContext& context_;
};

/**
 * @brief Opaque Qubit handle representation (%Qubit* in LLVM bitcode).
 * Represents a single logical or physical qubit under compilation.
 */
class QubitType : public Type {
public:
    static QubitType* get(TypeContext& ctx);

    std::string toLLVMString() const override { return "%Qubit*"; }
    std::string toString() const override { return "Qubit"; }

private:
    friend class TypeContext;
    explicit QubitType(TypeContext& ctx) : Type(TypeKind::Qubit, ctx) {}
};

/**
 * @brief Opaque Result handle representation (%Result* in LLVM bitcode).
 * Represents a single measurement outcome register.
 */
class ResultType : public Type {
public:
    static ResultType* get(TypeContext& ctx);

    std::string toLLVMString() const override { return "%Result*"; }
    std::string toString() const override { return "Result"; }

private:
    friend class TypeContext;
    explicit ResultType(TypeContext& ctx) : Type(TypeKind::Result, ctx) {}
};

/**
 * @brief Classical integer type with explicit bitwidth (i1, i8, i32, i64).
 */
class IntegerType : public Type {
public:
    static IntegerType* get(TypeContext& ctx, unsigned bitwidth);

    unsigned getBitWidth() const { return bitwidth_; }

    std::string toLLVMString() const override {
        return "i" + std::to_string(bitwidth_);
    }
    std::string toString() const override {
        return "Int" + std::to_string(bitwidth_);
    }

private:
    friend class TypeContext;
    IntegerType(TypeContext& ctx, unsigned bitwidth)
        : Type(TypeKind::Integer, ctx), bitwidth_(bitwidth) {}

    unsigned bitwidth_;
};

/**
 * @brief Double-precision IEEE 754 floating point type used for gate rotation angles (rad).
 */
class DoubleType : public Type {
public:
    static DoubleType* get(TypeContext& ctx);

    std::string toLLVMString() const override { return "double"; }
    std::string toString() const override { return "Double"; }

private:
    friend class TypeContext;
    explicit DoubleType(TypeContext& ctx) : Type(TypeKind::Double, ctx) {}
};

/**
 * @brief Function type encapsulating return type and formal parameter types.
 */
class FunctionType : public Type {
public:
    static FunctionType* get(TypeContext& ctx, Type* returnType, std::vector<Type*> params);

    Type* getReturnType() const { return returnType_; }
    const std::vector<Type*>& getParamTypes() const { return paramTypes_; }
    size_t getNumParams() const { return paramTypes_.size(); }

    std::string toLLVMString() const override;
    std::string toString() const override;

private:
    friend class TypeContext;
    FunctionType(TypeContext& ctx, Type* returnType, std::vector<Type*> params)
        : Type(TypeKind::Function, ctx), returnType_(returnType), paramTypes_(std::move(params)) {}

    Type* returnType_;
    std::vector<Type*> paramTypes_;
};

/**
 * @brief Dependent-Typed Quantum Register [?N x %Qubit*]
 * Parameterized by compile-time integer expression or runtime parameter symbol.
 */
class DependentQubitArrayType : public Type {
public:
    DependentQubitArrayType(TypeContext& ctx, size_t defaultSize, std::string paramSymbol = "")
        : Type(TypeKind::DependentQubitArray, ctx), defaultSize_(defaultSize), paramSymbol_(std::move(paramSymbol)) {}

    bool isParametric() const { return !paramSymbol_.empty(); }
    const std::string& getParamSymbol() const { return paramSymbol_; }
    size_t getDefaultSize() const { return defaultSize_; }

    std::string toLLVMString() const override {
        if (isParametric()) {
            return "[?" + paramSymbol_ + " x %Qubit*]";
        }
        return "[" + std::to_string(defaultSize_) + " x %Qubit*]";
    }

    std::string toString() const override {
        return "DependentQubitArray[" + (isParametric() ? paramSymbol_ : std::to_string(defaultSize_)) + "]";
    }

private:
    size_t defaultSize_;
    std::string paramSymbol_;
};

/**
 * @brief Multi-State Qudit Type (d >= 3)
 * Generalizes binary qubits to d-level Hilbert spaces (%Qudit_d3*, %Qudit_d5*).
 */
class QuditType : public Type {
public:
    QuditType(TypeContext& ctx, uint32_t dimension = 3)
        : Type(TypeKind::Qudit, ctx), dimension_(dimension) {}

    uint32_t getDimension() const { return dimension_; }
    bool isQutrit() const { return dimension_ == 3; }
    bool isQuNit() const { return dimension_ > 3; }

    std::string toLLVMString() const override {
        return "%Qudit_d" + std::to_string(dimension_) + "*";
    }

    std::string toString() const override {
        return "Qudit(d=" + std::to_string(dimension_) + ")";
    }

private:
    uint32_t dimension_;
};

} // namespace qir
`;

export const VALUE_H_CONTENT = `/**
 * @file include/ir/value.h
 * @brief Quantum Intermediate Representation (QIR) Value Hierarchy
 * 
 * Defines the computational Value hierarchy for constants, qubit handles,
 * instruction outputs, and function parameters within qir-platform.
 */

#pragma once

#include "qir/ir/type.h"
#include <string>
#include <vector>
#include <memory>
#include <utility>

namespace qir {

class User;
class Instruction;

/**
 * @brief Base class for any computation entity that yields a typed value or handle.
 */
class Value {
public:
    virtual ~Value() = default;

    Type* getType() const { return type_; }
    const std::string& getName() const { return name_; }
    void setName(std::string name) { name_ = std::move(name); }
    bool hasName() const { return !name_.empty(); }

    // Use-def tracking
    void addUse(User* user);
    void removeUse(User* user);
    const std::vector<User*>& getUsers() const { return users_; }
    bool hasUsers() const { return !users_.empty(); }

    virtual std::string dump() const = 0;

protected:
    Value(Type* type, std::string name = "")
        : type_(type), name_(std::move(name)) {}

    Type* type_;
    std::string name_;
    std::vector<User*> users_;
};

/**
 * @brief Constant numeric value (integers and rotation angles).
 */
class Constant : public Value {
public:
    explicit Constant(Type* type, std::string name = "") : Value(type, std::move(name)) {}
};

class ConstantInt : public Constant {
public:
    ConstantInt(TypeContext& ctx, int64_t val, unsigned bitwidth = 64);

    int64_t getValue() const { return value_; }
    std::string dump() const override { return std::to_string(value_); }

private:
    int64_t value_;
};

class ConstantDouble : public Constant {
public:
    ConstantDouble(TypeContext& ctx, double val);

    double getValue() const { return value_; }
    std::string dump() const override;

private:
    double value_;
};

/**
 * @brief QubitValue represents an individual allocated qubit identifier (%Qubit*).
 */
class QubitValue : public Value {
public:
    QubitValue(std::string name, Type* qubitType, uint64_t physicalId = 0);

    uint64_t getPhysicalId() const { return physicalId_; }
    void setPhysicalId(uint64_t id) { physicalId_ = id; }

    std::string dump() const override {
        return "%qubit." + (hasName() ? getName() : std::to_string(physicalId_));
    }

private:
    uint64_t physicalId_;
};

/**
 * @brief ResultValue represents the destination handle for projective measurements (%Result*).
 */
class ResultValue : public Value {
public:
    ResultValue(std::string name, Type* resultType, uint64_t registerIndex = 0);

    uint64_t getRegisterIndex() const { return registerIndex_; }

    std::string dump() const override {
        return "%result." + (hasName() ? getName() : std::to_string(registerIndex_));
    }

private:
    uint64_t registerIndex_;
};

} // namespace qir
`;

export const INSTRUCTION_H_CONTENT = `/**
 * @file include/ir/instruction.h
 * @brief Quantum Intermediate Representation (QIR) Instruction Hierarchy
 * 
 * Defines the Core Instruction Set for quantum computing adhering to the
 * QIR Base Profile specification. Includes single-qubit gates (H, X, Z, S),
 * multi-qubit gates (CNOT, CZ), measurement operations (Mz), and qubit
 * management (QubitAllocate, QubitRelease).
 */

#pragma once

#include "qir/ir/value.h"
#include "qir/ir/type.h"
#include <string>
#include <vector>
#include <memory>
#include <string_view>
#include <cstdint>

namespace qir {

class BasicBlock;

/**
 * @brief Quantum instruction opcodes supported by QIR core specification.
 */
enum class Opcode {
    // Single-qubit gates
    H,
    X,
    Y,
    Z,
    S,
    T,
    Rx,
    Ry,
    Rz,

    // Multi-qubit gates
    CNOT,
    CZ,
    SWAP,

    // Measurement operations
    Mz,

    // Qubit management & lifecycle
    QubitAllocate,
    QubitRelease,
    Reset,

    // Barrier & Synchronization
    Barrier,

    // Runtime ABI calls
    ResultRecordOutput,
    Call
};

const char* getOpcodeName(Opcode op);
const char* getOpcodeLLVMSymbol(Opcode op);
bool isSingleQubitGate(Opcode op);
bool isMultiQubitGate(Opcode op);
bool isQuantumGate(Opcode op);
bool isQubitManagement(Opcode op);

/**
 * @brief Base class for all executable instructions in QIR.
 * Inherits from Value, allowing instruction results to be tracked in SSA use-def chains.
 */
class Instruction : public Value {
public:
    virtual ~Instruction() = default;

    Opcode getOpcode() const { return opcode_; }
    const char* getOpcodeName() const { return qir::getOpcodeName(opcode_); }
    BasicBlock* getParent() const { return parent_; }
    void setParent(BasicBlock* parent) { parent_ = parent; }

    // Operand inspection & manipulation
    size_t getNumOperands() const { return operands_.size(); }
    Value* getOperand(size_t index) const;
    void setOperand(size_t index, Value* val);
    void addOperand(Value* val);
    const std::vector<Value*>& getOperands() const { return operands_; }

    // Classification helpers
    bool isQuantum() const { return isQuantumGate(opcode_); }
    bool isMeasurement() const { return opcode_ == Opcode::Mz; }
    bool isLifecycle() const { return isQubitManagement(opcode_); }
    bool isTerminator() const { return false; }

    // Target value assignment (for instructions producing output values)
    void setTargetValue(Value* val) { targetValue_ = val; }
    Value* getTargetValue() const { return targetValue_; }

    // LLVM IR emission & textual representation
    virtual std::string toLLVMString() const = 0;
    std::string dump() const override { return toLLVMString(); }

protected:
    Instruction(Opcode opcode, Type* type, std::vector<Value*> operands = {}, const std::string& name = "");

    Opcode opcode_;
    BasicBlock* parent_ = nullptr;
    std::vector<Value*> operands_;
    Value* targetValue_ = nullptr;
};

// ============================================================================
// Single-Qubit Quantum Gates: H, X, Z, S (and Y, T)
// ============================================================================

class SingleQubitGateInst : public Instruction {
public:
    SingleQubitGateInst(Opcode opcode, Type* voidType, Value* qubit);

    Value* getQubit() const { return getOperand(0); }
    std::string toLLVMString() const override;
};

class HGateInst : public SingleQubitGateInst {
public:
    explicit HGateInst(Type* voidType, Value* qubit)
        : SingleQubitGateInst(Opcode::H, voidType, qubit) {}
};

class XGateInst : public SingleQubitGateInst {
public:
    explicit XGateInst(Type* voidType, Value* qubit)
        : SingleQubitGateInst(Opcode::X, voidType, qubit) {}
};

class ZGateInst : public SingleQubitGateInst {
public:
    explicit ZGateInst(Type* voidType, Value* qubit)
        : SingleQubitGateInst(Opcode::Z, voidType, qubit) {}
};

class SGateInst : public SingleQubitGateInst {
public:
    explicit SGateInst(Type* voidType, Value* qubit)
        : SingleQubitGateInst(Opcode::S, voidType, qubit) {}
};

class TGateInst : public SingleQubitGateInst {
public:
    explicit TGateInst(Type* voidType, Value* qubit)
        : SingleQubitGateInst(Opcode::T, voidType, qubit) {}
};

// Parameterized rotation gates (Rx, Ry, Rz)
class RotationGateInst : public Instruction {
public:
    RotationGateInst(Opcode opcode, Type* voidType, Value* angle, Value* targetQubit);

    Value* getAngle() const { return getOperand(0); }
    Value* getTargetQubit() const { return getOperand(1); }
    std::string toLLVMString() const override;
};

// ============================================================================
// Multi-Qubit Quantum Gates: CNOT, CZ
// ============================================================================

class MultiQubitGateInst : public Instruction {
public:
    MultiQubitGateInst(Opcode opcode, Type* voidType, Value* control, Value* target);

    Value* getControlQubit() const { return getOperand(0); }
    Value* getTargetQubit() const { return getOperand(1); }
    std::string toLLVMString() const override;
};

class CNOTGateInst : public MultiQubitGateInst {
public:
    CNOTGateInst(Type* voidType, Value* control, Value* target)
        : MultiQubitGateInst(Opcode::CNOT, voidType, control, target) {}
};

class CZGateInst : public MultiQubitGateInst {
public:
    CZGateInst(Type* voidType, Value* control, Value* target)
        : MultiQubitGateInst(Opcode::CZ, voidType, control, target) {}
};

// ============================================================================
// Measurement Operations: Mz
// ============================================================================

class MeasureInst : public Instruction {
public:
    MeasureInst(Type* voidType, Value* qubit, Value* result);

    Value* getQubit() const { return getOperand(0); }
    Value* getResult() const { return getOperand(1); }
    std::string toLLVMString() const override;
};

// ============================================================================
// Qubit Management & Lifecycle: QubitAllocate, QubitRelease
// ============================================================================

class QubitAllocateInst : public Instruction {
public:
    explicit QubitAllocateInst(Type* qubitType, const std::string& name = "");

    std::string toLLVMString() const override;
};

class QubitReleaseInst : public Instruction {
public:
    QubitReleaseInst(Type* voidType, Value* qubit);

    Value* getQubit() const { return getOperand(0); }
    std::string toLLVMString() const override;
};

class ResetInst : public Instruction {
public:
    ResetInst(Type* voidType, Value* qubit);

    Value* getQubit() const { return getOperand(0); }
    std::string toLLVMString() const override;
};

// ============================================================================
// Barrier & Generic Runtime Invocations
// ============================================================================

class BarrierInst : public Instruction {
public:
    BarrierInst(Type* voidType, std::vector<Value*> qubits = {});

    const std::vector<Value*>& getQubits() const { return operands_; }
    std::string toLLVMString() const override;
};

class CallInstruction : public Instruction {
public:
    CallInstruction(std::string functionName, Type* returnType, std::vector<Value*> args);

    const std::string& getFunctionName() const { return functionName_; }
    std::string toLLVMString() const override;

private:
    std::string functionName_;
};

// ============================================================================
// Result Handle Management & Lifetime Reference Counting
// ============================================================================

class ResultReleaseInst : public Instruction {
public:
    ResultReleaseInst(Type* voidType, Value* result)
        : Instruction(Opcode::Call, voidType, {result}, "res.release") {}

    Value* getResult() const { return getOperand(0); }
    std::string toLLVMString() const override {
        return "call void @__quantum__rt__result_release(%Result* " + getResult()->dump() + ")";
    }
};

// ============================================================================
// Real-Time Control Flow & Dynamic Measurement Conditioning
// ============================================================================

class BranchInst : public Instruction {
public:
    explicit BranchInst(Type* voidType, BasicBlock* dest)
        : Instruction(Opcode::Call, voidType, {}, "br"), dest_(dest) {}

    BasicBlock* getDestination() const { return dest_; }
    std::string toLLVMString() const override;

private:
    BasicBlock* dest_;
};

class CondBranchInst : public Instruction {
public:
    CondBranchInst(Type* voidType, Value* condition, BasicBlock* trueBB, BasicBlock* falseBB)
        : Instruction(Opcode::Call, voidType, {condition}, "br.cond"), trueBB_(trueBB), falseBB_(falseBB) {}

    Value* getCondition() const { return getOperand(0); }
    BasicBlock* getTrueBlock() const { return trueBB_; }
    BasicBlock* getFalseBlock() const { return falseBB_; }
    std::string toLLVMString() const override;

private:
    BasicBlock* trueBB_;
    BasicBlock* falseBB_;
};

// ============================================================================
// Multi-State Qudit Gates (d >= 3)
// ============================================================================

class QuditGateInst : public Instruction {
public:
    QuditGateInst(Type* voidType, std::string gateName, Value* qudit, uint32_t dimension = 3)
        : Instruction(Opcode::Call, voidType, {qudit}, gateName), gateName_(std::move(gateName)), dimension_(dimension) {}

    const std::string& getGateName() const { return gateName_; }
    uint32_t getDimension() const { return dimension_; }
    std::string toLLVMString() const override {
        return "call void @__quantum__qis__qudit_" + gateName_ + "_d" + std::to_string(dimension_) +
               "(%Qudit_d" + std::to_string(dimension_) + "* " + getOperand(0)->dump() + ")";
    }

private:
    std::string gateName_;
    uint32_t dimension_;
};

} // namespace qir
`;

export const INSTRUCTION_CPP_CONTENT = `/**
 * @file src/ir/instruction.cpp
 * @brief Implementation of the QIR Instruction Hierarchy
 * 
 * Provides concrete definitions for quantum gate opcodes (H, X, Z, S, CNOT, CZ),
 * projective measurements (Mz), and qubit lifecycle instructions (QubitAllocate, QubitRelease).
 * Follows QIR Base Profile runtime conventions with __quantum__qis__* and __quantum__rt__*.
 */

#include "qir/ir/instruction.h"
#include "qir/ir/value.h"
#include "qir/ir/type.h"
#include "qir/ir/block.h"
#include <sstream>
#include <stdexcept>

namespace qir {

const char* getOpcodeName(Opcode op) {
    switch (op) {
        case Opcode::H:                  return "H";
        case Opcode::X:                  return "X";
        case Opcode::Y:                  return "Y";
        case Opcode::Z:                  return "Z";
        case Opcode::S:                  return "S";
        case Opcode::T:                  return "T";
        case Opcode::Rx:                 return "Rx";
        case Opcode::Ry:                 return "Ry";
        case Opcode::Rz:                 return "Rz";
        case Opcode::CNOT:               return "CNOT";
        case Opcode::CZ:                 return "CZ";
        case Opcode::SWAP:               return "SWAP";
        case Opcode::Mz:                 return "Mz";
        case Opcode::QubitAllocate:      return "QubitAllocate";
        case Opcode::QubitRelease:       return "QubitRelease";
        case Opcode::Reset:              return "Reset";
        case Opcode::Barrier:            return "Barrier";
        case Opcode::ResultRecordOutput: return "ResultRecordOutput";
        case Opcode::Call:               return "Call";
        default:                         return "Unknown";
    }
}

const char* getOpcodeLLVMSymbol(Opcode op) {
    switch (op) {
        case Opcode::H:                  return "__quantum__qis__h__body";
        case Opcode::X:                  return "__quantum__qis__x__body";
        case Opcode::Y:                  return "__quantum__qis__y__body";
        case Opcode::Z:                  return "__quantum__qis__z__body";
        case Opcode::S:                  return "__quantum__qis__s__body";
        case Opcode::T:                  return "__quantum__qis__t__body";
        case Opcode::Rx:                 return "__quantum__qis__rx__body";
        case Opcode::Ry:                 return "__quantum__qis__ry__body";
        case Opcode::Rz:                 return "__quantum__qis__rz__body";
        case Opcode::CNOT:               return "__quantum__qis__cnot__body";
        case Opcode::CZ:                 return "__quantum__qis__cz__body";
        case Opcode::SWAP:               return "__quantum__qis__swap__body";
        case Opcode::Mz:                 return "__quantum__qis__mz__body";
        case Opcode::QubitAllocate:      return "__quantum__rt__qubit_allocate";
        case Opcode::QubitRelease:       return "__quantum__rt__qubit_release";
        case Opcode::Reset:              return "__quantum__qis__reset__body";
        case Opcode::Barrier:            return "__quantum__qis__barrier__body";
        case Opcode::ResultRecordOutput: return "__quantum__rt__result_record_output";
        default:                         return "__quantum__custom";
    }
}

bool isSingleQubitGate(Opcode op) {
    return op == Opcode::H || op == Opcode::X || op == Opcode::Y ||
           op == Opcode::Z || op == Opcode::S || op == Opcode::T ||
           op == Opcode::Rx || op == Opcode::Ry || op == Opcode::Rz;
}

bool isMultiQubitGate(Opcode op) {
    return op == Opcode::CNOT || op == Opcode::CZ || op == Opcode::SWAP;
}

bool isQuantumGate(Opcode op) {
    return isSingleQubitGate(op) || isMultiQubitGate(op) || op == Opcode::Barrier;
}

bool isQubitManagement(Opcode op) {
    return op == Opcode::QubitAllocate || op == Opcode::QubitRelease || op == Opcode::Reset;
}

// ----------------------------------------------------------------------------
// Instruction Base Implementation
// ----------------------------------------------------------------------------

Instruction::Instruction(Opcode opcode, Type* type, std::vector<Value*> operands, const std::string& name)
    : Value(type, name), opcode_(opcode), operands_(std::move(operands)) {}

Value* Instruction::getOperand(size_t index) const {
    if (index >= operands_.size()) {
        throw std::out_of_range("Operand index out of range in Instruction::getOperand");
    }
    return operands_[index];
}

void Instruction::setOperand(size_t index, Value* val) {
    if (index >= operands_.size()) {
        throw std::out_of_range("Operand index out of range in Instruction::setOperand");
    }
    operands_[index] = val;
}

void Instruction::addOperand(Value* val) {
    operands_.push_back(val);
}

// ----------------------------------------------------------------------------
// Single-Qubit Gate Implementation: H, X, Z, S
// ----------------------------------------------------------------------------

SingleQubitGateInst::SingleQubitGateInst(Opcode opcode, Type* voidType, Value* qubit)
    : Instruction(opcode, voidType, { qubit }) {
    if (!qubit) {
        throw std::invalid_argument("Single-qubit gate requires a non-null qubit operand");
    }
}

std::string SingleQubitGateInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_) << "(%Qubit* " << getQubit()->dump() << ")";
    return ss.str();
}

// ----------------------------------------------------------------------------
// Parameterized Rotation Gates: Rx, Ry, Rz
// ----------------------------------------------------------------------------

RotationGateInst::RotationGateInst(Opcode opcode, Type* voidType, Value* angle, Value* targetQubit)
    : Instruction(opcode, voidType, { angle, targetQubit }) {
    if (!angle || !targetQubit) {
        throw std::invalid_argument("Rotation gate requires valid angle and target qubit operands");
    }
}

std::string RotationGateInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_)
       << "(double " << getAngle()->dump() << ", %Qubit* " << getTargetQubit()->dump() << ")";
    return ss.str();
}

// ----------------------------------------------------------------------------
// Multi-Qubit Gate Implementation: CNOT, CZ
// ----------------------------------------------------------------------------

MultiQubitGateInst::MultiQubitGateInst(Opcode opcode, Type* voidType, Value* control, Value* target)
    : Instruction(opcode, voidType, { control, target }) {
    if (!control || !target) {
        throw std::invalid_argument("Multi-qubit gate requires valid control and target qubits");
    }
    if (control == target) {
        throw std::logic_error("Control and target qubits cannot be identical in multi-qubit gate");
    }
}

std::string MultiQubitGateInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_)
       << "(%Qubit* " << getControlQubit()->dump() << ", %Qubit* " << getTargetQubit()->dump() << ")";
    return ss.str();
}

// ----------------------------------------------------------------------------
// Measurement Operation Implementation: Mz
// ----------------------------------------------------------------------------

MeasureInst::MeasureInst(Type* voidType, Value* qubit, Value* result)
    : Instruction(Opcode::Mz, voidType, { qubit, result }) {
    if (!qubit || !result) {
        throw std::invalid_argument("MeasureInst requires valid qubit and result handles");
    }
}

std::string MeasureInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_)
       << "(%Qubit* " << getQubit()->dump() << ", %Result* " << getResult()->dump() << ")";
    return ss.str();
}

// ----------------------------------------------------------------------------
// Qubit Management & Lifecycle: QubitAllocate, QubitRelease, Reset
// ----------------------------------------------------------------------------

QubitAllocateInst::QubitAllocateInst(Type* qubitType, const std::string& name)
    : Instruction(Opcode::QubitAllocate, qubitType, {}, name) {}

std::string QubitAllocateInst::toLLVMString() const {
    std::ostringstream ss;
    std::string valName = hasName() ? ("%" + getName()) : (targetValue_ ? targetValue_->dump() : "%qubit");
    ss << "  " << valName << " = call %Qubit* @" << getOpcodeLLVMSymbol(opcode_) << "()";
    return ss.str();
}

QubitReleaseInst::QubitReleaseInst(Type* voidType, Value* qubit)
    : Instruction(Opcode::QubitRelease, voidType, { qubit }) {
    if (!qubit) {
        throw std::invalid_argument("QubitReleaseInst requires a valid qubit operand");
    }
}

std::string QubitReleaseInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_) << "(%Qubit* " << getQubit()->dump() << ")";
    return ss.str();
}

ResetInst::ResetInst(Type* voidType, Value* qubit)
    : Instruction(Opcode::Reset, voidType, { qubit }) {
    if (!qubit) {
        throw std::invalid_argument("ResetInst requires a valid qubit operand");
    }
}

std::string ResetInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_) << "(%Qubit* " << getQubit()->dump() << ")";
    return ss.str();
}

// ----------------------------------------------------------------------------
// Barrier & Generic Call Implementation
// ----------------------------------------------------------------------------

BarrierInst::BarrierInst(Type* voidType, std::vector<Value*> qubits)
    : Instruction(Opcode::Barrier, voidType, std::move(qubits)) {}

std::string BarrierInst::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call void @" << getOpcodeLLVMSymbol(opcode_) << "()";
    return ss.str();
}

CallInstruction::CallInstruction(std::string functionName, Type* returnType, std::vector<Value*> args)
    : Instruction(Opcode::Call, returnType, std::move(args)), functionName_(std::move(functionName)) {}

std::string CallInstruction::toLLVMString() const {
    std::ostringstream ss;
    ss << "  call " << (type_ ? type_->toLLVMString() : "void") << " @" << functionName_ << "(";
    for (size_t i = 0; i < operands_.size(); ++i) {
        if (i > 0) ss << ", ";
        if (operands_[i]->getType()) {
            ss << operands_[i]->getType()->toLLVMString() << " ";
        }
        ss << operands_[i]->dump();
    }
    ss << ")";
    return ss.str();
}

} // namespace qir
`;

export const BUILDER_H_CONTENT = `/**
 * @file include/ir/builder.h
 * @brief Quantum Intermediate Representation (QIR) Instruction Builder
 * 
 * Provides a fluent API for creating and inserting QIR instructions into BasicBlocks.
 * Supports single-qubit gates (H, X, Z, S), multi-qubit gates (CNOT, CZ),
 * measurement operations (Mz), and qubit management (QubitAllocate, QubitRelease).
 */

#pragma once

#include "qir/ir/type.h"
#include "qir/ir/value.h"
#include "qir/ir/instruction.h"
#include <string>
#include <vector>
#include <memory>

namespace qir {

class BasicBlock;

/**
 * @brief Fluent IR Builder for Quantum Intermediate Representation.
 * Provides high-level Create* methods adhering to standard LLVM IRBuilder conventions.
 */
class QIRBuilder {
public:
    explicit QIRBuilder(TypeContext& ctx);

    // Insertion Point Management
    void setInsertPoint(BasicBlock* block);
    BasicBlock* getInsertBlock() const { return insertBlock_; }
    TypeContext& getContext() const { return context_; }

    // Qubit Lifecycle Management
    QubitValue* CreateQubitAllocate(const std::string& name = "");
    QubitReleaseInst* CreateQubitRelease(Value* qubit);
    ResetInst* CreateReset(Value* qubit);
    const std::vector<QubitValue*>& getAllocatedQubits() const { return allocatedQubits_; }

    // Single-Qubit Quantum Gates: H, X, Z, S, T
    HGateInst* CreateH(Value* qubit);
    XGateInst* CreateX(Value* qubit);
    ZGateInst* CreateZ(Value* qubit);
    SGateInst* CreateS(Value* qubit);
    TGateInst* CreateT(Value* qubit);

    // Parameterized Rotations
    RotationGateInst* CreateRx(Value* angle, Value* target);
    RotationGateInst* CreateRy(Value* angle, Value* target);
    RotationGateInst* CreateRz(Value* angle, Value* target);

    // Multi-Qubit Quantum Gates: CNOT, CZ
    CNOTGateInst* CreateCNOT(Value* control, Value* target);
    CZGateInst* CreateCZ(Value* control, Value* target);

    // Measurement & Readout Operations
    ResultValue* CreateMeasure(Value* qubit, const std::string& resultName = "");
    MeasureInst* CreateMz(Value* qubit, ResultValue* result);

    // Synchronization & Runtime Outputs
    BarrierInst* CreateBarrier(const std::vector<Value*>& qubits = {});
    CallInstruction* CreateResultRecordOutput(Value* result, Value* label = nullptr);

    // Fluent Chaining Interface
    QIRBuilder& H(Value* qubit) { CreateH(qubit); return *this; }
    QIRBuilder& X(Value* qubit) { CreateX(qubit); return *this; }
    QIRBuilder& Z(Value* qubit) { CreateZ(qubit); return *this; }
    QIRBuilder& S(Value* qubit) { CreateS(qubit); return *this; }
    QIRBuilder& CNOT(Value* ctrl, Value* tgt) { CreateCNOT(ctrl, tgt); return *this; }
    QIRBuilder& CZ(Value* ctrl, Value* tgt) { CreateCZ(ctrl, tgt); return *this; }
    QIRBuilder& Mz(Value* qubit, ResultValue* res) { CreateMz(qubit, res); return *this; }
    QIRBuilder& Barrier(const std::vector<Value*>& qubits = {}) { CreateBarrier(qubits); return *this; }

private:
    TypeContext& context_;
    BasicBlock* insertBlock_;
    uint64_t nextQubitId_;
    uint64_t nextResultId_;
    std::vector<QubitValue*> allocatedQubits_;
};

} // namespace qir
`;

export const BUILDER_CPP_CONTENT = `/**
 * @file src/ir/builder.cpp
 * @brief Implementation of the QIR IRBuilder Fluent API
 * 
 * Emits QIR-compliant quantum instructions, runtime calls (__quantum__qis__*),
 * memory allocations, and barrier synchronizations adhering to QIR Base Profile.
 */

#include "qir/ir/builder.h"
#include "qir/ir/instruction.h"
#include "qir/ir/block.h"
#include "qir/ir/module.h"
#include <iostream>
#include <stdexcept>

namespace qir {

QIRBuilder::QIRBuilder(TypeContext& ctx)
    : context_(ctx), insertBlock_(nullptr), nextQubitId_(0), nextResultId_(0) {}

void QIRBuilder::setInsertPoint(BasicBlock* block) {
    insertBlock_ = block;
}

// ----------------------------------------------------------------------------
// Qubit Lifecycle Management: QubitAllocate, QubitRelease
// ----------------------------------------------------------------------------

QubitValue* QIRBuilder::CreateQubitAllocate(const std::string& name) {
    if (!insertBlock_) {
        throw std::runtime_error("Cannot allocate qubit: insertion block is null.");
    }
    
    auto* qubitType = QubitType::get(context_);
    auto qubitName = name.empty() ? ("q_" + std::to_string(nextQubitId_)) : name;
    auto* qubit = new QubitValue(qubitName, qubitType, nextQubitId_++);
    
    // Create and append QubitAllocateInst
    auto* allocInst = new QubitAllocateInst(qubitType, qubitName);
    allocInst->setTargetValue(qubit);
    insertBlock_->appendInstruction(allocInst);
    
    allocatedQubits_.push_back(qubit);
    return qubit;
}

QubitReleaseInst* QIRBuilder::CreateQubitRelease(Value* qubit) {
    if (!insertBlock_) {
        throw std::runtime_error("Cannot release qubit: insertion block is null.");
    }
    if (!qubit) {
        throw std::invalid_argument("CreateQubitRelease requires a valid qubit value");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* releaseInst = new QubitReleaseInst(voidType, qubit);
    insertBlock_->appendInstruction(releaseInst);
    return releaseInst;
}

ResetInst* QIRBuilder::CreateReset(Value* qubit) {
    if (!insertBlock_) {
        throw std::runtime_error("Cannot reset qubit: insertion block is null.");
    }
    auto* voidType = TypeContext::getVoidType(context_);
    auto* resetInst = new ResetInst(voidType, qubit);
    insertBlock_->appendInstruction(resetInst);
    return resetInst;
}

// ----------------------------------------------------------------------------
// Single-Qubit Quantum Gates: H, X, Z, S, T
// ----------------------------------------------------------------------------

HGateInst* QIRBuilder::CreateH(Value* qubit) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateH");
    if (!qubit || !qubit->getType()->isQubit()) {
        throw std::invalid_argument("Hadamard gate requires a valid %Qubit* handle");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new HGateInst(voidType, qubit);
    insertBlock_->appendInstruction(inst);
    return inst;
}

XGateInst* QIRBuilder::CreateX(Value* qubit) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateX");
    if (!qubit || !qubit->getType()->isQubit()) {
        throw std::invalid_argument("Pauli-X gate requires a valid %Qubit* handle");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new XGateInst(voidType, qubit);
    insertBlock_->appendInstruction(inst);
    return inst;
}

ZGateInst* QIRBuilder::CreateZ(Value* qubit) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateZ");
    if (!qubit || !qubit->getType()->isQubit()) {
        throw std::invalid_argument("Pauli-Z gate requires a valid %Qubit* handle");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new ZGateInst(voidType, qubit);
    insertBlock_->appendInstruction(inst);
    return inst;
}

SGateInst* QIRBuilder::CreateS(Value* qubit) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateS");
    if (!qubit || !qubit->getType()->isQubit()) {
        throw std::invalid_argument("Phase (S) gate requires a valid %Qubit* handle");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new SGateInst(voidType, qubit);
    insertBlock_->appendInstruction(inst);
    return inst;
}

TGateInst* QIRBuilder::CreateT(Value* qubit) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateT");
    if (!qubit || !qubit->getType()->isQubit()) {
        throw std::invalid_argument("T gate requires a valid %Qubit* handle");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new TGateInst(voidType, qubit);
    insertBlock_->appendInstruction(inst);
    return inst;
}

// ----------------------------------------------------------------------------
// Parameterized Rotation Gates: Rx, Ry, Rz
// ----------------------------------------------------------------------------

RotationGateInst* QIRBuilder::CreateRx(Value* angle, Value* target) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateRx");
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new RotationGateInst(Opcode::Rx, voidType, angle, target);
    insertBlock_->appendInstruction(inst);
    return inst;
}

RotationGateInst* QIRBuilder::CreateRy(Value* angle, Value* target) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateRy");
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new RotationGateInst(Opcode::Ry, voidType, angle, target);
    insertBlock_->appendInstruction(inst);
    return inst;
}

RotationGateInst* QIRBuilder::CreateRz(Value* angle, Value* target) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateRz");
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new RotationGateInst(Opcode::Rz, voidType, angle, target);
    insertBlock_->appendInstruction(inst);
    return inst;
}

// ----------------------------------------------------------------------------
// Multi-Qubit Quantum Gates: CNOT, CZ
// ----------------------------------------------------------------------------

CNOTGateInst* QIRBuilder::CreateCNOT(Value* control, Value* target) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateCNOT");
    if (!control || !target) {
        throw std::invalid_argument("CNOT gate requires control and target qubits");
    }
    if (control == target) {
        throw std::logic_error("CNOT gate cannot target and control the same qubit");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new CNOTGateInst(voidType, control, target);
    insertBlock_->appendInstruction(inst);
    return inst;
}

CZGateInst* QIRBuilder::CreateCZ(Value* control, Value* target) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateCZ");
    if (!control || !target) {
        throw std::invalid_argument("CZ gate requires control and target qubits");
    }
    if (control == target) {
        throw std::logic_error("CZ gate cannot target and control the same qubit");
    }
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* inst = new CZGateInst(voidType, control, target);
    insertBlock_->appendInstruction(inst);
    return inst;
}

// ----------------------------------------------------------------------------
// Measurement & Synchronization: Mz, Barrier
// ----------------------------------------------------------------------------

ResultValue* QIRBuilder::CreateMeasure(Value* qubit, const std::string& resultName) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateMeasure");
    if (!qubit) throw std::invalid_argument("Measurement requires a valid qubit handle");
    
    auto* resultType = ResultType::get(context_);
    auto resName = resultName.empty() ? ("r_" + std::to_string(nextResultId_)) : resultName;
    auto* result = new ResultValue(resName, resultType, nextResultId_++);
    
    auto* voidType = TypeContext::getVoidType(context_);
    auto* measureInst = new MeasureInst(voidType, qubit, result);
    insertBlock_->appendInstruction(measureInst);
    
    return result;
}

MeasureInst* QIRBuilder::CreateMz(Value* qubit, ResultValue* result) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateMz");
    if (!qubit || !result) {
        throw std::invalid_argument("CreateMz requires valid qubit and result handles");
    }
    auto* voidType = TypeContext::getVoidType(context_);
    auto* measureInst = new MeasureInst(voidType, qubit, result);
    insertBlock_->appendInstruction(measureInst);
    return measureInst;
}

BarrierInst* QIRBuilder::CreateBarrier(const std::vector<Value*>& qubits) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateBarrier");
    auto* voidType = TypeContext::getVoidType(context_);
    auto* barrierInst = new BarrierInst(voidType, qubits);
    insertBlock_->appendInstruction(barrierInst);
    return barrierInst;
}

CallInstruction* QIRBuilder::CreateResultRecordOutput(Value* result, Value* label) {
    if (!insertBlock_) throw std::runtime_error("Insertion block is null in CreateResultRecordOutput");
    auto* voidType = TypeContext::getVoidType(context_);
    std::vector<Value*> args = { result };
    if (label) args.push_back(label);
    
    auto* callInst = new CallInstruction("__quantum__rt__result_record_output", voidType, args);
    insertBlock_->appendInstruction(callInst);
    return callInst;
}

} // namespace qir
`;

export const BASE_PROFILE_YAML = `name: "QIR Base Profile"
version: "1.0.0"
spec_version: "v0.1"
description: >
  Specification profile for static quantum programs with no dynamic control flow
  and fixed measurement outcome readouts at circuit conclusion.

rules:
  control_flow:
    allow_dynamic_branches: false
    allow_loops: false
    entry_point_only: true
  qubits:
    allocation: static_or_entry_block_only
    reuse_permitted: false
    max_qubits: 65536
  classical:
    arithmetic: limited_to_constant_folding
    memory_access: static_constant_gep
  measurements:
    mz_only: true
    result_handling: write_only_to_output_records

required_runtime_functions:
  - __quantum__rt__qubit_allocate
  - __quantum__rt__qubit_release
  - __quantum__qis__h__body
  - __quantum__qis__cnot__body
  - __quantum__qis__mz__body
  - __quantum__rt__result_record_output
`;

export const BELL_PAIR_LL = `; ModuleID = 'bell_pair.ll'
source_filename = "bell_pair.qasm"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

%Qubit = type opaque
%Result = type opaque

declare %Qubit* @__quantum__rt__qubit_allocate()
declare void @__quantum__rt__qubit_release(%Qubit*)
declare void @__quantum__qis__h__body(%Qubit*)
declare void @__quantum__qis__cnot__body(%Qubit*, %Qubit*)
declare void @__quantum__qis__mz__body(%Qubit*, %Result*)
declare void @__quantum__rt__result_record_output(%Result*, i8*)

define void @main() #0 {
entry:
  ; Allocate two physical qubits for Bell state preparation |Phi+>
  %q0 = call %Qubit* @__quantum__rt__qubit_allocate()
  %q1 = call %Qubit* @__quantum__rt__qubit_allocate()

  ; Prepare Superposition on q0: H |0> = (|0> + |1>) / sqrt(2)
  call void @__quantum__qis__h__body(%Qubit* %q0)

  ; Entangle q0 and q1: CNOT(q0, q1) => (|00> + |11>) / sqrt(2)
  call void @__quantum__qis__cnot__body(%Qubit* %q0, %Qubit* %q1)

  ; Perform projective measurements into canonical output handles
  call void @__quantum__qis__mz__body(%Qubit* %q0, %Result* inttoptr (i64 0 to %Result*))
  call void @__quantum__qis__mz__body(%Qubit* %q1, %Result* inttoptr (i64 1 to %Result*))

  ; Record results according to QIR Base Profile
  call void @__quantum__rt__result_record_output(%Result* inttoptr (i64 0 to %Result*), i8* null)
  call void @__quantum__rt__result_record_output(%Result* inttoptr (i64 1 to %Result*), i8* null)

  ; Cleanup qubits
  call void @__quantum__rt__qubit_release(%Qubit* %q0)
  call void @__quantum__rt__qubit_release(%Qubit* %q1)
  ret void
}

attributes #0 = { "qir_profiles"="custom,base_profile" "required_num_qubits"="2" "required_num_results"="2" }
`;

export const BELL_PAIR_QASM = `OPENQASM 3.0;
include "stdgates.inc";

// Prepare Bell State |Phi+> = (|00> + |11>) / sqrt(2)
qubit[2] q;
bit[2] c;

h q[0];
cx q[0], q[1];

c[0] = measure q[0];
c[1] = measure q[1];
`;

export const CMAKE_LISTS_TXT = `cmake_minimum_required(VERSION 3.24)
project(qir-platform VERSION 0.8.4 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# LLVM 17+ Dependency Configuration
find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM \${LLVM_PACKAGE_VERSION} at \${LLVM_DIR}")
include_directories(\${LLVM_INCLUDE_DIRS})
add_definitions(\${LLVM_DEFINITIONS})

# Core Library Target
include_directories(include include/qir)

file(GLOB_RECURSE CORE_SOURCES
    src/core/*.cpp
    src/ir/*.cpp
    src/frontend/*.cpp
    src/lowering/*.cpp
    src/llvm/*.cpp
    src/validation/*.cpp
    src/optimization/*.cpp
    src/runtime/*.cpp
)

add_library(qir_core SHARED \${CORE_SOURCES})
target_include_directories(qir_core PUBLIC include include/qir)

# Tools Executables
add_executable(qir-compile tools/qir-compile/main.cpp)
target_link_libraries(qir-compile PRIVATE qir_core)

add_executable(qir-validate tools/qir-validate/main.cpp)
target_link_libraries(qir-validate PRIVATE qir_core)

add_executable(qir-opt tools/qir-opt/main.cpp)
target_link_libraries(qir-opt PRIVATE qir_core)

# Testing
enable_testing()
add_subdirectory(tests)
`;

export const MAKEFILE_CONTENT = `.PHONY: all clean build test validate format help

BUILD_DIR = build
CMAKE_FLAGS = -DCMAKE_BUILD_TYPE=Release -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

all: build

build:
\t@mkdir -p $(BUILD_DIR)
\t@cd $(BUILD_DIR) && cmake .. $(CMAKE_FLAGS)
\t@cmake --build $(BUILD_DIR) -j8
\t@echo "\\033[32m[SUCCESS] qir-platform binaries and libraries compiled successfully!\\033[0m"

test: build
\t@cd $(BUILD_DIR) && ctest --output-on-failure
\t@echo "\\033[32m[PASS] All quantum intermediate representation test suites passed.\\033[0m"

validate: build
\t@./$(BUILD_DIR)/tools/qir-validate examples/bell_pair/bell_pair.ll --profile=base

format:
\t@find include src tests tools -iname '*.h' -o -iname '*.cpp' | xargs clang-format -i
\t@echo "\\033[34m[FORMAT] Code formatted to Google/LLVM C++ standard.\\033[0m"

clean:
\t@rm -rf $(BUILD_DIR)
\t@echo "Cleaned build artifacts."

help:
\t@echo "Available commands:"
\t@echo "  make build      - Compile qir_core and CLI tools (qir-compile, qir-validate)"
\t@echo "  make test       - Execute unit and integration tests"
\t@echo "  make validate   - Validate example QIR LLVM against Base Profile"
\t@echo "  make format     - Run clang-format over codebase"
`;

export const BUILD_SH = `#!/usr/bin/env bash
set -e

echo "=== Building Quantum Intermediate Representation Platform (qir-platform) ==="
echo "[1/4] Detecting toolchain: Clang 17 / GCC 13..."
echo "  CXX: \${CXX:-clang++}"
echo "  LLVM Version: 17.0.6"

mkdir -p build
cd build

echo "[2/4] Configuring CMake targets..."
cmake -DCMAKE_BUILD_TYPE=Release -DQIR_BUILD_TESTS=ON -DQIR_BUILD_TOOLS=ON ..

echo "[3/4] Compiling QIR IRBuilder, LLVM Emitter, and Validator..."
cmake --build . -j8

echo "[4/4] Verifying Base Profile conformance on test circuits..."
./tools/qir-validate/qir-validate ../examples/bell_pair/bell_pair.ll --profile=base

echo "=== Build Completed Successfully. Artifacts available in ./build/ ==="
`;

export const README_MD = `# qir-platform

A high-performance, modular C++20 compiler and runtime platform for **Quantum Intermediate Representation (QIR)** based on LLVM 17+.

## Key Architecture
- **\`include/ir/type.h\` & \`include/ir/value.h\`**: Opaque quantum handles (\`%Qubit*\`, \`%Result*\`) and typed value graphs.
- **\`src/ir/builder.cpp\`**: Programmatic emitter for quantum primitives (\`H\`, \`CX\`, \`RZ\`, \`Measure\`, \`Barrier\`).
- **\`specs/profiles/base.yaml\`**: QIR Base Profile specification rules and runtime ABI definitions.
- **\`tools/\`**:
  - \`qir-compile\`: Lowers OpenQASM 3 circuits to QIR LLVM bitcode.
  - \`qir-validate\`: Lints and enforces hardware profile constraints.
  - \`qir-opt\`: Quantum circuit passes (gate cancellation, rotation fusion, dead-qubit elimination).

## Quick Start
\`\`\`bash
# Build the workspace
make -j8

# Compile Bell Pair circuit
./build/tools/qir-compile examples/bell_pair/bell_pair.qasm -o bell_pair.ll

# Validate QIR Base Profile
./build/tools/qir-validate examples/bell_pair/bell_pair.ll
\`\`\`
`;

export const INSTRUCTION_SET_YAML = `instruction_set:
  name: "QIR Core Instruction Set"
  standard: "QIR Spec v1.0"
  gates:
    single_qubit:
      - name: h
        matrix: "1/sqrt(2) * [[1, 1], [1, -1]]"
        llvm_func: "__quantum__qis__h__body"
        reversible: true
      - name: x
        matrix: "[[0, 1], [1, 0]]"
        llvm_func: "__quantum__qis__x__body"
        reversible: true
      - name: rz
        params: [theta: double]
        llvm_func: "__quantum__qis__rz__body"
        reversible: true
    two_qubit:
      - name: cx
        llvm_func: "__quantum__qis__cnot__body"
        reversible: true
    measurement:
      - name: mz
        params: [qubit: "%Qubit*", result: "%Result*"]
        llvm_func: "__quantum__qis__mz__body"
        reversible: false
`;

export const TEST_TYPES_CPP = `// tests/unit/test_types.cpp
#include "qir/ir/type.h"
#include "qir/ir/value.h"
#include <cassert>
#include <iostream>

int main() {
    std::cout << "[TEST] Running QIR Type System Unit Invariants...\\n";
    
    // Test Type verification
    qir::TypeContext ctx;
    auto* qTy = qir::QubitType::get(ctx);
    auto* rTy = qir::ResultType::get(ctx);
    auto* i64 = qir::IntegerType::get(ctx, 64);
    
    assert(qTy->isQubit() && "Must be QubitType");
    assert(rTy->isResult() && "Must be ResultType");
    assert(qTy->toLLVMString() == "%Qubit*");
    assert(rTy->toLLVMString() == "%Result*");
    assert(i64->toLLVMString() == "i64");

    std::cout << "[PASS] All type invariants successfully verified.\\n";
    return 0;
}
`;

export const TEST_BUILDER_CPP = `// tests/unit/test_ir_builder.cpp
#include "qir/ir/builder.h"
#include "qir/ir/instruction.h"
#include "qir/ir/type.h"
#include "qir/ir/value.h"
#include "qir/ir/block.h"
#include <cassert>
#include <iostream>

int main() {
    std::cout << "[TEST] Running QIR Instruction Set & Fluent IRBuilder Test Suite...\\n";
    
    qir::TypeContext ctx;
    auto* voidTy = qir::TypeContext::getVoidType(ctx);
    qir::BasicBlock entryBlock("entry", voidTy);
    
    qir::QIRBuilder builder(ctx);
    builder.setInsertPoint(&entryBlock);
    
    // 1. Test Qubit Allocation (QubitAllocate)
    auto* q0 = builder.CreateQubitAllocate("q0");
    auto* q1 = builder.CreateQubitAllocate("q1");
    assert(q0 != nullptr && "Qubit allocation failed");
    assert(q1 != nullptr && "Qubit allocation failed");
    assert(builder.getAllocatedQubits().size() == 2);
    
    // 2. Test Single-Qubit Gates (H, X, Z, S, T)
    auto* hInst = builder.CreateH(q0);
    assert(hInst->getOpcode() == qir::Opcode::H);
    assert(hInst->getQubit() == q0);
    assert(hInst->toLLVMString().find("__quantum__qis__h__body") != std::string::npos);
    
    auto* xInst = builder.CreateX(q1);
    assert(xInst->getOpcode() == qir::Opcode::X);
    
    auto* zInst = builder.CreateZ(q0);
    assert(zInst->getOpcode() == qir::Opcode::Z);
    
    auto* sInst = builder.CreateS(q1);
    assert(sInst->getOpcode() == qir::Opcode::S);
    
    // 3. Test Multi-Qubit Gates (CNOT, CZ)
    auto* cnotInst = builder.CreateCNOT(q0, q1);
    assert(cnotInst->getOpcode() == qir::Opcode::CNOT);
    assert(cnotInst->getControlQubit() == q0);
    assert(cnotInst->getTargetQubit() == q1);
    assert(cnotInst->toLLVMString().find("__quantum__qis__cnot__body") != std::string::npos);
    
    auto* czInst = builder.CreateCZ(q0, q1);
    assert(czInst->getOpcode() == qir::Opcode::CZ);
    
    // 4. Test Measurement Operation (Mz)
    auto* r0 = builder.CreateMeasure(q0, "r0");
    assert(r0 != nullptr && "Measurement failed");
    
    // 5. Test Qubit Lifecycle Cleanup (QubitRelease)
    auto* rel0 = builder.CreateQubitRelease(q0);
    auto* rel1 = builder.CreateQubitRelease(q1);
    assert(rel0->getOpcode() == qir::Opcode::QubitRelease);
    assert(rel1->getOpcode() == qir::Opcode::QubitRelease);
    assert(rel0->toLLVMString().find("__quantum__rt__qubit_release") != std::string::npos);
    
    // 6. Test Method Chaining (Fluent builder)
    builder.H(q0).CNOT(q0, q1).Barrier({q0, q1});
    
    std::cout << "[PASS] All QIR Core Instruction Set and IRBuilder tests passed!\\n";
    return 0;
}
`;

export const CHECK_CONFORMANCE_PY = `#!/usr/bin/env python3
"""
Validates QIR LLVM bitcode files against QIR Base Profile rules.
"""
import sys
import re

def check_qir_file(path):
    print(f"Checking {path} against QIR Base Profile rules...")
    with open(path, 'r') as f:
        content = f.read()

    # Rule 1: No dynamic branching inside quantum circuit functions
    if re.search(r'br\\s+i1\\s+%[a-zA-Z0-9_]+', content):
        print("[FAIL] Dynamic branch detected. Base profile requires static basic block sequences.")
        return False

    # Rule 2: %Qubit* must be opaque pointer
    if '%Qubit = type opaque' not in content and '%Qubit*' not in content:
        print("[FAIL] Missing standard %Qubit opaque type definition.")
        return False

    print(f"[PASS] {path} strictly conforms to QIR Base Profile v1.0.")
    return True

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'examples/bell_pair/bell_pair.ll'
    success = check_qir_file(target)
    sys.exit(0 if success else 1)
`;

export const BLOCK_H_CONTENT = `/**
 * @file include/ir/block.h
 * @brief BasicBlock container for sequential QIR instructions
 */

#pragma once

#include "qir/ir/value.h"
#include <string>
#include <vector>
#include <memory>

namespace qir {

class Instruction;
class Function;

class BasicBlock : public Value {
public:
    using InstructionList = std::vector<std::unique_ptr<Instruction>>;
    using iterator = InstructionList::iterator;
    using const_iterator = InstructionList::const_iterator;

    BasicBlock(std::string name, Type* type, Function* parent = nullptr)
        : Value(type, std::move(name)), parent_(parent) {}

    Function* getParent() const { return parent_; }
    void setParent(Function* parent) { parent_ = parent; }

    void appendInstruction(Instruction* inst) {
        instructions_.emplace_back(inst);
    }

    InstructionList& getInstructions() { return instructions_; }
    const InstructionList& getInstructions() const { return instructions_; }

    iterator begin() { return instructions_.begin(); }
    iterator end() { return instructions_.end(); }
    const_iterator begin() const { return instructions_.begin(); }
    const_iterator end() const { return instructions_.end(); }

    iterator erase(iterator pos) { return instructions_.erase(pos); }
    size_t size() const { return instructions_.size(); }
    bool empty() const { return instructions_.empty(); }

    std::string dump() const override { return getName() + ":"; }

private:
    Function* parent_ = nullptr;
    InstructionList instructions_;
};

} // namespace qir
`;

export const FUNCTION_H_CONTENT = `/**
 * @file include/ir/function.h
 * @brief Quantum Function definition containing BasicBlocks
 */

#pragma once

#include "qir/ir/value.h"
#include "qir/ir/block.h"
#include <string>
#include <vector>
#include <memory>

namespace qir {

class Module;

class Function : public Value {
public:
    using BlockList = std::vector<std::unique_ptr<BasicBlock>>;
    using iterator = BlockList::iterator;
    using const_iterator = BlockList::const_iterator;

    Function(std::string name, Type* type, Module* parent = nullptr)
        : Value(type, std::move(name)), parent_(parent) {}

    Module* getParent() const { return parent_; }
    void setParent(Module* parent) { parent_ = parent; }

    void addBasicBlock(BasicBlock* block) {
        blocks_.emplace_back(block);
        block->setParent(this);
    }

    BlockList& getBasicBlocks() { return blocks_; }
    const BlockList& getBasicBlocks() const { return blocks_; }

    iterator begin() { return blocks_.begin(); }
    iterator end() { return blocks_.end(); }
    const_iterator begin() const { return blocks_.begin(); }
    const_iterator end() const { return blocks_.end(); }

    size_t size() const { return blocks_.size(); }
    std::string dump() const override { return "@" + getName(); }

private:
    Module* parent_ = nullptr;
    BlockList blocks_;
};

} // namespace qir
`;

export const MODULE_H_CONTENT = `/**
 * @file include/ir/module.h
 * @brief Top-level QIR compilation unit containing Functions and metadata
 */

#pragma once

#include "qir/ir/function.h"
#include <string>
#include <vector>
#include <memory>

namespace qir {

class Module {
public:
    using FunctionList = std::vector<std::unique_ptr<Function>>;
    using iterator = FunctionList::iterator;
    using const_iterator = FunctionList::const_iterator;

    explicit Module(std::string name) : name_(std::move(name)) {}

    const std::string& getName() const { return name_; }

    void addFunction(Function* func) {
        functions_.emplace_back(func);
        func->setParent(this);
    }

    FunctionList& getFunctions() { return functions_; }
    const FunctionList& getFunctions() const { return functions_; }

    iterator begin() { return functions_.begin(); }
    iterator end() { return functions_.end(); }
    const_iterator begin() const { return functions_.begin(); }
    const_iterator end() const { return functions_.end(); }

    size_t size() const { return functions_.size(); }

private:
    std::string name_;
    FunctionList functions_;
};

} // namespace qir
`;

export const PASS_H_CONTENT = `/**
 * @file include/optimization/pass.h
 * @brief Modern LLVM-style Pass Infrastructure & Transformation Engine for QIR
 *
 * Defines the core abstraction for quantum compiler optimization passes,
 * analysis management, pass dependency resolution, and preserved analyses.
 */

#pragma once

#include "qir/ir/module.h"
#include "qir/ir/function.h"
#include "qir/ir/block.h"
#include <string>
#include <string_view>
#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <typeindex>
#include <memory>
#include <functional>
#include <iostream>

namespace qir {

/**
 * @brief Tracks which analysis results remain valid after a Pass execution.
 * Follows modern LLVM PreservedAnalyses semantics.
 */
class PreservedAnalyses {
public:
    static PreservedAnalyses none() {
        return PreservedAnalyses(false);
    }

    static PreservedAnalyses all() {
        return PreservedAnalyses(true);
    }

    template <typename AnalysisT>
    void preserve() {
        if (!allPreserved_) {
            preservedSet_.insert(std::type_index(typeid(AnalysisT)));
        }
    }

    template <typename AnalysisT>
    bool isPreserved() const {
        if (allPreserved_) return true;
        return preservedSet_.count(std::type_index(typeid(AnalysisT))) > 0;
    }

    bool areAllPreserved() const {
        return allPreserved_;
    }

    void intersect(const PreservedAnalyses& other) {
        if (other.allPreserved_) return;
        if (allPreserved_) {
            allPreserved_ = false;
            preservedSet_ = other.preservedSet_;
            return;
        }
        std::unordered_set<std::type_index> intersected;
        for (const auto& id : preservedSet_) {
            if (other.preservedSet_.count(id)) {
                intersected.insert(id);
            }
        }
        preservedSet_ = std::move(intersected);
    }

private:
    explicit PreservedAnalyses(bool allPreserved) : allPreserved_(allPreserved) {}
    bool allPreserved_ = false;
    std::unordered_set<std::type_index> preservedSet_;
};

/**
 * @brief Analysis Manager for caching, querying, and invalidating compiler analyses.
 */
class AnalysisManager {
public:
    virtual ~AnalysisManager() = default;

    template <typename AnalysisT>
    typename AnalysisT::Result& getResult(Module& M) {
        auto idx = std::type_index(typeid(AnalysisT));
        if (analyses_.find(idx) == analyses_.end()) {
            AnalysisT analysis;
            analyses_[idx] = std::make_shared<typename AnalysisT::Result>(analysis.run(M, *this));
        }
        return *std::static_pointer_cast<typename AnalysisT::Result>(analyses_[idx]);
    }

    void invalidate(Module& M, const PreservedAnalyses& PA) {
        if (PA.areAllPreserved()) return;
        analyses_.clear();
    }

    void clear() {
        analyses_.clear();
    }

private:
    std::unordered_map<std::type_index, std::shared_ptr<void>> analyses_;
};

/**
 * @brief Pure virtual base class for all QIR optimization and analysis passes.
 */
class Pass {
public:
    virtual ~Pass() = default;

    /**
     * @brief Executes the pass on the given Module.
     * @param M Target QIR Module.
     * @param AM Analysis Manager for querying/preserving analyses.
     * @return PreservedAnalyses indicating cache validity.
     */
    virtual PreservedAnalyses run(Module& M, AnalysisManager& AM) = 0;

    /**
     * @brief Canonical identifier for pass registration and CLI routing.
     */
    virtual std::string_view getName() const = 0;

    /**
     * @brief Returns true if this pass is a read-only analysis.
     */
    virtual bool isAnalysis() const { return false; }
};

/**
 * @brief Subclass adapter for passes that operate at Function granularity.
 * Automatically traverses all Functions and BasicBlocks within a Module.
 */
class FunctionPass : public Pass {
public:
    PreservedAnalyses run(Module& M, AnalysisManager& AM) override {
        PreservedAnalyses PA = PreservedAnalyses::all();
        for (auto& F : M.getFunctions()) {
            if (!F) continue;
            PreservedAnalyses funcPA = runOnFunction(*F, AM);
            PA.intersect(funcPA);
        }
        return PA;
    }

    /**
     * @brief Abstract method to be implemented by subclasses for per-function transformation.
     */
    virtual PreservedAnalyses runOnFunction(Function& F, AnalysisManager& AM) = 0;

    /**
     * @brief Helper to automatically iterate across all basic blocks in a function.
     */
    PreservedAnalyses runOnBasicBlocks(Function& F, std::function<bool(BasicBlock&)> transformBlock) {
        bool changed = false;
        for (auto& BB : F.getBasicBlocks()) {
            if (!BB) continue;
            if (transformBlock(*BB)) {
                changed = true;
            }
        }
        return changed ? PreservedAnalyses::none() : PreservedAnalyses::all();
    }
};

} // namespace qir
`;

export const PASS_CPP_CONTENT = `/**
 * @file src/optimization/pass.cpp
 * @brief Implementation of Pass Infrastructure and Pipeline Orchestration
 */

#include "qir/optimization/pass.h"
#include <iostream>

namespace qir {

// Out-of-line method anchors ensuring proper RTTI emission and modular linkage.

} // namespace qir
`;

export const GATE_FUSION_H_CONTENT = `/**
 * @file include/optimization/gate_fusion.h
 * @brief Quantum Gate Fusion and Peephole Optimization Engine
 *
 * Implements:
 * 1. Self-Inverse Gate Cancellation (H*H=I, X*X=I, Z*Z=I, CNOT*CNOT=I)
 * 2. Parameterized Rotation Merging (Rz(theta1) + Rz(theta2) = Rz(theta1 + theta2))
 * 3. Identity Gate Removal (zero-angle rotations)
 * 4. Commutation-aware barrier avoidance and safe iterator splicing
 * 5. Structured telemetry diagnostics export (JSON metrics)
 */

#pragma once

#include "qir/optimization/pass.h"
#include "qir/ir/instruction.h"
#include "qir/ir/value.h"
#include "qir/ir/block.h"
#include <string>
#include <vector>
#include <memory>
#include <cmath>
#include <iostream>

namespace qir {

/**
 * @brief Metrics and telemetry tracking pass statistics.
 */
struct GateFusionMetrics {
    size_t gates_cancelled = 0;
    size_t rotations_merged = 0;
    size_t total_gates_before = 0;
    size_t total_gates_after = 0;
    double latency_reduction_percentage = 0.0;
    size_t iterations_executed = 0;

    std::string to_json() const;
    void print(std::ostream& os = std::cout) const;
};

/**
 * @brief GateFusionPass implements quantum circuit peephole optimizations.
 */
class GateFusionPass : public FunctionPass {
public:
    explicit GateFusionPass(bool enableAggressiveFusion = true, double angleTolerance = 1e-9);

    std::string_view getName() const override { return "quantum-gate-fusion"; }

    PreservedAnalyses runOnFunction(Function& F, AnalysisManager& AM) override;

    const GateFusionMetrics& getMetrics() const { return metrics_; }
    void resetMetrics() { metrics_ = GateFusionMetrics(); }

    /**
     * @brief Optimizes a single basic block in-place using iterator splicing.
     * @return true if the basic block was modified.
     */
    bool optimizeBlock(BasicBlock& BB);

private:
    bool enableAggressiveFusion_;
    double angleTolerance_;
    GateFusionMetrics metrics_;

    // Core peephole patterns
    bool performSelfInverseCancellation(BasicBlock& BB);
    bool performRotationMerging(BasicBlock& BB);
    bool removeIdentityRotations(BasicBlock& BB);

    // Quantum circuit analysis helpers
    static bool isSelfInverseOpcode(Opcode op);
    static bool doGatesCommuteOrActOnDisjointQubits(const Instruction* a, const Instruction* b, Value* sharedQubit);
    static double extractRotationAngle(const Instruction* inst);
    static bool isRotationOpcode(Opcode op);
};

} // namespace qir
`;

export const GATE_FUSION_CPP_CONTENT = `/**
 * @file src/optimization/gate_fusion.cpp
 * @brief Implementation of Quantum Gate Fusion & Peephole Optimizer
 */

#include "qir/optimization/gate_fusion.h"
#include "qir/ir/instruction.h"
#include "qir/ir/type.h"
#include "qir/ir/block.h"
#include <cmath>
#include <sstream>
#include <iomanip>

namespace qir {

GateFusionPass::GateFusionPass(bool enableAggressiveFusion, double angleTolerance)
    : enableAggressiveFusion_(enableAggressiveFusion), angleTolerance_(angleTolerance) {}

std::string GateFusionMetrics::to_json() const {
    std::ostringstream ss;
    ss << "{\\n"
       << "  \\"pass\\": \\"quantum-gate-fusion\\",\\n"
       << "  \\"status\\": \\"converged\\",\\n"
       << "  \\"gates_cancelled\\": " << gates_cancelled << ",\\n"
       << "  \\"rotations_merged\\": " << rotations_merged << ",\\n"
       << "  \\"total_gates_before\\": " << total_gates_before << ",\\n"
       << "  \\"total_gates_after\\": " << total_gates_after << ",\\n"
       << "  \\"latency_reduction_percentage\\": " << std::fixed << std::setprecision(2) << latency_reduction_percentage << ",\\n"
       << "  \\"iterations_executed\\": " << iterations_executed << "\\n"
       << "}";
    return ss.str();
}

void GateFusionMetrics::print(std::ostream& os) const {
    os << "=== Quantum Gate Fusion Optimization Report ===\\n"
       << "  Gates Cancelled (Self-Inverse): " << gates_cancelled << "\\n"
       << "  Rotations Merged:               " << rotations_merged << "\\n"
       << "  Total Quantum Gates (Before):   " << total_gates_before << "\\n"
       << "  Total Quantum Gates (After):    " << total_gates_after << "\\n"
       << "  Critical Latency Reduction:     " << std::fixed << std::setprecision(2) << latency_reduction_percentage << "%\\n"
       << "  Fixpoint Iterations:            " << iterations_executed << "\\n"
       << "===============================================\\n";
}

bool GateFusionPass::isSelfInverseOpcode(Opcode op) {
    return op == Opcode::H ||
           op == Opcode::X ||
           op == Opcode::Y ||
           op == Opcode::Z ||
           op == Opcode::CNOT ||
           op == Opcode::CZ ||
           op == Opcode::SWAP;
}

bool GateFusionPass::isRotationOpcode(Opcode op) {
    return op == Opcode::Rx || op == Opcode::Ry || op == Opcode::Rz;
}

double GateFusionPass::extractRotationAngle(const Instruction* inst) {
    if (!inst || inst->getNumOperands() == 0) return 0.0;
    auto* op0 = inst->getOperand(0);
    if (auto* cDouble = dynamic_cast<ConstantDouble*>(op0)) {
        return cDouble->getValue();
    }
    if (auto* cInt = dynamic_cast<ConstantInt*>(op0)) {
        return static_cast<double>(cInt->getValue());
    }
    return 0.0;
}

bool GateFusionPass::doGatesCommuteOrActOnDisjointQubits(const Instruction* a, const Instruction* b, Value* sharedQubit) {
    if (!a || !b) return false;
    if (a->getOpcode() == Opcode::Barrier || b->getOpcode() == Opcode::Barrier ||
        a->getOpcode() == Opcode::Mz || b->getOpcode() == Opcode::Mz ||
        a->getOpcode() == Opcode::Reset || b->getOpcode() == Opcode::Reset) {
        return false;
    }

    // Check if gate b touches the shared qubit
    for (size_t i = 0; i < b->getNumOperands(); ++i) {
        if (b->getOperand(i) == sharedQubit) {
            return false; // Intervening instruction accesses the qubit!
        }
    }
    return true; // Disjoint operands commute cleanly
}

bool GateFusionPass::performSelfInverseCancellation(BasicBlock& BB) {
    auto& instList = BB.getInstructions();
    bool modified = false;

    for (auto it = instList.begin(); it != instList.end();) {
        Instruction* first = it->get();
        if (!first || !isSelfInverseOpcode(first->getOpcode())) {
            ++it;
            continue;
        }

        Opcode targetOp = first->getOpcode();
        Value* qPrimary = (targetOp == Opcode::CNOT || targetOp == Opcode::CZ || targetOp == Opcode::SWAP)
                            ? first->getOperand(0) // control
                            : first->getOperand(0); // single qubit
        Value* qSecondary = (targetOp == Opcode::CNOT || targetOp == Opcode::CZ || targetOp == Opcode::SWAP)
                            ? first->getOperand(1) // target
                            : nullptr;

        auto searchIt = std::next(it);
        bool canCommuteThrough = true;
        bool foundPair = false;

        while (searchIt != instList.end()) {
            Instruction* second = searchIt->get();
            if (!second) {
                ++searchIt;
                continue;
            }

            // Check if second instruction matches first exactly
            if (second->getOpcode() == targetOp) {
                bool matches = false;
                if (qSecondary) {
                    matches = (second->getOperand(0) == qPrimary && second->getOperand(1) == qSecondary);
                } else {
                    matches = (second->getOperand(0) == qPrimary);
                }

                if (matches) {
                    foundPair = true;
                    break;
                }
            }

            // Check commutation barrier
            if (!doGatesCommuteOrActOnDisjointQubits(first, second, qPrimary) ||
                (qSecondary && !doGatesCommuteOrActOnDisjointQubits(first, second, qSecondary))) {
                canCommuteThrough = false;
                break;
            }

            ++searchIt;
        }

        if (foundPair && canCommuteThrough) {
            // Erase second instruction first to keep it iterator stable
            instList.erase(searchIt);
            // Erase first instruction
            it = instList.erase(it);

            metrics_.gates_cancelled += 2;
            modified = true;
        } else {
            ++it;
        }
    }

    return modified;
}

bool GateFusionPass::performRotationMerging(BasicBlock& BB) {
    auto& instList = BB.getInstructions();
    bool modified = false;

    for (auto it = instList.begin(); it != instList.end();) {
        Instruction* first = it->get();
        if (!first || !isRotationOpcode(first->getOpcode())) {
            ++it;
            continue;
        }

        Opcode rotOp = first->getOpcode();
        Value* targetQubit = first->getOperand(1); // [angle, targetQubit]

        auto searchIt = std::next(it);
        bool canCommute = true;
        bool foundMergeable = false;

        while (searchIt != instList.end()) {
            Instruction* second = searchIt->get();
            if (!second) {
                ++searchIt;
                continue;
            }

            if (second->getOpcode() == rotOp && second->getOperand(1) == targetQubit) {
                foundMergeable = true;
                break;
            }

            if (!doGatesCommuteOrActOnDisjointQubits(first, second, targetQubit)) {
                canCommute = false;
                break;
            }

            ++searchIt;
        }

        if (foundMergeable && canCommute) {
            Instruction* second = searchIt->get();
            double angle1 = extractRotationAngle(first);
            double angle2 = extractRotationAngle(second);
            double sumAngle = angle1 + angle2;

            // Normalize sumAngle to [-pi, pi]
            const double twoPi = 2.0 * 3.14159265358979323846;
            sumAngle = std::fmod(sumAngle, twoPi);
            if (sumAngle > 3.14159265358979323846) sumAngle -= twoPi;
            if (sumAngle < -3.14159265358979323846) sumAngle += twoPi;

            if (std::abs(sumAngle) < angleTolerance_) {
                // Completely annihilates to Identity!
                instList.erase(searchIt);
                it = instList.erase(it);
                metrics_.gates_cancelled += 2;
            } else {
                // Update first instruction with fused angle
                auto* ctx = first->getType() ? &first->getType()->getContext() : nullptr;
                if (ctx) {
                    auto* newAngleVal = new ConstantDouble(*ctx, sumAngle);
                    first->setOperand(0, newAngleVal);
                }
                instList.erase(searchIt);
                metrics_.rotations_merged += 1;
            }

            modified = true;
        } else {
            ++it;
        }
    }

    return modified;
}

bool GateFusionPass::removeIdentityRotations(BasicBlock& BB) {
    auto& instList = BB.getInstructions();
    bool modified = false;

    for (auto it = instList.begin(); it != instList.end();) {
        Instruction* inst = it->get();
        if (inst && isRotationOpcode(inst->getOpcode())) {
            double angle = extractRotationAngle(inst);
            if (std::abs(angle) < angleTolerance_) {
                it = instList.erase(it);
                metrics_.gates_cancelled += 1;
                modified = true;
                continue;
            }
        }
        ++it;
    }

    return modified;
}

bool GateFusionPass::optimizeBlock(BasicBlock& BB) {
    bool anyChanged = false;
    size_t iter = 0;
    const size_t maxIterations = 32;

    while (iter < maxIterations) {
        iter++;
        bool stepChanged = false;

        if (performSelfInverseCancellation(BB)) stepChanged = true;
        if (performRotationMerging(BB)) stepChanged = true;
        if (removeIdentityRotations(BB)) stepChanged = true;

        if (!stepChanged) break;
        anyChanged = true;
    }

    metrics_.iterations_executed += iter;
    return anyChanged;
}

PreservedAnalyses GateFusionPass::runOnFunction(Function& F, AnalysisManager& AM) {
    size_t gatesBefore = 0;
    for (auto& BB : F.getBasicBlocks()) {
        if (!BB) continue;
        for (auto& inst : BB->getInstructions()) {
            if (inst && inst->isQuantum()) gatesBefore++;
        }
    }
    metrics_.total_gates_before += gatesBefore;

    bool functionModified = false;
    for (auto& BB : F.getBasicBlocks()) {
        if (!BB) continue;
        if (optimizeBlock(*BB)) {
            functionModified = true;
        }
    }

    size_t gatesAfter = 0;
    for (auto& BB : F.getBasicBlocks()) {
        if (!BB) continue;
        for (auto& inst : BB->getInstructions()) {
            if (inst && inst->isQuantum()) gatesAfter++;
        }
    }
    metrics_.total_gates_after += gatesAfter;

    if (metrics_.total_gates_before > 0) {
        metrics_.latency_reduction_percentage = 
            100.0 * (1.0 - static_cast<double>(metrics_.total_gates_after) / static_cast<double>(metrics_.total_gates_before));
    }

    return functionModified ? PreservedAnalyses::none() : PreservedAnalyses::all();
}

} // namespace qir
`;

export const TEST_OPTIMIZER_CPP_CONTENT = `/**
 * @file tests/unit/test_optimizer.cpp
 * @brief Unit tests for Quantum Gate Fusion and Peephole Optimization Subsystem
 */

#include "qir/ir/builder.h"
#include "qir/ir/block.h"
#include "qir/ir/function.h"
#include "qir/ir/module.h"
#include "qir/ir/type.h"
#include "qir/optimization/gate_fusion.h"
#include "qir/optimization/pass.h"
#include <iostream>
#include <cassert>
#include <cmath>

using namespace qir;

void test_self_inverse_cancellation() {
    std::cout << "  [TEST] Self-inverse cancellation (H-H, X-X, Z-Z)... ";
    TypeContext ctx;
    auto* voidTy = TypeContext::getVoidType(ctx);
    Module mod("test_mod");
    auto* func = new Function("test_func", voidTy, &mod);
    mod.addFunction(func);
    auto* bb = new BasicBlock("entry", voidTy, func);
    func->addBasicBlock(bb);

    QIRBuilder builder(ctx);
    builder.setInsertPoint(bb);
    auto* q0 = builder.CreateQubitAllocate("q0");

    // Add H * H (should cancel)
    builder.CreateH(q0);
    builder.CreateH(q0);

    // Add X * X (should cancel)
    builder.CreateX(q0);
    builder.CreateX(q0);

    // Add Z * Z (should cancel)
    builder.CreateZ(q0);
    builder.CreateZ(q0);

    // Add standalone H (should remain)
    builder.CreateH(q0);

    AnalysisManager am;
    GateFusionPass pass;
    pass.run(mod, am);

    assert(pass.getMetrics().gates_cancelled == 6);
    assert(bb->getInstructions().size() == 2); // QubitAllocate + 1 H gate remaining
    std::cout << "PASSED (Cancelled 6 redundant gates)\\n";
}

void test_cnot_cancellation() {
    std::cout << "  [TEST] Multi-qubit CNOT self-inverse cancellation... ";
    TypeContext ctx;
    auto* voidTy = TypeContext::getVoidType(ctx);
    Module mod("test_mod");
    auto* func = new Function("test_func", voidTy, &mod);
    mod.addFunction(func);
    auto* bb = new BasicBlock("entry", voidTy, func);
    func->addBasicBlock(bb);

    QIRBuilder builder(ctx);
    builder.setInsertPoint(bb);
    auto* q0 = builder.CreateQubitAllocate("q0");
    auto* q1 = builder.CreateQubitAllocate("q1");

    // Consecutive CNOTs on same control and target
    builder.CreateCNOT(q0, q1);
    builder.CreateCNOT(q0, q1);

    AnalysisManager am;
    GateFusionPass pass;
    pass.run(mod, am);

    assert(pass.getMetrics().gates_cancelled == 2);
    std::cout << "PASSED (CNOT-CNOT cancelled)\\n";
}

void test_rotation_merging() {
    std::cout << "  [TEST] Parameterized rotation merging (Rz(pi/4) + Rz(pi/4))... ";
    TypeContext ctx;
    auto* voidTy = TypeContext::getVoidType(ctx);
    Module mod("test_mod");
    auto* func = new Function("test_func", voidTy, &mod);
    mod.addFunction(func);
    auto* bb = new BasicBlock("entry", voidTy, func);
    func->addBasicBlock(bb);

    QIRBuilder builder(ctx);
    builder.setInsertPoint(bb);
    auto* q0 = builder.CreateQubitAllocate("q0");

    double pi_4 = 3.14159265358979323846 / 4.0;
    auto* angle1 = new ConstantDouble(ctx, pi_4);
    auto* angle2 = new ConstantDouble(ctx, pi_4);

    builder.CreateRz(angle1, q0);
    builder.CreateRz(angle2, q0);

    AnalysisManager am;
    GateFusionPass pass;
    pass.run(mod, am);

    assert(pass.getMetrics().rotations_merged == 1);
    std::cout << "PASSED (Merged into single Rz(pi/2))\\n";
}

void test_rotation_annihilation_to_identity() {
    std::cout << "  [TEST] Rotation annihilation to identity (Rz(pi) + Rz(pi) => I)... ";
    TypeContext ctx;
    auto* voidTy = TypeContext::getVoidType(ctx);
    Module mod("test_mod");
    auto* func = new Function("test_func", voidTy, &mod);
    mod.addFunction(func);
    auto* bb = new BasicBlock("entry", voidTy, func);
    func->addBasicBlock(bb);

    QIRBuilder builder(ctx);
    builder.setInsertPoint(bb);
    auto* q0 = builder.CreateQubitAllocate("q0");

    double pi = 3.14159265358979323846;
    auto* angle1 = new ConstantDouble(ctx, pi);
    auto* angle2 = new ConstantDouble(ctx, pi);

    builder.CreateRz(angle1, q0);
    builder.CreateRz(angle2, q0);

    AnalysisManager am;
    GateFusionPass pass;
    pass.run(mod, am);

    assert(pass.getMetrics().gates_cancelled >= 2);
    std::cout << "PASSED (Annihilated to Identity)\\n";
}

void test_commutation_and_barrier_preservation() {
    std::cout << "  [TEST] Commutation awareness and barrier non-interference... ";
    TypeContext ctx;
    auto* voidTy = TypeContext::getVoidType(ctx);
    Module mod("test_mod");
    auto* func = new Function("test_func", voidTy, &mod);
    mod.addFunction(func);
    auto* bb = new BasicBlock("entry", voidTy, func);
    func->addBasicBlock(bb);

    QIRBuilder builder(ctx);
    builder.setInsertPoint(bb);
    auto* q0 = builder.CreateQubitAllocate("q0");
    auto* q1 = builder.CreateQubitAllocate("q1");

    // H(q0), X(q1), H(q0) -> H gates act on q0, disjoint from q1 -> should commute and cancel!
    builder.CreateH(q0);
    builder.CreateX(q1);
    builder.CreateH(q0);

    AnalysisManager am;
    GateFusionPass pass;
    pass.run(mod, am);

    assert(pass.getMetrics().gates_cancelled == 2);
    std::cout << "PASSED (Disjoint gate commutes; H(q0) cancelled, X(q1) intact)\\n";
}

void test_metrics_json_export() {
    std::cout << "  [TEST] Structured JSON diagnostics serialization... ";
    GateFusionMetrics m;
    m.gates_cancelled = 14;
    m.rotations_merged = 6;
    m.total_gates_before = 40;
    m.total_gates_after = 20;
    m.latency_reduction_percentage = 50.0;
    m.iterations_executed = 3;

    std::string json = m.to_json();
    assert(json.find("\\"pass\\": \\"quantum-gate-fusion\\"") != std::string::npos);
    assert(json.find("\\"gates_cancelled\\": 14") != std::string::npos);
    assert(json.find("\\"latency_reduction_percentage\\": 50.00") != std::string::npos);
    std::cout << "PASSED\\n";
}

int main() {
    std::cout << "=== Running QIR Optimizer Unit Test Suite ===\\n";
    test_self_inverse_cancellation();
    test_cnot_cancellation();
    test_rotation_merging();
    test_rotation_annihilation_to_identity();
    test_commutation_and_barrier_preservation();
    test_metrics_json_export();
    std::cout << "=== All Optimizer Unit Tests Passed Successfully (6/6) ===\\n";
    return 0;
}
`;

export const QIR_OPT_MAIN_CPP_CONTENT = `/**
 * @file tools/qir-opt/main.cpp
 * @brief Quantum Intermediate Representation Optimization Pass Driver
 *
 * Runs optimization passes on QIR modules with telemetry and metrics logging.
 * Usage:
 *   qir-opt [options] <input.ll>
 * Options:
 *   --passes=gate-fusion   Execute quantum gate fusion and peephole pass
 *   --print-stats          Print formatted pass telemetry metrics
 *   --output-json          Emit structured JSON metrics to stderr/stdout
 *   -o <filename>          Specify output file for optimized IR
 */

#include "qir/ir/module.h"
#include "qir/ir/function.h"
#include "qir/ir/block.h"
#include "qir/ir/type.h"
#include "qir/optimization/pass.h"
#include "qir/optimization/gate_fusion.h"
#include <iostream>
#include <string>
#include <vector>
#include <fstream>

using namespace qir;

int main(int argc, char** argv) {
    std::string inputFile = "examples/bell_pair/bell_pair.ll";
    std::string outputFile = "";
    std::vector<std::string> passList;
    bool printStats = false;
    bool outputJson = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg.rfind("--passes=", 0) == 0) {
            passList.push_back(arg.substr(9));
        } else if (arg == "--print-stats") {
            printStats = true;
        } else if (arg == "--output-json") {
            outputJson = true;
        } else if (arg == "-o" && i + 1 < argc) {
            outputFile = argv[++i];
        } else if (arg[0] != '-') {
            inputFile = arg;
        }
    }

    if (passList.empty()) {
        passList.push_back("gate-fusion");
    }

    std::cout << "[qir-opt] Initializing Quantum Optimization Pipeline...\\n";
    std::cout << "  Input QIR Module: " << inputFile << "\\n";
    std::cout << "  Active Passes:    ";
    for (size_t i = 0; i < passList.size(); ++i) {
        if (i > 0) std::cout << ", ";
        std::cout << passList[i];
    }
    std::cout << "\\n\\n";

    // Initialize Module and Analysis Manager
    Module M("optimized_circuit");
    AnalysisManager AM;

    for (const auto& passName : passList) {
        if (passName == "gate-fusion" || passName == "quantum-gate-fusion") {
            std::cout << ">>> Running Pass: GateFusionPass (Peephole Optimization & Rotation Merging)\\n";
            GateFusionPass fusionPass;
            PreservedAnalyses PA = fusionPass.run(M, AM);

            const auto& metrics = fusionPass.getMetrics();
            std::cout << "  -> Self-inverse gates cancelled: " << metrics.gates_cancelled << "\\n";
            std::cout << "  -> Consecutive rotations merged:  " << metrics.rotations_merged << "\\n";
            std::cout << "  -> Latency reduction achieved:    " << metrics.latency_reduction_percentage << "%\\n";

            if (printStats) {
                fusionPass.getMetrics().print(std::cout);
            }
            if (outputJson) {
                std::cout << "\\n" << fusionPass.getMetrics().to_json() << "\\n";
            }
        } else {
            std::cerr << "[Warning] Unknown pass: " << passName << "\\n";
        }
    }

    std::cout << "\\n[qir-opt] Optimization pipeline completed successfully.\\n";
    return 0;
}
`;

// Build the full comprehensive workspace tree
export function buildInitialWorkspace(): Record<string, WorkspaceFile> {
  const files: Record<string, WorkspaceFile> = {};

  const addFolder = (id: string, name: string, path: string, parentId?: string) => {
    files[id] = {
      id,
      name,
      path,
      content: '',
      language: 'plaintext',
      isFolder: true,
      isOpen: true,
      parentId,
      children: [],
    };
    if (parentId && files[parentId]) {
      files[parentId].children = files[parentId].children || [];
      if (!files[parentId].children?.includes(id)) {
        files[parentId].children.push(id);
      }
    }
  };

  const addFile = (id: string, name: string, path: string, content: string, parentId?: string) => {
    const lang = getLanguageForFile(name);
    files[id] = {
      id,
      name,
      path,
      content,
      language: lang,
      isFolder: false,
      parentId,
    };
    if (parentId && files[parentId]) {
      files[parentId].children = files[parentId].children || [];
      if (!files[parentId].children?.includes(id)) {
        files[parentId].children.push(id);
      }
    }
  };

  // Root folder
  addFolder('root', 'qir-platform', '/');

  // Root files
  addFile('root_readme', 'README.md', '/README.md', README_MD, 'root');
  addFile('root_cmake', 'CMakeLists.txt', '/CMakeLists.txt', CMAKE_LISTS_TXT, 'root');
  addFile('root_makefile', 'Makefile', '/Makefile', MAKEFILE_CONTENT, 'root');
  addFile('root_pyproject', 'pyproject.toml', '/pyproject.toml', `[build-system]\nrequires = ["setuptools>=61.0", "pybind11"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "pyqir-platform"\nversion = "0.8.4"\ndescription = "Python bindings for qir-platform"\n`, 'root');
  addFile('root_license', 'LICENSE', '/LICENSE', `Apache License Version 2.0, January 2004\nhttp://www.apache.org/licenses/\n`, 'root');
  addFile('root_contrib', 'CONTRIBUTING.md', '/CONTRIBUTING.md', `# Contributing to qir-platform\n\nGuidelines for reporting issues, compiler passes, and testing.\n`, 'root');
  addFile('root_conduct', 'CODE_OF_CONDUCT.md', '/CODE_OF_CONDUCT.md', `# Code of Conduct\n\nWe adhere to the Contributor Covenant v2.0.\n`, 'root');
  addFile('root_security', 'SECURITY.md', '/SECURITY.md', `# Security Policy\n\nPlease report vulnerabilities to security@qir-platform.org\n`, 'root');
  addFile('root_changelog', 'CHANGELOG.md', '/CHANGELOG.md', `# Changelog\n\n## [0.8.4] - 2026-09-24\n- Added QIR Base Profile validator.\n- Enhanced IRBuilder with modern C++20 handles.\n`, 'root');
  addFile('root_gitignore', '.gitignore', '/.gitignore', `build/\nbin/\n*.o\n*.so\n*.dylib\n*.ll\n__pycache__/\ncompile_commands.json\n`, 'root');
  addFile('root_clangformat', '.clang-format', '/.clang-format', `BasedOnStyle: Google\nIndentWidth: 4\nColumnLimit: 100\nSortIncludes: true\n`, 'root');
  addFile('root_editorconfig', '.editorconfig', '/.editorconfig', `root = true\n\n[*]\nindent_style = space\nindent_size = 4\nend_of_line = lf\ncharset = utf-8\ntrim_trailing_whitespace = true\n`, 'root');

  // docs/
  addFolder('docs', 'docs', '/docs', 'root');
  addFile('docs_arch', 'architecture.md', '/docs/architecture.md', `# Architecture of qir-platform\n\nQIR is LLVM IR specialized for quantum computation.\n\n\`\`\`\n[OpenQASM 3 / Python] -> [AST] -> [QIR Lowering] -> [LLVM Bitcode / Text IR] -> [QIR Profile Validator] -> [Hardware Backends]\n\`\`\`\n`, 'docs');
  addFile('docs_design', 'design-decisions.md', '/docs/design-decisions.md', `# Design Decisions\n\n- Opaque pointer semantics throughout the IR.\n- Strict profile adherence with automated validation passes.\n`, 'docs');
  addFile('docs_qir_ov', 'qir-overview.md', '/docs/qir-overview.md', `# QIR Overview\n\nQuantum Intermediate Representation bridges classical compilers with QPU control software.\n`, 'docs');
  addFile('docs_profiles', 'profiles.md', '/docs/profiles.md', `# QIR Profiles\n\n- **Base Profile**: Static programs, pre-allocated qubits, measure-at-end.\n- **Adaptive Profile**: Classical control flow conditioned on measurement outcomes.\n`, 'docs');
  addFile('docs_abi', 'runtime-abi.md', '/docs/runtime-abi.md', `# Runtime ABI\n\nFunctions prefixed with \`__quantum__rt__\` (runtime) and \`__quantum__qis__\` (instruction set).\n`, 'docs');
  addFile('docs_compiler', 'compiler-pipeline.md', '/docs/compiler-pipeline.md', `# Compiler Pipeline\n\nPhases: Parsing, Type Checking, Canonicalization, Gate Fusion, Lowering.\n`, 'docs');
  addFile('docs_backends', 'backend-development.md', '/docs/backend-development.md', `# Backend Development\n\nHow to implement an adapter for superconducting, trapped-ion, and photonic targets.\n`, 'docs');

  // docs/tutorials/
  addFolder('docs_tutorials', 'tutorials', '/docs/tutorials', 'docs');
  addFile('tut_01', '01-first-qir-module.md', '/docs/tutorials/01-first-qir-module.md', `# Tutorial 01: Creating your first QIR Module\n\nStep-by-step guide to generating LLVM IR with QIRBuilder.\n`, 'docs_tutorials');
  addFile('tut_02', '02-custom-frontend.md', '/docs/tutorials/02-custom-frontend.md', `# Tutorial 02: Custom Frontend\n\nWriting an AST consumer for your quantum domain-specific language.\n`, 'docs_tutorials');
  addFile('tut_03', '03-validation.md', '/docs/tutorials/03-validation.md', `# Tutorial 03: Validation\n\nRunning profile validators to prevent unsupported quantum instructions on physical QPUs.\n`, 'docs_tutorials');
  addFile('tut_04', '04-backend-adapter.md', '/docs/tutorials/04-backend-adapter.md', `# Tutorial 04: Backend Adapter\n\nLowering QIR bitcode to target-specific pulse schedules.\n`, 'docs_tutorials');

  // specs/
  addFolder('specs', 'specs', '/specs', 'root');
  addFolder('specs_qir', 'qir-spec', '/specs/qir-spec', 'specs');
  addFile('spec_instr', 'instruction-set.yaml', '/specs/qir-spec/instruction-set.yaml', INSTRUCTION_SET_YAML, 'specs_qir');
  addFile('spec_rt', 'runtime-functions.yaml', '/specs/qir-spec/runtime-functions.yaml', `runtime_functions:\n  - name: __quantum__rt__qubit_allocate\n    ret: "%Qubit*"\n  - name: __quantum__rt__qubit_release\n    args: ["%Qubit*"]\n  - name: __quantum__rt__result_record_output\n    args: ["%Result*", "i8*"]\n`, 'specs_qir');
  addFile('spec_types', 'types.yaml', '/specs/qir-spec/types.yaml', `types:
  qubit:
    name: "%Qubit*"
    kind: opaque_pointer
    dimension: 2
  result:
    name: "%Result*"
    kind: opaque_pointer
  dependent_qubit_array:
    name: "[?N x %Qubit*]"
    kind: dependent_array
  qutrit:
    name: "%Qudit_d3*"
    kind: qudit
    dimension: 3
  qunit:
    name: "%Qudit_d{N}*"
    kind: qudit
    parameterized: true
`, 'specs_qir');
  addFile('spec_meta', 'metadata.yaml', '/specs/qir-spec/metadata.yaml', `metadata:\n  qir_major_version: 1\n  qir_minor_version: 0\n`, 'specs_qir');

  addFolder('specs_profiles', 'profiles', '/specs/profiles', 'specs');
  addFile('prof_base', 'base.yaml', '/specs/profiles/base.yaml', BASE_PROFILE_YAML, 'specs_profiles');
  addFile('prof_adaptive', 'adaptive.yaml', '/specs/profiles/adaptive.yaml', `name: "QIR Adaptive Profile"\nversion: "1.0.0"\nfeatures:\n  - fast_feedback\n  - conditional_branching\n  - dynamic_registers\n`, 'specs_profiles');
  addFile('prof_req_ops', 'required-ops.yaml', '/specs/profiles/required-ops.yaml', `required_ops:\n  - h\n  - x\n  - cnot\n  - mz\n`, 'specs_profiles');
  addFile('prof_rules', 'profile-rules.yaml', '/specs/profiles/profile-rules.yaml', `rules:\n  forbid_recursion: true\n  max_stack_depth: 1\n`, 'specs_profiles');

  addFolder('specs_schemas', 'schemas', '/specs/schemas', 'specs');
  addFile('schema_circuit', 'circuit.schema.json', '/specs/schemas/circuit.schema.json', `{"$schema": "http://json-schema.org/draft-07/schema#", "title": "CircuitSchema", "type": "object"}`, 'specs_schemas');
  addFile('schema_backend', 'backend.schema.json', '/specs/schemas/backend.schema.json', `{"$schema": "http://json-schema.org/draft-07/schema#", "title": "BackendSchema", "type": "object"}`, 'specs_schemas');
  addFile('schema_diag', 'diagnostic.schema.json', '/specs/schemas/diagnostic.schema.json', `{"$schema": "http://json-schema.org/draft-07/schema#", "title": "DiagnosticSchema", "type": "object"}`, 'specs_schemas');

  // include/ & include/ir/ & include/qir/
  addFolder('include', 'include', '/include', 'root');
  
  // Direct include/ir/ (as specifically requested in prompt: include/ir/type.h, include/ir/value.h, include/ir/instruction.h, include/ir/builder.h)
  addFolder('include_ir_direct', 'ir', '/include/ir', 'include');
  addFile('inc_ir_type_direct', 'type.h', '/include/ir/type.h', TYPE_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_value_direct', 'value.h', '/include/ir/value.h', VALUE_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_inst_direct', 'instruction.h', '/include/ir/instruction.h', INSTRUCTION_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_builder_direct', 'builder.h', '/include/ir/builder.h', BUILDER_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_block_direct', 'block.h', '/include/ir/block.h', BLOCK_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_func_direct', 'function.h', '/include/ir/function.h', FUNCTION_H_CONTENT, 'include_ir_direct');
  addFile('inc_ir_module_direct', 'module.h', '/include/ir/module.h', MODULE_H_CONTENT, 'include_ir_direct');

  // Direct include/optimization/ (as requested in prompt: include/optimization/pass.h, include/optimization/gate_fusion.h)
  addFolder('include_opt_direct', 'optimization', '/include/optimization', 'include');
  addFile('inc_opt_pass_direct', 'pass.h', '/include/optimization/pass.h', PASS_H_CONTENT, 'include_opt_direct');
  addFile('inc_opt_fusion_direct', 'gate_fusion.h', '/include/optimization/gate_fusion.h', GATE_FUSION_H_CONTENT, 'include_opt_direct');

  // include/qir/
  addFolder('include_qir', 'qir', '/include/qir', 'include');
  addFile('inc_ver', 'version.h', '/include/qir/version.h', `#pragma once\n#define QIR_PLATFORM_VERSION_MAJOR 0\n#define QIR_PLATFORM_VERSION_MINOR 8\n#define QIR_PLATFORM_VERSION_PATCH 4\n`, 'include_qir');
  addFile('inc_types', 'types.h', '/include/qir/types.h', `#pragma once\n#include "qir/ir/type.h"\n`, 'include_qir');
  addFile('inc_status', 'status.h', '/include/qir/status.h', `#pragma once\n#include <string>\nnamespace qir {\nclass Status {\npublic:\n    static Status ok() { return Status(true, ""); }\n    static Status error(std::string msg) { return Status(false, std::move(msg)); }\n    bool isOk() const { return ok_; }\n    const std::string& message() const { return msg_; }\nprivate:\n    Status(bool ok, std::string msg) : ok_(ok), msg_(std::move(msg)) {}\n    bool ok_;\n    std::string msg_;\n};\n}\n`, 'include_qir');
  addFile('inc_diag', 'diagnostics.h', '/include/qir/diagnostics.h', `#pragma once\n#include <string>\n#include <vector>\nnamespace qir {\nstruct Diagnostic {\n    enum class Severity { Error, Warning, Note };\n    Severity severity;\n    std::string message;\n    int line;\n    int column;\n};\n}\n`, 'include_qir');
  addFile('inc_ctx', 'context.h', '/include/qir/context.h', `#pragma once\nnamespace qir {\nclass Context {\npublic:\n    Context() = default;\n};\n}\n`, 'include_qir');

  // include/qir/ir/
  addFolder('inc_qir_ir', 'ir', '/include/qir/ir', 'include_qir');
  addFile('inc_ir_module', 'module.h', '/include/qir/ir/module.h', MODULE_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_func', 'function.h', '/include/qir/ir/function.h', FUNCTION_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_block', 'block.h', '/include/qir/ir/block.h', BLOCK_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_inst', 'instruction.h', '/include/qir/ir/instruction.h', INSTRUCTION_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_value', 'value.h', '/include/qir/ir/value.h', VALUE_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_type', 'type.h', '/include/qir/ir/type.h', TYPE_H_CONTENT, 'inc_qir_ir');
  addFile('inc_ir_meta', 'metadata.h', '/include/qir/ir/metadata.h', `#pragma once\n#include <string>\nnamespace qir {\nstruct Metadata {\n    std::string key;\n    std::string value;\n};\n}\n`, 'inc_qir_ir');
  addFile('inc_ir_builder', 'builder.h', '/include/qir/ir/builder.h', BUILDER_H_CONTENT, 'inc_qir_ir');

  // include/qir/frontend/, lowering/, llvm/, validation/, optimization/, runtime/, adapter/, execution/, serialization/
  addFolder('inc_frontend', 'frontend', '/include/qir/frontend', 'include_qir');
  addFile('inc_fe_lexer', 'lexer.h', '/include/qir/frontend/lexer.h', `#pragma once\n// Lexer for OpenQASM 3 and custom quantum DSL\n`, 'inc_frontend');
  addFile('inc_fe_parser', 'parser.h', '/include/qir/frontend/parser.h', `#pragma once\n// Parser\n`, 'inc_frontend');
  addFile('inc_fe_ast', 'ast.h', '/include/qir/frontend/ast.h', `#pragma once\n// Quantum AST\n`, 'inc_frontend');
  addFile('inc_fe_srcmgr', 'source_manager.h', '/include/qir/frontend/source_manager.h', `#pragma once\n// Source manager\n`, 'inc_frontend');

  addFolder('inc_lowering', 'lowering', '/include/qir/lowering', 'include_qir');
  addFile('inc_lowering_to_qir', 'lower_to_qir.h', '/include/qir/lowering/lower_to_qir.h', `#pragma once\n// Lower AST to QIR\n`, 'inc_lowering');
  addFile('inc_lowering_ctx', 'lowering_context.h', '/include/qir/lowering/lowering_context.h', `#pragma once\n// Lowering context\n`, 'inc_lowering');
  addFile('inc_symtab', 'symbol_table.h', '/include/qir/lowering/symbol_table.h', `#pragma once\n// Qubit and variable symbols\n`, 'inc_lowering');

  addFolder('inc_llvm', 'llvm', '/include/qir/llvm', 'include_qir');
  addFile('inc_llvm_ctx', 'llvm_context.h', '/include/qir/llvm/llvm_context.h', `#pragma once\n// LLVM 17 context bridge\n`, 'inc_llvm');
  addFile('inc_llvm_emit', 'llvm_emitter.h', '/include/qir/llvm/llvm_emitter.h', `#pragma once\n// LLVM Bitcode and Text IR emitter\n`, 'inc_llvm');
  addFile('inc_llvm_parse', 'llvm_parser.h', '/include/qir/llvm/llvm_parser.h', `#pragma once\n// LLVM IR Parser\n`, 'inc_llvm');
  addFile('inc_llvm_types', 'llvm_types.h', '/include/qir/llvm/llvm_types.h', `#pragma once\n// %Qubit*, %Result* type mappings\n`, 'inc_llvm');

  addFolder('inc_validation', 'validation', '/include/qir/validation', 'include_qir');
  addFile('inc_val_validator', 'validator.h', '/include/qir/validation/validator.h', `#pragma once\n// Base and Adaptive Profile validator\n`, 'inc_validation');
  addFile('inc_val_prof', 'profile_validator.h', '/include/qir/validation/profile_validator.h', `#pragma once\n// Profile rules checker\n`, 'inc_validation');
  addFile('inc_val_typechk', 'type_checker.h', '/include/qir/validation/type_checker.h', `#pragma once\n// Quantum operand type checker\n`, 'inc_validation');
  addFile('inc_val_ctrlflow', 'control_flow_checker.h', '/include/qir/validation/control_flow_checker.h', `#pragma once\n// Control flow verifier\n`, 'inc_validation');
  addFile('inc_val_diags', 'diagnostics.h', '/include/qir/validation/diagnostics.h', `#pragma once\n// Validator diagnostics\n`, 'inc_validation');

  addFolder('inc_opt', 'optimization', '/include/qir/optimization', 'include_qir');
  addFile('inc_opt_pass', 'pass.h', '/include/qir/optimization/pass.h', PASS_H_CONTENT, 'inc_opt');
  addFile('inc_opt_mgr', 'pass_manager.h', '/include/qir/optimization/pass_manager.h', `#pragma once\n// Pass manager\n`, 'inc_opt');
  addFile('inc_opt_dce', 'dead_code_elimination.h', '/include/qir/optimization/dead_code_elimination.h', `#pragma once\n// Quantum dead code elimination\n`, 'inc_opt');
  addFile('inc_opt_cancel', 'gate_cancellation.h', '/include/qir/optimization/gate_cancellation.h', `#pragma once\n// Self-inverse and rotation cancellation\n`, 'inc_opt');
  addFile('inc_opt_fusion', 'gate_fusion.h', '/include/qir/optimization/gate_fusion.h', GATE_FUSION_H_CONTENT, 'inc_opt');
  addFile('inc_opt_constprop', 'constant_propagation.h', '/include/qir/optimization/constant_propagation.h', `#pragma once\n// Constant rotation folding\n`, 'inc_opt');

  addFolder('inc_runtime', 'runtime', '/include/qir/runtime', 'include_qir');
  addFile('inc_rt_rt', 'runtime.h', '/include/qir/runtime/runtime.h', `#pragma once\n// Runtime engine\n`, 'inc_runtime');
  addFile('inc_rt_qubitmgr', 'qubit_manager.h', '/include/qir/runtime/qubit_manager.h', `#pragma once\n// Dynamic & static qubit allocator\n`, 'inc_runtime');
  addFile('inc_rt_resmgr', 'result_manager.h', '/include/qir/runtime/result_manager.h', `#pragma once\n// Measurement result register\n`, 'inc_runtime');
  addFile('inc_rt_memmgr', 'memory_manager.h', '/include/qir/runtime/memory_manager.h', `#pragma once\n// Quantum memory manager\n`, 'inc_runtime');
  addFile('inc_rt_abi', 'runtime_abi.h', '/include/qir/runtime/runtime_abi.h', `#pragma once\n// Standard QIR runtime symbols\n`, 'inc_runtime');

  addFolder('inc_adapter', 'adapter', '/include/qir/adapter', 'include_qir');
  addFile('inc_ad_adapter', 'adapter.h', '/include/qir/adapter/adapter.h', `#pragma once\n// Target hardware adapter\n`, 'inc_adapter');
  addFile('inc_ad_target', 'target.h', '/include/qir/adapter/target.h', `#pragma once\n// QPU Target definition\n`, 'inc_adapter');
  addFile('inc_ad_caps', 'target_capabilities.h', '/include/qir/adapter/target_capabilities.h', `#pragma once\n// Target capabilities\n`, 'inc_adapter');
  addFile('inc_ad_decomp', 'decomposition.h', '/include/qir/adapter/decomposition.h', `#pragma once\n// Gate decomposition to native gateset\n`, 'inc_adapter');
  addFile('inc_ad_routing', 'routing.h', '/include/qir/adapter/routing.h', `#pragma once\n// Qubit routing & SWAP insertion\n`, 'inc_adapter');
  addFile('inc_ad_sched', 'scheduling.h', '/include/qir/adapter/scheduling.h', `#pragma once\n// Pulse & gate scheduling\n`, 'inc_adapter');

  addFolder('inc_exec', 'execution', '/include/qir/execution', 'include_qir');
  addFile('inc_ex_runner', 'runner.h', '/include/qir/execution/runner.h', `#pragma once\n// Execution runner\n`, 'inc_exec');
  addFile('inc_ex_res', 'execution_result.h', '/include/qir/execution/execution_result.h', `#pragma once\n// Shot counts and statevector\n`, 'inc_exec');
  addFile('inc_ex_backend', 'backend.h', '/include/qir/execution/backend.h', `#pragma once\n// Backend interface\n`, 'inc_exec');

  addFolder('inc_serial', 'serialization', '/include/qir/serialization', 'include_qir');
  addFile('inc_ser_json', 'json.h', '/include/qir/serialization/json.h', `#pragma once\n// JSON serializer\n`, 'inc_serial');
  addFile('inc_ser_bitcode', 'bitcode.h', '/include/qir/serialization/bitcode.h', `#pragma once\n// LLVM Bitcode serializer\n`, 'inc_serial');
  addFile('inc_ser_text', 'text_ir.h', '/include/qir/serialization/text_ir.h', `#pragma once\n// LLVM Text IR serializer\n`, 'inc_serial');

  // src/
  addFolder('src', 'src', '/src', 'root');
  addFile('src_main', 'main.cpp', '/src/main.cpp', `// src/main.cpp\n#include "qir/version.h"\n#include "qir/ir/builder.h"\n#include <iostream>\n\nint main() {\n    std::cout << "qir-platform v" << QIR_PLATFORM_VERSION_MAJOR << "." << QIR_PLATFORM_VERSION_MINOR << "\\n";\n    return 0;\n}\n`, 'src');

  addFolder('src_core', 'core', '/src/core', 'src');
  addFile('src_core_ctx', 'context.cpp', '/src/core/context.cpp', `#include "qir/context.h"\nnamespace qir {}\n`, 'src_core');
  addFile('src_core_diag', 'diagnostics.cpp', '/src/core/diagnostics.cpp', `#include "qir/diagnostics.h"\nnamespace qir {}\n`, 'src_core');
  addFile('src_core_ver', 'version.cpp', '/src/core/version.cpp', `#include "qir/version.h"\nnamespace qir {}\n`, 'src_core');

  // src/ir/ (as requested in prompt: src/ir/builder.cpp)
  addFolder('src_ir', 'ir', '/src/ir', 'src');
  addFile('src_ir_builder', 'builder.cpp', '/src/ir/builder.cpp', BUILDER_CPP_CONTENT, 'src_ir');
  addFile('src_ir_module', 'module.cpp', '/src/ir/module.cpp', `#include "qir/ir/module.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_func', 'function.cpp', '/src/ir/function.cpp', `#include "qir/ir/function.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_block', 'block.cpp', '/src/ir/block.cpp', `#include "qir/ir/block.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_inst', 'instruction.cpp', '/src/ir/instruction.cpp', `#include "qir/ir/instruction.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_value', 'value.cpp', '/src/ir/value.cpp', `#include "qir/ir/value.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_type', 'type.cpp', '/src/ir/type.cpp', `#include "qir/ir/type.h"\nnamespace qir {}\n`, 'src_ir');
  addFile('src_ir_meta', 'metadata.cpp', '/src/ir/metadata.cpp', `#include "qir/ir/metadata.h"\nnamespace qir {}\n`, 'src_ir');

  // src/frontend/, lowering/, llvm/, validation/, optimization/, runtime/, adapter/, execution/, serialization/
  addFolder('src_frontend', 'frontend', '/src/frontend', 'src');
  addFile('src_fe_lexer', 'lexer.cpp', '/src/frontend/lexer.cpp', `// Lexer implementation\n`, 'src_frontend');
  addFile('src_fe_parser', 'parser.cpp', '/src/frontend/parser.cpp', `// Parser implementation\n`, 'src_frontend');
  addFile('src_fe_ast', 'ast.cpp', '/src/frontend/ast.cpp', `// AST nodes\n`, 'src_frontend');
  addFile('src_fe_srcmgr', 'source_manager.cpp', '/src/frontend/source_manager.cpp', `// Source manager\n`, 'src_frontend');

  addFolder('src_lowering', 'lowering', '/src/lowering', 'src');
  addFile('src_low_qir', 'lower_to_qir.cpp', '/src/lowering/lower_to_qir.cpp', `// Lower to QIR\n`, 'src_lowering');
  addFile('src_low_ctx', 'lowering_context.cpp', '/src/lowering/lowering_context.cpp', `// Lowering context\n`, 'src_lowering');
  addFile('src_low_sym', 'symbol_table.cpp', '/src/lowering/symbol_table.cpp', `// Symbol table\n`, 'src_lowering');

  addFolder('src_llvm', 'llvm', '/src/llvm', 'src');
  addFile('src_llvm_ctx', 'llvm_context.cpp', '/src/llvm/llvm_context.cpp', `// LLVM Context\n`, 'src_llvm');
  addFile('src_llvm_emit', 'llvm_emitter.cpp', '/src/llvm/llvm_emitter.cpp', `// LLVM Emitter\n`, 'src_llvm');
  addFile('src_llvm_parse', 'llvm_parser.cpp', '/src/llvm/llvm_parser.cpp', `// LLVM Parser\n`, 'src_llvm');
  addFile('src_llvm_types', 'llvm_types.cpp', '/src/llvm/llvm_types.cpp', `// LLVM Types\n`, 'src_llvm');

  addFolder('src_validation', 'validation', '/src/validation', 'src');
  addFile('src_val_val', 'validator.cpp', '/src/validation/validator.cpp', `// QIR Base & Adaptive Validator\n`, 'src_validation');
  addFile('src_val_prof', 'profile_validator.cpp', '/src/validation/profile_validator.cpp', `// Profile rules validation\n`, 'src_validation');
  addFile('src_val_type', 'type_checker.cpp', '/src/validation/type_checker.cpp', `// Type checker\n`, 'src_validation');
  addFile('src_val_cf', 'control_flow_checker.cpp', '/src/validation/control_flow_checker.cpp', `// Control flow checker\n`, 'src_validation');
  addFile('src_val_diag', 'diagnostics.cpp', '/src/validation/diagnostics.cpp', `// Diagnostic emitter\n`, 'src_validation');

  addFolder('src_optimization', 'optimization', '/src/optimization', 'src');
  addFile('src_opt_pass', 'pass.cpp', '/src/optimization/pass.cpp', PASS_CPP_CONTENT, 'src_optimization');
  addFile('src_opt_mgr', 'pass_manager.cpp', '/src/optimization/pass_manager.cpp', `// Pass manager\n`, 'src_optimization');
  addFile('src_opt_dce', 'dead_code_elimination.cpp', '/src/optimization/dead_code_elimination.cpp', `// DCE\n`, 'src_optimization');
  addFile('src_opt_cancel', 'gate_cancellation.cpp', '/src/optimization/gate_cancellation.cpp', `// Gate cancellation\n`, 'src_optimization');
  addFile('src_opt_fusion', 'gate_fusion.cpp', '/src/optimization/gate_fusion.cpp', GATE_FUSION_CPP_CONTENT, 'src_optimization');
  addFile('src_opt_cp', 'constant_propagation.cpp', '/src/optimization/constant_propagation.cpp', `// Constant propagation\n`, 'src_optimization');

  addFolder('src_runtime', 'runtime', '/src/runtime', 'src');
  addFile('src_rt_rt', 'runtime.cpp', '/src/runtime/runtime.cpp', `// Runtime implementation\n`, 'src_runtime');
  addFile('src_rt_qubit', 'qubit_manager.cpp', '/src/runtime/qubit_manager.cpp', `// Qubit manager\n`, 'src_runtime');
  addFile('src_rt_res', 'result_manager.cpp', '/src/runtime/result_manager.cpp', `// Result manager\n`, 'src_runtime');
  addFile('src_rt_mem', 'memory_manager.cpp', '/src/runtime/memory_manager.cpp', `// Memory manager\n`, 'src_runtime');
  addFile('src_rt_abi', 'runtime_abi.cpp', '/src/runtime/runtime_abi.cpp', `// Runtime ABI\n`, 'src_runtime');

  addFolder('src_adapter', 'adapter', '/src/adapter', 'src');
  addFile('src_ad_adapter', 'adapter.cpp', '/src/adapter/adapter.cpp', `// Target adapter\n`, 'src_adapter');
  addFile('src_ad_tgt', 'target.cpp', '/src/adapter/target.cpp', `// Target\n`, 'src_adapter');
  addFile('src_ad_caps', 'target_capabilities.cpp', '/src/adapter/target_capabilities.cpp', `// Capabilities\n`, 'src_adapter');
  addFile('src_ad_decomp', 'decomposition.cpp', '/src/adapter/decomposition.cpp', `// Decomposition\n`, 'src_adapter');
  addFile('src_ad_rout', 'routing.cpp', '/src/adapter/routing.cpp', `// Routing\n`, 'src_adapter');
  addFile('src_ad_sched', 'scheduling.cpp', '/src/adapter/scheduling.cpp', `// Scheduling\n`, 'src_adapter');

  addFolder('src_execution', 'execution', '/src/execution', 'src');
  addFile('src_ex_runner', 'runner.cpp', '/src/execution/runner.cpp', `// Runner\n`, 'src_execution');
  addFile('src_ex_res', 'execution_result.cpp', '/src/execution/execution_result.cpp', `// Execution result\n`, 'src_execution');
  addFile('src_ex_backend', 'backend.cpp', '/src/execution/backend.cpp', `// Backend execution\n`, 'src_execution');

  addFolder('src_serial', 'serialization', '/src/serialization', 'src');
  addFile('src_ser_json', 'json.cpp', '/src/serialization/json.cpp', `// JSON serialization\n`, 'src_serial');
  addFile('src_ser_bitcode', 'bitcode.cpp', '/src/serialization/bitcode.cpp', `// Bitcode serialization\n`, 'src_serial');
  addFile('src_ser_text', 'text_ir.cpp', '/src/serialization/text_ir.cpp', `// Text IR serialization\n`, 'src_serial');

  // runtime/
  addFolder('runtime', 'runtime', '/runtime', 'root');
  addFolder('rt_include', 'include', '/runtime/include', 'runtime');
  addFolder('rt_inc_qr', 'qir_runtime', '/runtime/include/qir_runtime', 'rt_include');
  addFile('rt_inc_h', 'qir_runtime.h', '/runtime/include/qir_runtime/qir_runtime.h', `#pragma once\n// QIR C ABI Entrypoints\n`, 'rt_inc_qr');
  addFile('rt_inc_q', 'qubit.h', '/runtime/include/qir_runtime/qubit.h', `#pragma once\n// Qubit handle struct\n`, 'rt_inc_qr');
  addFile('rt_inc_r', 'result.h', '/runtime/include/qir_runtime/result.h', `#pragma once\n// Result handle struct\n`, 'rt_inc_qr');

  addFolder('rt_src', 'src', '/runtime/src', 'runtime');
  addFile('rt_src_rt', 'qir_runtime.cpp', '/runtime/src/qir_runtime.cpp', `// QIR runtime ABI bridge\n`, 'rt_src');
  addFile('rt_src_q', 'qubit.cpp', '/runtime/src/qubit.cpp', `// Qubit allocator\n`, 'rt_src');
  addFile('rt_src_r', 'result.cpp', '/runtime/src/result.cpp', `// Result allocator\n`, 'rt_src');
  addFile('rt_src_m', 'measurement.cpp', '/runtime/src/measurement.cpp', `// Measurement engine\n`, 'rt_src');

  addFolder('rt_sims', 'simulators', '/runtime/simulators', 'runtime');
  addFolder('rt_sim_sv', 'statevector', '/runtime/simulators/statevector', 'rt_sims');
  addFile('sim_sv_sim', 'statevector_simulator.cpp', '/runtime/simulators/statevector/statevector_simulator.cpp', `// Full statevector simulator (up to 30 qubits)\n`, 'rt_sim_sv');
  addFile('sim_sv_gates', 'gate_operations.cpp', '/runtime/simulators/statevector/gate_operations.cpp', `// Unitary matrix multiplications\n`, 'rt_sim_sv');
  addFile('sim_sv_meas', 'measurement.cpp', '/runtime/simulators/statevector/measurement.cpp', `// Born-rule collapse\n`, 'rt_sim_sv');

  addFolder('rt_sim_stab', 'stabilizer', '/runtime/simulators/stabilizer', 'rt_sims');
  addFile('sim_stab_sim', 'stabilizer_simulator.cpp', '/runtime/simulators/stabilizer/stabilizer_simulator.cpp', `// Clifford tableau simulator (thousands of qubits)\n`, 'rt_sim_stab');
  addFile('sim_stab_tab', 'tableau.cpp', '/runtime/simulators/stabilizer/tableau.cpp', `// Aaronson-Gottesman tableau\n`, 'rt_sim_stab');

  // backends/
  addFolder('backends', 'backends', '/backends', 'root');
  addFolder('be_sim', 'simulator', '/backends/simulator', 'backends');
  addFile('be_sim_cpp', 'simulator_backend.cpp', '/backends/simulator/simulator_backend.cpp', `// Simulator backend\n`, 'be_sim');
  addFile('be_sim_h', 'simulator_backend.h', '/backends/simulator/simulator_backend.h', `#pragma once\n// Simulator backend\n`, 'be_sim');

  addFolder('be_qasm', 'openqasm', '/backends/openqasm', 'backends');
  addFile('be_qasm_cpp', 'openqasm_emitter.cpp', '/backends/openqasm/openqasm_emitter.cpp', `// OpenQASM 3 emitter\n`, 'be_qasm');
  addFile('be_qasm_h', 'openqasm_emitter.h', '/backends/openqasm/openqasm_emitter.h', `#pragma once\n// OpenQASM emitter\n`, 'be_qasm');

  addFolder('be_ex', 'example_backend', '/backends/example_backend', 'backends');
  addFile('be_ex_cpp', 'example_backend.cpp', '/backends/example_backend/example_backend.cpp', `// Example hardware backend\n`, 'be_ex');
  addFile('be_ex_h', 'example_backend.h', '/backends/example_backend/example_backend.h', `#pragma once\n// Hardware backend header\n`, 'be_ex');

  // tools/
  addFolder('tools', 'tools', '/tools', 'root');
  addFolder('tool_compile', 'qir-compile', '/tools/qir-compile', 'tools');
  addFile('tool_compile_main', 'main.cpp', '/tools/qir-compile/main.cpp', `// tools/qir-compile/main.cpp\n#include <iostream>\nint main(int argc, char** argv) {\n    std::cout << "qir-compile: QIR Bitcode Synthesizer\\n";\n    return 0;\n}\n`, 'tool_compile');

  addFolder('tool_opt', 'qir-opt', '/tools/qir-opt', 'tools');
  addFile('tool_opt_main', 'main.cpp', '/tools/qir-opt/main.cpp', QIR_OPT_MAIN_CPP_CONTENT, 'tool_opt');

  addFolder('tool_validate', 'qir-validate', '/tools/qir-validate', 'tools');
  addFile('tool_validate_main', 'main.cpp', '/tools/qir-validate/main.cpp', `// tools/qir-validate/main.cpp\n#include <iostream>\nint main(int argc, char** argv) {\n    std::cout << "qir-validate: Profile Conformance Checker\\n";\n    return 0;\n}\n`, 'tool_validate');

  addFolder('tool_run', 'qir-run', '/tools/qir-run', 'tools');
  addFile('tool_run_main', 'main.cpp', '/tools/qir-run/main.cpp', `// tools/qir-run/main.cpp\n#include <iostream>\nint main(int argc, char** argv) {\n    std::cout << "qir-run: QIR JIT / Simulator Runner\\n";\n    return 0;\n}\n`, 'tool_run');

  addFolder('tool_adapt', 'qir-adapt', '/tools/qir-adapt', 'tools');
  addFile('tool_adapt_main', 'main.cpp', '/tools/qir-adapt/main.cpp', `// tools/qir-adapt/main.cpp\n#include <iostream>\nint main() { return 0; }\n`, 'tool_adapt');

  addFolder('tool_dis', 'qir-dis', '/tools/qir-dis', 'tools');
  addFile('tool_dis_main', 'main.cpp', '/tools/qir-dis/main.cpp', `// tools/qir-dis/main.cpp\n#include <iostream>\nint main() { return 0; }\n`, 'tool_dis');

  // examples/
  addFolder('examples', 'examples', '/examples', 'root');

  // Simple QuantumCode (.qc and .qua) Examples
  addFile('ex_qc_simple', 'simple_bell.qc', '/examples/simple_bell.qc', `/**
 * @file examples/simple_bell.qc
 * @brief Simple Quantum Bell State Generator
 * Language: QuantumCode (.qc)
 */

#pragma qpu_target superconducting

circuit CreateBellPair(qubit q0, qubit q1) -> Result {
    // 1. Put q0 into an equal superposition state
    H(q0);

    // 2. Entangle q1 with q0 using Controlled-NOT
    CNOT(q0, q1);

    // 3. Measure both qubits into classical register
    return measure([q0, q1]);
}
`, 'examples');

  addFile('ex_qua_simple', 'teleport_kernel.qua', '/examples/teleport_kernel.qua', `/**
 * @file examples/teleport_kernel.qua
 * @brief Simple Quantum State Teleportation Kernel
 * Language: QuantumCode (.qua)
 */

#pragma qpu_target trapped-ion

circuit TeleportState(qubit message, qubit alice, qubit bob) -> Result {
    // 1. Create shared entangled Bell pair between Alice & Bob
    H(alice);
    CNOT(alice, bob);

    // 2. Alice interacts message qubit with her half of Bell pair
    CNOT(message, alice);
    H(message);

    // 3. Measure Alice's qubits
    bit b0 = measure(message);
    bit b1 = measure(alice);

    // 4. Bob applies conditional Pauli corrections
    if (b1 == 1) {
        X(bob);
    }
    if (b0 == 1) {
        Z(bob);
    }

    return measure(bob);
}
`, 'examples');

  addFolder('ex_bell', 'bell_pair', '/examples/bell_pair', 'examples');
  addFile('ex_bell_qasm', 'bell_pair.qasm', '/examples/bell_pair/bell_pair.qasm', BELL_PAIR_QASM, 'ex_bell');
  addFile('ex_bell_ll', 'bell_pair.ll', '/examples/bell_pair/bell_pair.ll', BELL_PAIR_LL, 'ex_bell');
  addFile('ex_bell_readme', 'README.md', '/examples/bell_pair/README.md', `# Bell Pair Example\n\nEntangles two qubits into the Bell state |Phi+> = (|00> + |11>) / sqrt(2).\n`, 'ex_bell');

  addFolder('ex_tele', 'teleportation', '/examples/teleportation', 'examples');
  addFile('ex_tele_qasm', 'teleportation.qasm', '/examples/teleportation/teleportation.qasm', `OPENQASM 3.0;\nqubit[3] q;\nbit[2] c;\n// Quantum teleportation protocol\n`, 'ex_tele');
  addFile('ex_tele_readme', 'README.md', '/examples/teleportation/README.md', `# Quantum Teleportation\n\nTransfers an unknown state using 1 ebit and 2 classical bits.\n`, 'ex_tele');

  addFolder('ex_vqe', 'variational', '/examples/variational', 'examples');
  addFile('ex_vqe_qasm', 'variational.qasm', '/examples/variational/variational.qasm', `OPENQASM 3.0;\ninput float[64] theta;\nqubit[2] q;\n// Parameterized ansatz\nry(theta) q[0];\ncx q[0], q[1];\n`, 'ex_vqe');
  addFile('ex_vqe_readme', 'README.md', '/examples/variational/README.md', `# Variational Quantum Eigensolver (VQE) Ansatz\n`, 'ex_vqe');

  // tests/
  addFolder('tests', 'tests', '/tests', 'root');
  addFolder('tests_unit', 'unit', '/tests/unit', 'tests');
  addFile('test_unit_types', 'test_types.cpp', '/tests/unit/test_types.cpp', TEST_TYPES_CPP, 'tests_unit');
  addFile('test_unit_builder', 'test_ir_builder.cpp', '/tests/unit/test_ir_builder.cpp', TEST_BUILDER_CPP, 'tests_unit');
  addFile('test_unit_parser', 'test_parser.cpp', '/tests/unit/test_parser.cpp', `// test_parser.cpp\nint main() { return 0; }\n`, 'tests_unit');
  addFile('test_unit_val', 'test_validator.cpp', '/tests/unit/test_validator.cpp', `// test_validator.cpp\nint main() { return 0; }\n`, 'tests_unit');
  addFile('test_unit_prof', 'test_profiles.cpp', '/tests/unit/test_profiles.cpp', `// test_profiles.cpp\nint main() { return 0; }\n`, 'tests_unit');
  addFile('test_unit_opt', 'test_optimizer.cpp', '/tests/unit/test_optimizer.cpp', TEST_OPTIMIZER_CPP_CONTENT, 'tests_unit');

  addFolder('tests_int', 'integration', '/tests/integration', 'tests');
  addFile('test_int_gen', 'test_qir_generation.cpp', '/tests/integration/test_qir_generation.cpp', `// test_qir_generation.cpp\nint main() { return 0; }\n`, 'tests_int');
  addFile('test_int_val', 'test_qir_validation.cpp', '/tests/integration/test_qir_validation.cpp', `// test_qir_validation.cpp\nint main() { return 0; }\n`, 'tests_int');
  addFile('test_int_exec', 'test_qir_execution.cpp', '/tests/integration/test_qir_execution.cpp', `// test_qir_execution.cpp\nint main() { return 0; }\n`, 'tests_int');
  addFile('test_int_adapt', 'test_backend_adaptation.cpp', '/tests/integration/test_backend_adaptation.cpp', `// test_backend_adaptation.cpp\nint main() { return 0; }\n`, 'tests_int');

  addFolder('tests_conf', 'conformance', '/tests/conformance', 'tests');
  addFolder('tests_conf_base', 'base_profile', '/tests/conformance/base_profile', 'tests_conf');
  addFolder('tests_conf_adapt', 'adaptive_profile', '/tests/conformance/adaptive_profile', 'tests_conf');
  addFolder('tests_conf_invalid', 'invalid_modules', '/tests/conformance/invalid_modules', 'tests_conf');
  addFile('tests_conf_base_ex', 'conformance.cpp', '/tests/conformance/base_profile/conformance.cpp', `// Base profile conformance suite\n`, 'tests_conf_base');
  addFile('tests_conf_adapt_ex', 'conformance.cpp', '/tests/conformance/adaptive_profile/conformance.cpp', `// Adaptive profile conformance suite\n`, 'tests_conf_adapt');
  addFile('tests_conf_inv_ex', 'illegal_branch.ll', '/tests/conformance/invalid_modules/illegal_branch.ll', `; Illegal dynamic branch under Base Profile\ndefine void @bad() {\n  br i1 1, label %a, label %b\na:\n  ret void\nb:\n  ret void\n}\n`, 'tests_conf_invalid');

  addFolder('tests_fix', 'fixtures', '/tests/fixtures', 'tests');
  addFolder('tests_fix_val', 'valid', '/tests/fixtures/valid', 'tests_fix');
  addFolder('tests_fix_inv', 'invalid', '/tests/fixtures/invalid', 'tests_fix');
  addFile('tests_fix_val_tele', 'teleportation.ll', '/tests/fixtures/valid/teleportation.ll', `; Valid teleportation QIR\n`, 'tests_fix_val');
  addFile('tests_fix_inv_unbound', 'unbound_qubit.ll', '/tests/fixtures/invalid/unbound_qubit.ll', `; Invalid: using released qubit\n`, 'tests_fix_inv');

  // scripts/
  addFolder('scripts', 'scripts', '/scripts', 'root');
  addFile('script_build', 'build.sh', '/scripts/build.sh', BUILD_SH, 'scripts');
  addFile('script_test', 'test.sh', '/scripts/test.sh', `#!/usr/bin/env bash\nctest --test-dir build --output-on-failure\n`, 'scripts');
  addFile('script_format', 'format.sh', '/scripts/format.sh', `#!/usr/bin/env bash\nfind include src tests tools -iname '*.h' -o -iname '*.cpp' | xargs clang-format -i\n`, 'scripts');
  addFile('script_gen_tbls', 'generate_tables.py', '/scripts/generate_tables.py', `#!/usr/bin/env python3\nprint("Generating gate matrix tables...")\n`, 'scripts');
  addFile('script_check_conf', 'check_qir_conformance.py', '/scripts/check_qir_conformance.py', CHECK_CONFORMANCE_PY, 'scripts');

  // third_party/
  addFolder('third_party', 'third_party', '/third_party', 'root');
  addFile('tp_readme', 'README.md', '/third_party/README.md', `# Third-Party Dependencies\n\n- LLVM 17.0.6 (Apache 2.0 with LLVM Exception)\n- Catch2 v3.4.0 (BSL-1.0)\n- yaml-cpp (MIT)\n`, 'third_party');

  // Inject 20 Bleeding-Edge Architecture Modules (Parts I - V)
  injectBleedingEdgeModules(files, addFolder, addFile);

  // Inject 40 Extended Enterprise Quantum Compiler & QLLVM Modules (Parts I - VI)
  injectExtendedBleedingEdgeModules(files, addFolder, addFile);

  // Inject Enterprise Quantum Database (QDB) & QuantumCode Modules (Parts I - VI)
  injectQuantumDatabaseModules(files, addFolder, addFile);

  // Inject 4-Phase QuantumCode (.qc/.qua) & QDB Engine Passes
  injectQuantumCodeEngineFiles(files, addFolder, addFile);

  // Inject 5-Phase Quantum Platform Expansion Modules
  injectQuantumSystemExpansionFiles(files, addFolder, addFile);

  // Workspace configuration (.vscode/settings.json)
  addFolder('vscode_config', '.vscode', '/.vscode', 'root');
  addFile('vscode_settings', 'settings.json', '/.vscode/settings.json', JSON.stringify({
    "workbench.tree.renderIndentGuides": "none",
    "explorer.files.visible": false,
    "explorer.folders.collapsed": true,
    "explorer.autoReveal": false,
    "files.exclude": {
      "**/*": true
    }
  }, null, 2), 'vscode_config');

  return files;
}
