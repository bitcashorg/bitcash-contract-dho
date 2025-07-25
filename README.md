<!-- @format -->

# bitcash.dho-smart-contract

The bitcash.dho smart contract.

# Dependencies

- eosio 2.0^
- eosio.cdt 1.6^
- cmake 3.5^

## setup project

create a .env file based on .env.example

## Configuration

The project includes an enhanced configuration system for managing proposal parameters and phases across multiple networks including Layer1, Telos, and EOS.

### Quick Configuration

```bash
# Interactive configuration menu
node scripts/commands.js config

# Full deployment and configuration
node scripts/commands.js init
```

### Available Commands

```bash
node scripts/commands.js help                    # Show all available commands
node scripts/commands.js config                 # Interactive configuration
node scripts/commands.js config show            # Show current blockchain config
node scripts/commands.js config test            # Set test configuration
node scripts/commands.js set params             # Set parameters from JSON
node scripts/commands.js check                  # Full contract health check
node scripts/commands.js check deployment       # Check contract deployment status
node scripts/commands.js test data              # Interactive test data creation
node scripts/commands.js test proposals         # Create sample proposals
node scripts/commands.js test referendums       # Create sample referendums
```

**Supported Networks:** local, layer1, telosTestnet, telosMainnet, jungleTestnet, eosMainnet

See [docs/configuration-guide.md](docs/configuration-guide.md) for detailed configuration documentation.

## compile all contracts

```bash
node scripts/commands.js compile
```

## compile a contract

```bash
node scripts/commands.js compile $CONTRACT_NAME
```

### example:

```bash
node scripts/commands.js compile proposals
```

## test

```bash
npm run test
```
