require('dotenv').config()

const contract = (name, nameOnChain) => {
  return {
    name,
    nameOnChain,
    type: 'contract',
    stakes: {
      cpu: '20.0000 EOS',
      net: '20.0000 EOS',
      ram: 2000000
    }
  }
}

const devKey = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
const devKeyJungle = 'EOS8UQqzawtRUwtozSTPYLoyWv1ms1RKVrqVQikfQi5C77HFnFB51'
const devKeyTLOS = 'EOS52qknGJh69NqfFL2sZfiuNtSYrR41B38w18gX1rbaoPFdGrpin'
const mainnetKey = process.env.MAINNET_PUBLIC_KEY


const supportedChains = {
  local: 'local',
  telosTestnet: 'telosTestnet',
  telosMainnet: 'telosMainnet',
  jungleTestnet:'jungleTestnet',
  eosMainnet: 'eosMainnet'
}

const ownerByChain = {
  [supportedChains.local]: 'eosio',
  [supportedChains.jungleTestnet]: 'tlalocman123',
  [supportedChains.telosTestnet]: 'tlaclocmant2',
  [supportedChains.eosMainnet]: 'erick.bk'
}

const ownerPublicKeysByChain = {
  [supportedChains.local]: {
    owner: devKey,
    active: devKey
  },
  [supportedChains.jungleTestnet]: {
    owner: devKeyJungle,
    active: devKeyJungle
  },
  [supportedChains.telosTestnet]: {
    owner: devKeyTLOS,
    active: devKeyTLOS
  },
  [supportedChains.eosMainnet]: {
    owner: mainnetKey,
    active: mainnetKey
  }
}

const publicKeysByChain = {
  [supportedChains.local]: {
    owner: devKey,
    active: devKey
  },
  [supportedChains.jungleTestnet]: {
    owner: devKeyJungle,
    active: devKeyJungle
  },
  [supportedChains.telosTestnet]: {
    owner: devKeyTLOS,
    active: devKeyTLOS
  }
}

const contractsConfig = {
  [supportedChains.local]: [
    contract('nullcontract', 'm1nullcntrct'),
    contract('referendums', 'bitcash.refm'),
    contract('proposals', 'bitcash.prop'),
    contract('token', 'eosio.token')
  ],
  [supportedChains.jungleTestnet]: [
    contract('referendums', 'referendums1'),
    contract('proposals', 'tlaproposals'),
    contract('token', 'tlatesttoken')
  ],
  [supportedChains.telosTestnet]: [
    contract('referendums', 'referendums1'),
    contract('proposals', 'tlaproposals'),
    contract('token', 'tlatesttoken')
  ],
  [supportedChains.telosTestnet]: [
    contract('referendums', 'testrefendum'),
    contract('proposals', 'testproposal'),
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
