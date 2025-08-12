import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"

describe("Proposals auth rules", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("create requires creator auth; wrong auth fails", async () => {
    const creator = "alice"
    const other = "bob"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const params = {
      args: [
        { first: "type", second: ["name", "main"] },
        { first: "creator", second: ["name", creator] },
        { first: "title", second: ["string", "AuthTest"] },
        { first: "description", second: ["string", "desc"] },
        { first: "kpi", second: ["string", "kpi"] },
        { first: "deadline", second: ["time_point", deadline] },
        { first: "parent", second: ["int64", 0] },
        { first: "budget", second: ["asset", "0.0000 IMPACT"] },
      ],
    }
    await expectToThrow(prop("create", params, other), `missing required authority ${creator}`)
    await prop("create", params, creator)
  })

  it("update only by creator; other auth fails", async () => {
    const creator = "alice"
    const other = "bob"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "AuthTest"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      creator,
    )
    const rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const id = rows[0].proposal_id
    const newDeadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const updateParams = {
      args: [
        { first: "proposal_id", second: ["int64", id] },
        { first: "deadline", second: ["time_point", newDeadline] },
      ],
    }
    await expectToThrow(prop("update", updateParams, other), `missing required authority ${creator}`)
    await prop("update", updateParams, creator)
  })

  it("cancel only by creator; move allowed by creator or contract", async () => {
    const creator = "alice"
    const other = "bob"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "AuthTest"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      creator,
    )
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const id = rows[0].proposal_id
    await expectToThrow(prop("cancel", { proposal_id: id }, other), `missing required authority ${creator}`)
    // move by other should fail; by contract should pass
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await expectToThrow(prop("move", { proposal_id: id }, other), `missing required authority prop.bitcash`)
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
  })
})
