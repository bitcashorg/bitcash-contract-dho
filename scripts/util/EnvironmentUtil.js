const { exec } = require('child_process')
const { promisify } = require('util')

const { createAccount, deployContract } = require('../deploy')
const { updatePermissions } = require('../permissions')
const { accountExists, contractRunningSameCode } = require('../eosio-errors')
const { devKey } = require('../config')

const execCommand = promisify(exec)


// nodeos -e -p eosio \
//   --hard-replay \
//   --plugin eosio::producer_plugin \
//   --plugin eosio::chain_api_plugin \
//   --plugin eosio::http_plugin \
//   --http-server-address=0.0.0.0:8888 \
//   --access-control-allow-origin=* \
//   --contracts-console \
//   --http-validate-host=false \
//   --verbose-http-errors \
//   --max-transaction-time=100 \
//   --resource-monitor-space-threshold=99


class EnvironmentUtil {

  static nodeosName = 'nodeos'

  static async initNode() {
    const nodeosCommand = `nodeos -e -p eosio \
    --plugin eosio::producer_plugin \
    --plugin eosio::chain_api_plugin \
    --plugin eosio::http_plugin \
    --http-server-address=0.0.0.0:8888 \
    --access-control-allow-origin=* \
    --contracts-console \
    --http-validate-host=false \
    --verbose-http-errors \
    --max-transaction-time=100 `
    const command = `docker run --rm --name ${EnvironmentUtil.nodeosName} -p 127.0.0.1:8888:8888 -p 9876:9876 eostudio/eos:v2.0.0-rc3 /bin/bash -c "${nodeosCommand}"`
    execCommand(command)
  }

  static async deployContracts(contracts) {
    for (const contract of contracts) {
      try {
        await createAccount({
          account: contract.nameOnChain,
          publicKey: devKey,
          stakes: {},
          creator: 'eosio'
        })
      } catch (err) {
        accountExists(err)
      }
      try {
        await deployContract(contract)
      } catch (err) {
        contractRunningSameCode(err)
      }
    }
  }

  static async updatePermissions() {
    await updatePermissions()
  }

  static async killNode() {
    // const command = `docker kill ${EnvironmentUtil.nodeosName}`
    // await execCommand(command)
  }

}

module.exports = { EnvironmentUtil }
