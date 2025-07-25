# Bitcash Contracts Configuration Guide

This guide explains how to configure the bitcash proposals and referendums smart contracts using the enhanced Node.js configuration system.

## Quick Start

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 2. Run interactive configuration
node scripts/commands.js config

# 3. For full deployment and configuration
node scripts/commands.js init
```

## Configuration System

The repository includes a comprehensive Node.js configuration system with both command-line and interactive interfaces.

### Available Commands

```bash
# Interactive configuration menu
node scripts/commands.js config

# Show current blockchain configuration
node scripts/commands.js config show

# Show local configuration files
node scripts/commands.js config files

# Set test configuration (lower stakes)
node scripts/commands.js config test

# Check account status
node scripts/commands.js config accounts

# Full deployment and configuration
node scripts/commands.js init

# Set parameters only
node scripts/commands.js set params

# Set permissions only
node scripts/commands.js set permissions

# Contract verification and monitoring
node scripts/commands.js check                  # Full health check
node scripts/commands.js check deployment      # Check contract deployment status
node scripts/commands.js check config          # Show current blockchain configuration
node scripts/commands.js check tables          # Check table contents and statistics
node scripts/commands.js check accounts        # Check account status and resources

# Help
node scripts/commands.js help
```

## Interactive Configuration Menu

The interactive menu provides easy access to all configuration options:

```bash
node scripts/commands.js config
```

**Menu Options:**
1. Show current configuration (from blockchain)
2. Show configuration files (local JSON)
3. Set parameters (from JSON files)
4. Set phases (from JSON files)
5. Set test configuration (lower stakes)
6. Check account status
7. Set both parameters and phases

## Configuration Files

### Core Configuration Files

- **`scripts/config.js`**: Main configuration (chain, accounts, permissions)
- **`scripts/config/params.json`**: Global parameters (stakes, quorum)
- **`scripts/config/phasesConfig.json`**: Phase configurations
- **`scripts/config/params.test.json`**: Test parameters (lower stakes)
- **`.env`**: Environment variables (keys, endpoints)

### Parameter Configuration

#### Production (`scripts/config/params.json`)
```json
{
  "main": {
    "minstake": ["asset", "10.0000 IMPACT"],
    "quorum": ["asset", "10000.0000 IMPACT"]
  },
  "amendment": {
    "minstake": ["asset", "10.0000 IMPACT"],
    "quorum": ["asset", "10000.0000 IMPACT"]
  }
}
```

#### Test Configuration (`scripts/config/params.test.json`)
```json
{
  "main": {
    "minstake": ["asset", "1.0000 IMPACT"],
    "quorum": ["asset", "100.0000 IMPACT"]
  }
}
```

#### Phase Configuration (`scripts/config/phasesConfig.json`)
```json
{
  "main": [
    {"phaseName": "debate", "durationDays": 7, "type": "dialog"},
    {"phaseName": "prevote", "durationDays": 7, "type": "voting"},
    {"phaseName": "vote", "durationDays": 7, "type": "voting"}
  ]
}
```

## Proposal Types

### 1. **Main Proposals** (`main`)
- **Purpose**: General governance proposals
- **Phases**: debate → prevote → vote (21 days)
- **Parameters**: 10 IMPACT min stake, 10,000 IMPACT quorum

### 2. **Amendment Proposals** (`amendment`)
- **Purpose**: Constitutional/system changes
- **Phases**: debate → vote (14 days)
- **Parameters**: 10 IMPACT min stake, 10,000 IMPACT quorum

### 3. **Change Time Proposals** (`changetime`)
- **Purpose**: Modify proposal timelines
- **Phases**: vote only (2 days)
- **Parameters**: 10 IMPACT min stake, 10,000 IMPACT quorum

### 4. **Extend Debate Proposals** (`extenddebate`)
- **Purpose**: Extend debate periods
- **Phases**: vote only (3 days)
- **Parameters**: 10 IMPACT min stake, 10,000 IMPACT quorum

### 5. **Shorten Debate Proposals** (`shortndebate`)
- **Purpose**: Shorten debate periods
- **Phases**: debate → vote (13 days)
- **Parameters**: 10 IMPACT min stake, 10,000 IMPACT quorum

## Environment Setup

### Required Environment Variables

Create `.env` file based on `.env.example`:

```bash
# Blockchain configuration
CHAIN_NAME=local

