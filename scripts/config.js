require('dotenv').config()

const contract = (name, nameOnChain) => {
  return {
    name,
    nameOnChain,
    type: 'contract',
    stakes: {
      cpu: '20.0000 TLOS',
      net: '20.0000 TLOS',
      ram: 1000000
    }
  }
}

const devKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'

const supportedChains = {
  local: 'local'
}

const ownerByChain = {
  [supportedChains.local]: 'eosio'
}

const ownerPublicKeysByChain = {
  [supportedChains.local]: {
    owner: devKey,
    active: devKey
  }
}

const publicKeysByChain = {
  [supportedChains.local]: {
    owner: devKey,
    active: devKey
  }
}

const contractsConfig = {
  [supportedChains.local]: [
    contract('nullcontract', 'm1nullcntrct'),
    contract('referendums', 'referendums1'),
    contract('proposals', 'proposals111'),
    contract('token', 'eosio.token')
  ]
}

const chain = process.env.CHAIN_NAME

const owner = ownerByChain[chain]
const ownerPublicKeys = ownerPublicKeysByChain[chain]
const publicKeys = publicKeysByChain[chain]

const contracts = contractsConfig[chain]
const contractNames = {}
const nameOnChainToName = {}

for (const c of contracts) {
  contractNames[c.name] = c.nameOnChain
  nameOnChainToName[c.nameOnChain] = c.name
}

const permissionsConfig = [
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.referendums}@eosio.code`
  },
  {
    target: `${contractNames.proposals}@active`,
    actor: `${contractNames.proposals}@eosio.code`
  },
  {
    target: `${contractNames.referendums}@active`,
    actor: `${contractNames.proposals}@active`
  }
]

function isLocalNode () {
  return chain == supportedChains.local
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  contracts, contractNames, nameOnChainToName, owner, ownerPublicKeys, publicKeys, 
  isLocalNode, sleep, chain, permissionsConfig, devKey
}
