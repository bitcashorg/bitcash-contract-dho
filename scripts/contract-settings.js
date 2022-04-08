const { transact, rpc } = require('./eos')

const { ConfigPhasesBuilder, ConfigGeneralBuilder, ConfigEngineer } = require('./util/ConfigUtil')
const { getContracts, createRandomAccount, Asset, formatTimePoint } = require('./eosio-util')

const { contractNames } = require('./config')
const { proposals } = contractNames

async function setConfig(test = false) {
  let contracts
  contracts = await getContracts([proposals])

  const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
  await configEngineerGeneral.execute({})
}

async function getConfig() {
  const res = await rpc.get_table_rows({
    code: proposals,
    scope: proposals,
    table: 'config',
    json: true,
    limit: 200
  })
  return res.rows
}

async function setPhases() {
  let contracts
  contracts = await getContracts([proposals])
  
  const configEngineerPhases = new ConfigEngineer(new ConfigPhasesBuilder(contracts.proposals, proposals))
  await configEngineerPhases.execute({})

}

module.exports = {
  setConfig, getConfig,
  setPhases
}



