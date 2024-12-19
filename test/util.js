import { Blockchain, nameToBigInt, expectToThrow, AccountPermission } from "@eosnetwork/vert"
import { Authority, Name, PermissionLevel, PermissionLevelWeight, UInt16, UInt32 } from "@greymass/eosio"
export const blockchain = new Blockchain()
export const referendums = blockchain.createContract("eospropvotes", "../build/referendums")
export const proposals = blockchain.createContract("proposals", "../build/proposals")
export const token = blockchain.createContract("eosio.token", "../build/token")
referendums.setPermissions([
  AccountPermission.from({
    perm_name: Name.from("owner"),
    parent: Name.from(""),
    required_auth: Authority.from({
      threshold: UInt32.from(1),
      keys: [],
      accounts: [
        PermissionLevelWeight.from({
          permission: PermissionLevel.from("eospropvotes@eosio.code"),
          weight: UInt16.from(1),
        }),
      ],
      waits: [],
    }),
  }),
  AccountPermission.from({
    perm_name: Name.from("active"),
    parent: Name.from("owner"),
    required_auth: Authority.from({
      threshold: UInt32.from(1),
      keys: [],
      accounts: [
        PermissionLevelWeight.from({
          permission: PermissionLevel.from("eospropvotes@eosio.code"),
          weight: UInt16.from(1),
        }),
        PermissionLevelWeight.from({
          permission: PermissionLevel.from("proposals@eosio.code"),
          weight: UInt16.from(1),
        }),
      ],
      waits: [],
    }),
  }),
])
// const accountInfo = blockchain.getAccount(Name.from("eospropvotes"))
// console.log("Permissions:", JSON.stringify(accountInfo.permissions, null, 2))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
await sleep(1)
const contracts = { referendums, proposals, token }
/**
 * @typedef {keyof typeof contracts} ContractName
 */
/**
 * Executes an action on a contract.
 * @param {ContractName} contractName - The name of the contract.
 * @param {string} actionName - The action to call.
 * @param {object} data - The action data.
 * @param {string} [auth] - Authorization string.
 * @returns {Promise<any>} - The action's result.
 */
export async function act(contractName, actionName, data, auth) {
  if (!auth) auth = contractName + "@active"
  return contracts[contractName].actions[actionName](data).send(auth)
}
export async function prop(actionName, data, auth) {
  // console.log("prop", actionName, data, auth)
  return act("proposals", actionName, data, auth)
}
export async function propertiesT() {}
export async function ref(actionName, data, auth) {
  // console.log("ref", actionName, data, auth)
  return act("referendums", actionName, data, auth)
}
export async function tok(actionName, data, auth = "eosio.token@active") {
  // console.log("tok", actionName, data, auth)
  return act("token", actionName, data, auth)
}

/**
 * Sets the phases configuration on the proposals contract.
 * @param {object} config - Phases configuration object.
 * @param {string} auth - Authorization string.
 */
export async function setPhases(config, auth) {
  for (const [type, phases] of Object.entries(config)) {
    const formattedPhases = phases.map((phase) => ({
      phase_name: phase.phaseName,
      duration_days: phase.durationDays,
      type: phase.type,
    }))

    await prop("setpconfig", { type, default_phases: formattedPhases }, auth)
  }
}

/**
 * Sets the general configuration on the proposals contract.
 * @param {object} config - General configuration object.
 * @param {string} auth - Authorization string.
 */
export async function setGeneralConfig(config, auth) {
  for (const scope of Object.keys(config)) {
    const constants = config[scope]
    for (const [setting, value] of Object.entries(constants)) {
      await prop("setgparam", { scope, setting, value }, auth)
    }
  }
}

/**
 * Applies the configuration to the proposals contract.
 * @param {"phases"|"general"} type - The type of configuration.
 * @param {object} config - Configuration data.
 * @param {string} auth - Authorization string.
 */
export async function applyPropConfig(type, config, auth = "proposals@active") {
  if (type === "phases") {
    await setPhases(config, auth)
  } else if (type === "general") {
    await setGeneralConfig(config, auth)
  } else {
    throw new Error("Invalid configuration type")
  }
}

export const proposalUtil = {
  getConfig(scope, setting) {
    const row = proposals.tables.config(nameToBigInt(scope)).getTableRow(nameToBigInt(setting))
    return row.value
  },
}
