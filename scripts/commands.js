const { contracts, publicKeys, owner, chain, sleep, isLocalNode } = require('./config')
const { compileContract } = require('./compile')
const { createAccount, deployContract } = require('./deploy')
const { accountExists, contractRunningSameCode } = require('./eosio-errors')
const { updatePermissions } = require('./permissions')
const { setConfig, setPhases } = require('./contract-settings')
const prompt = require('prompt-sync')()


async function manageDeployment(contract) {
  console.log('create account:', contract.nameOnChain)
  try {
    await createAccount({
      account: contract.nameOnChain,
      publicKey: publicKeys.active,
      stakes: contract.stakes,
      creator: owner
    })
  } catch (err) {
    accountExists(err)
  }
  console.log('deploy contract for:', contract.nameOnChain)
  try {
    await deployContract(contract)
  } catch (err) {
    contractRunningSameCode(err)
  }
  console.log('done\n')
}

async function init() {

  // compile contracts
  console.log('COMPILING CONTRACTS\n')

  await Promise.all(contracts.map(contract => {
    return compileContract({
      contract: contract.name,
      path: `./src/${contract.name}.cpp`
    })
  }))

  console.log('compilation finished\n\n')

  // deploy contracts
  console.log('DEPLOYING CONTRACTS\n')

  for (const contract of contracts) {
    await manageDeployment(contract)
    await sleep(1000)
  }

  console.log('deployment finished\n\n')

  console.log('UPDATE PERMISSIONS\n')
  await updatePermissions()
  console.log('update permissions finished\n\n')

  console.log('SETTING CONTRACTS PARAMETERS\n')
  await setConfig()
  await setPhases()

  console.log('setting parameters finished\n\n')

}

async function setParamsValue() {
  console.log('SETTING CONTRACTS PARAMETERS\n')
  await setConfig()
  await setPhases()

  console.log('setting parameters finished\n\n')
}

async function run(contractName) {

  let contract = contracts.filter(c => c.name == contractName)
  if (contract.length > 0) {
    contract = contract[0]
  } else {
    console.log('contract not found')
    return
  }

  await compileContract({
    contract: contract.name,
    path: `./src/${contract.name}.cpp`
  })

  await manageDeployment(contract)

}

async function compile() {

  // compile contracts
  console.log('COMPILING CONTRACTS\n')

  await Promise.all(contracts.map(contract => {
    return compileContract({
      contract: contract.name,
      path: `./src/${contract.name}.cpp`
    })
  }))

  console.log('compilation finished\n\n')

}


async function compile_contract(contractName) {

  let contract = contracts.filter(c => c.name == contractName)
  if (contract.length > 0) {
    contract = contract[0]
  } else {
    console.log('contract not found')
    return
  }

  await compileContract({
    contract: contract.name,
    path: `./src/${contract.name}.cpp`
  })

  console.log('compilation finished\n\n')

}

async function main() {

  if (!isLocalNode()) {
    const option = prompt(`You are about to run a command on ${chain}, are you sure? [y/n] `)
    if (option.toLowerCase() !== 'y') { return }
  }

  const args = process.argv.slice(2)

  switch (args[0]) {

    case 'init':
      await init()
      break;

    case 'compile':
      if (args.length == 1) {
        await compile()

      } else {

        await compile_contract(args[1])
      }
      break;

    case 'run':
      await run(args[1])
      break;

    case 'set':
      if (args[1] == 'params') {
        await setParamsValue()

      } else if (args[1] == 'permissions') {
        await updatePermissions()

      }
      break;

    default:
      console.log('Invalid input.')
  }

}

main()