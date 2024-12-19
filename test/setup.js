import { nameToBigInt } from "@eosnetwork/vert"
import { applyPropConfig, blockchain, tok, token } from "./util.js"
import fs from "fs/promises"
import { Name } from "@greymass/eosio"
async function setupTestAccounts() {
  blockchain.createAccount("alice")
  blockchain.createAccount("bob")
}

async function setupToken() {
  await tok("create", { issuer: "eosio.token", maximum_supply: `1000000000000.0000 EOS` })
  await tok("issue", { to: "eosio.token", quantity: `1000000000000.0000 EOS`, memo: "" })
  // await tok("transfer", { from: "token", to: "alice", quantity: "100.0000 SYS", memo: "" })
  // await tok("transfer", { from: "token", to: "bob", quantity: "100.0000 SYS", memo: "" })
}

async function setupProposals() {
  const phasesConfig = await fs.readFile("./configs/phasesConfig.json", "utf-8").then(JSON.parse)
  const generalConfig = await fs.readFile("./configs/generalConfig.json", "utf-8").then(JSON.parse)
  await applyPropConfig("phases", phasesConfig)
  await applyPropConfig("general", generalConfig)
  // const configTable = blockchain.getAccount(Name.from("proposals")).tables
}

export async function initContracts() {
  await setupTestAccounts()
  await setupToken()
  await setupProposals()
}
