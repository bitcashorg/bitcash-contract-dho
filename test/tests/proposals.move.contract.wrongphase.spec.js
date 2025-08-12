import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals move by contract before boundary fails", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("contract move just-before discussion→debate boundary is rejected", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "MoveGuard"] },
          { first: "description", second: ["string", "d"] },
          { first: "kpi", second: ["string", "k"] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      `${creator}@active`,
    )
    const id = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0].proposal_id
    // advance to just before 7 days
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600 - 1))
    let threw = false
    try {
      await prop("move", { proposal_id: id }, "prop.bitcash@active")
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("phase is not ready to end")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
