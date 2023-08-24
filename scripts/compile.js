require('dotenv').config()

const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const { join } = require('path')

const execCommand = promisify(exec)

async function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

async function copyFile(source, target) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target)
  }
}

async function compileContract({
  contract,
  path
}) {

  const compiled = join(__dirname, '../compiled')
  let cmd = ""
  if (process.env.COMPILER === 'local') {
    cmd = `eosio-cpp -abigen -I ./include -contract ${contract} -o ./compiled/${contract}.wasm ${path}`
  } else {
    cmd = `docker run --rm --volume ${join(__dirname, '../')}:/project -w /project eostudio/eosio.cdt:v1.8.1 /bin/bash -c "echo 'starting';eosio-cpp -abigen -I ./include -contract ${contract} -o ./compiled/${contract}.wasm ${path}"`
  }
  console.log("compiler command: " + cmd, '\n')

  if (!fs.existsSync(compiled)) {
    fs.mkdirSync(compiled)
  }

  await deleteFile(join(compiled, `${contract}.wasm`))
  await deleteFile(join(compiled, `${contract}.abi`))

  await execCommand(cmd)

}

async function updateConstants() {
  if (process.env.ENV_NAME === 'development') {
    await copyFile(join(__dirname, '../include/common/constants.prod.hpp'),
      join(__dirname, '../include/common/constants.hpp'))
  }
  if (process.env.ENV_NAME === 'production') {
    await copyFile(join(__dirname, '../include/common/constants.prod.hpp'),
      join(__dirname, '../include/common/constants.hpp'))
  }
  if (process.env.ENV_NAME === 'pre-production') {
    await copyFile(join(__dirname, '../include/common/constants.preprod.hpp'),
      join(__dirname, '../include/common/constants.hpp'))
  }
}

module.exports = { compileContract, updateConstants }
