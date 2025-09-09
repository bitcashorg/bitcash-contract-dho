import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"

describe("Proposals move boundaries", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const createMain = async (creator) => {
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Boundary"] },
          { first: "description", second: ["string", "desc"] },
          { first: "kpi", second: ["string", "kpi"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    return proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
  }

  it("move fails just-before boundary and succeeds at boundary", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const id = await createMain(creator)

    // discussion is 7 days; try at 7d - 1s
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 - 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    try {
      await prop("move", { proposal_id: id }, `${creator}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("phase is not ready to end")) throw e
    }

    // now at 7d exactly
    blockchain.addTime(TimePointSec.from(1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup2" })
    await prop("move", { proposal_id: id }, `${creator}@active`)
    let row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("debate")

    // debate 7d boundary
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 - 1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup3" })
    try {
      await prop("move", { proposal_id: id }, `${creator}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("phase is not ready to end")) throw e
    }
    blockchain.addTime(TimePointSec.from(1))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup4" })
    await prop("move", { proposal_id: id }, `${creator}@active`)
    row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    expect(row.current_phase).to.equal("prevote")
  })
})
