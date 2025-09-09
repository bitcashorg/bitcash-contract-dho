import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals cancel wrong auth", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("cancel fails when not signed by creator", async () => {
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
          { first: "title", second: ["string", "X"] },
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

    let threw = false
    try {
      await prop("cancel", { proposal_id: id }, `bob@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("missing required authority") && !msg.includes("missing authority")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