# Network-specific endpoints (choose based on your CHAIN_NAME)
LOCAL_ENDPOINT=http://127.0.0.1:8888
LAYER1_ENDPOINT=https://api.np.animus.is
TELOS_TESTNET_ENDPOINT=https://testnet.telos.net
TELOS_MAINNET_ENDPOINT=https://mainnet.telos.net
JUNGLE_TESTNET_ENDPOINT=https://jungle4.api.eosnation.io
EOS_MAINNET_ENDPOINT=https://api.eosn.io

# Fallback endpoint
ENDPOINT=http://127.0.0.1:8888

# Account keys
PUBLIC_KEY=EOSxxx
PRIVATE_KEY=5KQxxx

# Environment name
ENV_NAME=local

# Owner Account (for production networks)
OWNER_ACCOUNT=your.account

# Contract Account Names (configurable)
PROPOSALS_ACCOUNT=prop.bitcash
REFERENDUMS_ACCOUNT=refe.bitcash
TOKEN_ACCOUNT=eosio.token
```

### Network-Specific Configuration

The system automatically selects the appropriate endpoint based on your `CHAIN_NAME` and supports network-specific environment variables:

**Supported Networks:**
- **local**: Local development (default: `http://127.0.0.1:8888`)
- **layer1**: Layer1 Network (default: `https://api.np.animus.is`)
- **jungleTestnet**: EOS Jungle Testnet (default: `https://jungle4.api.eosnation.io`)
- **telosTestnet**: Telos Testnet (default: `https://testnet.telos.net`)
- **telosMainnet**: Telos Mainnet (default: `https://mainnet.telos.net`)
- **eosMainnet**: EOS Mainnet (default: `https://api.eosn.io`)

**Environment Variable Priority:**
1. Network-specific endpoint (e.g., `LAYER1_ENDPOINT`, `TELOS_MAINNET_ENDPOINT`)
2. Fallback `ENDPOINT` variable
3. Built-in defaults

**Examples for different networks:**

```bash
# Layer1 Network
CHAIN_NAME=layer1
LAYER1_ENDPOINT=https://api.np.animus.is
PROPOSALS_ACCOUNT=prop.bitcash
REFERENDUMS_ACCOUNT=refe.bitcash
OWNER_ACCOUNT=your.account

# Local development
CHAIN_NAME=local
LOCAL_ENDPOINT=http://127.0.0.1:8888

# Telos Mainnet with custom endpoint
CHAIN_NAME=telosMainnet
TELOS_MAINNET_ENDPOINT=https://mainnet.telos.net

# Telos Testnet
CHAIN_NAME=telosTestnet
TELOS_TESTNET_ENDPOINT=https://testnet.telos.net

# EOS Jungle Testnet
CHAIN_NAME=jungleTestnet
JUNGLE_TESTNET_ENDPOINT=https://jungle4.api.eosnation.io
```

### Contract Account Configuration

The system now supports configurable contract account names through environment variables:

- **`PROPOSALS_ACCOUNT`**: Account name for the proposals contract (default varies by chain)
- **`REFERENDUMS_ACCOUNT`**: Account name for the referendums contract (default varies by chain)  
- **`TOKEN_ACCOUNT`**: Account name for the token contract (default varies by chain)

**Examples for different setups:**

```bash
# For production with custom accounts
PROPOSALS_ACCOUNT=prop.bitcash
REFERENDUMS_ACCOUNT=refe.bitcash

# For local development with default accounts
PROPOSALS_ACCOUNT=eosmakeprops
REFERENDUMS_ACCOUNT=eospropvotes

# For testnet
PROPOSALS_ACCOUNT=tlaproposals
REFERENDUMS_ACCOUNT=referendums1
```

