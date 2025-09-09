import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { expect } from "chai"

describe("Proposals phase timing rules", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("move before duration elapses fails; after duration succeeds", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Timing"] },
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

    // Too soon
    await expectToThrow(prop("move", { proposal_id: id }, creator), "eosio_assert: phase is not ready to end")

    // After duration
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: id }, creator)
    rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(rows[0].current_phase).to.equal("debate")
  })
})
