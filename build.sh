#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# Check for input argument
if [ -z "$1" ]; then
    echo -e "${RED}Error: No contract name provided!${NC}"
    echo "Usage: sh build.sh <contract_name>"
    exit 1
fi

# Contract name
CONTRACT="$1"

# Directories
CONTRACTS_DIR="$PWD"
BUILD_DIR="$CONTRACTS_DIR/build"
CPP_FILE="$CONTRACTS_DIR/src/$CONTRACT.cpp"
HPP_FILE="$CONTRACTS_DIR/include/$CONTRACT.hpp"

echo -e "${YELLOW}Building $CONTRACT contract...${NC}"

# Check if files exist
if [ ! -f "$CPP_FILE" ] || [ ! -f "$HPP_FILE" ]; then
    echo -e "${RED}Error: Contract source files not found!${NC}"
    echo "Expected files:"
    echo "- $CPP_FILE"
    echo "- $HPP_FILE"
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p $BUILD_DIR

# Build the contract
echo -e "${YELLOW}Compiling...${NC}"

# Clean any previous build
rm -f $BUILD_DIR/$CONTRACT.wasm
rm -f $BUILD_DIR/$CONTRACT.abi

# Compile the contract and filter out ricardian warnings and their associated lines
cdt-cpp \
    -abigen \
    --no-missing-ricardian-clause \
    -I "$CONTRACTS_DIR/include" \
    -contract=$CONTRACT \
    -o "$BUILD_DIR/$CONTRACT.wasm" \
    "$CPP_FILE" 2>&1 | grep -v -E "warning: abigen warning \(Action .* does not have a ricardian contract\)|ACTION.*::|^\s*\^$"

# Check the exit status of cdt-cpp
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    echo -e "Output files:"
    echo -e "- $BUILD_DIR/$CONTRACT.wasm"
    echo -e "- $BUILD_DIR/$CONTRACT.abi"

    # Display file sizes
    WASM_SIZE=$(ls -lh "$BUILD_DIR/$CONTRACT.wasm" | awk '{print $5}')
    ABI_SIZE=$(ls -lh "$BUILD_DIR/$CONTRACT.abi" | awk '{print $5}')
    echo -e "\nFile sizes:"
    echo -e "WASM: $WASM_SIZE"
    echo -e "ABI:  $ABI_SIZE"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
