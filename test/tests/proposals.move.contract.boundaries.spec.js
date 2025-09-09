import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"

describe("Proposals move by contract at exact boundaries", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("contract can move at boundaries across discussion→debate and debate→prevote", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "ContractMove"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id

    // Exactly 7d for discussion
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup1" })
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    let row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("debate")

    // Exactly 7d for debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup2" })
    await prop("move", { proposal_id: id }, "prop.bitcash@active")
    row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("prevote")
  })
})
