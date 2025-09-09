import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"

describe("Proposals cancel phase guard", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("cancel rejected outside discussion phase", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    const deadline = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "C1"] },
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

    // Move to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    await prop("move", { proposal_id: id }, `${creator}@active`)

    // Cancel should fail outside discussion
    try {
      await prop("cancel", { proposal_id: id }, `${creator}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("can not modify proposal, it is not in discussion phase")) throw e
    }
  })
})
