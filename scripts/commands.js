const { contracts, publicKeys, owner, chain, sleep, isLocalNode } = require('./config')
const { compileContract, updateConstants } = require('./compile')
const { createAccount, deployContract } = require('./deploy')
const { accountExists, contractRunningSameCode } = require('./eosio-errors')
const { updatePermissions } = require('./permissions')
const { setConfig, setPhases } = require('./contract-settings')
const { config } = require('chai')
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

  await compile()

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

  console.log('setting config')
  await setConfig()

  console.log('setting phases')
  await setPhases()

  console.log('setting parameters finished\n\n')

}

async function setParamsValue(config = false, phases = false) {
  console.log('SETTING CONTRACTS PARAMETERS\n')
  if (config) {
    console.log('setting config')
    await setConfig()
  }

  if (phases) {
    console.log('setting phases')
    await setPhases()
  }


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

  console.log(`Setting ${process.env.ENV_NAME} constants`)
  await updateConstants()

  await compileContract({
    contract: contract.name,
    path: `./src/${contract.name}.cpp`
  })

  await manageDeployment(contract)

}

async function deploy(contractName) {

  let contract = contracts.filter(c => c.name == contractName)
  if (contract.length > 0) {
    contract = contract[0]
  } else {
    console.log('contract not found')
    return
  }

  await manageDeployment(contract)

}

async function compile() {

  console.log(`Setting ${process.env.ENV_NAME} constants`)
  await updateConstants()

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

    case 'deploy':
      await deploy(args[1])
      break;

    case 'set':
      switch (args[1]) {
        case 'config':
          await setParamsValue(true, false)
          break;
        case 'phases':
          await setParamsValue(false, true)
          break;
        case 'all':
          await setParamsValue(true, true)
          break;
        case 'permissions':
          await updatePermissions()
          break;
        default:
          console.log('Invalid input.')
          break;
      }
      break;
    default:
      console.log('Invalid input.')
  }

}

main()