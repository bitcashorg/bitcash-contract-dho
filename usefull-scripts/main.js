const { ProposalsFactory } = require('../test/util/ProposalsUtil')
const { getContracts, createRandomAccount, Asset, formatTimePoint } = require('../scripts/eosio-util')
const { contractNames, contracts: configContracts, isLocalNode, sleep } = require('../scripts/config')

const { proposals, token, referendums } = contractNames


async function createProp() {
  contracts = await getContracts([proposals, referendums])
  const proposal = await ProposalsFactory.createMainWithDefaults({ creator: "erick.bk" })
  const res = await contracts.proposals.create(proposal.getActionParams(), { authorization: `${proposal.params.creator}@active` })
  console.log(res)

}

async function moveProp() {
  contracts = await getContracts([proposals, referendums])
  const res = await contracts.proposals.move(4, { authorization: "erick.bk@active" })
  console.log(res)
}
async function main() {
  // await createProp()
     await moveProp()
}

main()
