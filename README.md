# bitcash.dho-smart-contract

The bitcash.dho smart contract.

# Dependencies

* eosio 2.0^
* eosio.cdt 1.6^
* cmake 3.5^

## setup project 

create a .env file based on .env.example

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
node scripts/commands.js compile proposals111
```

## test

```bash
node scripts/commands.js compile test
```