## Usage Examples

### Complete Setup Workflow

```bash
# 1. Clone and setup
git clone <repo>
cd bitcash-contract-dho
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Deploy and configure everything
node scripts/commands.js init
```

### Development Workflow

```bash
# Compile contracts
node scripts/commands.js compile

# Deploy specific contract
node scripts/commands.js run proposals

# Check current configuration
node scripts/commands.js config show

# Set test configuration for development
node scripts/commands.js config test

# Interactive configuration
node scripts/commands.js config
```

### Configuration Management

```bash
# Show current blockchain configuration
node scripts/commands.js config show

# Show local configuration files
node scripts/commands.js config files

# Check account status and resources
node scripts/commands.js config accounts

# Apply test configuration (lower stakes)
node scripts/commands.js config test

# Set parameters from JSON files
node scripts/commands.js set params
```

## Integration with ConfigUtil.js

The system integrates with the existing JavaScript utilities:

- **ConfigGeneralBuilder**: Sets global parameters from `params.json`
- **ConfigPhasesBuilder**: Sets phase configurations from `phasesConfig.json`  
- **ConfigEngineer**: Orchestrates the configuration process

## Verification

### Check Configuration

```bash
# Show current blockchain configuration
node scripts/commands.js config show

# Check account status
node scripts/commands.js config accounts

# Show local configuration files
node scripts/commands.js config files
```

## Troubleshooting

### Common Issues

1. **Missing .env file**: Copy from `.env.example` and configure
2. **Wrong chain**: Verify `CHAIN_NAME` in `.env`
3. **Permission errors**: Ensure accounts have proper permissions
4. **Network issues**: Check `ENDPOINT` configuration

### Debug Commands

```bash
# Show help
node scripts/commands.js help

# Check environment loading
node -e "require('dotenv').config(); console.log(process.env.CHAIN_NAME)"

# Verify configuration loading
node -e "const config = require('./scripts/config'); console.log(config.contracts)"

# Check account status
node scripts/commands.js config accounts
```

## NPM Scripts

Available package.json scripts:

```bash
# Initialize everything
npm run initAll

# Build contracts
npm run build

# Run tests
npm test
```

## Advanced Usage

### Custom Configuration Paths

The ConfigUtil system supports custom configuration paths:

```javascript
// Use custom parameter file
const configEngineer = new ConfigEngineer(
  new ConfigGeneralBuilder(contract, account)
)
await configEngineer.execute({ 
  path: './custom-params.json' 
})
```

### Environment-Specific Configuration

The system automatically selects appropriate contract names based on `CHAIN_NAME`:

- **local**: Development accounts
- **jungleTestnet**: Testnet accounts
- **telosMainnet**: Production accounts 

## Test Data Creation

Create sample proposals and referendums for testing and demonstration purposes:

### Test Commands

```bash
# Interactive test data menu
node scripts/commands.js test data

# Create specific test data
node scripts/commands.js test proposals    # Create sample proposals
node scripts/commands.js test referendums  # Create sample referendums

# Show available test options
node scripts/commands.js test
```

### Sample Test Data

**Test Proposals Created:**
1. **Main Proposal**: "Community Garden Initiative" - A realistic proposal with budget and KPIs
2. **Amendment Proposal**: Budget increase for the main proposal 
3. **Extend Debate Proposal**: Request to extend debate period for more community input

**Test Referendums Created:**
1. **Community Governance Referendum**: 14-day duration, 25%→15% quorum, 60% majority
2. **Constitutional Amendment Referendum**: 21-day duration, 30%→20% quorum, 65% majority

### Usage Notes

- Test data uses the `bitcash` account as creator (ensure this account exists and has permissions)
- Proposals use realistic IMPACT token amounts based on your configuration
- Referendums include realistic quorum and majority percentage configurations
- All test data is created with future deadlines/dates for testing purposes 