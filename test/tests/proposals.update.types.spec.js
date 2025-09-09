import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals update type validation", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects update with wrong deadline type", async () => {
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
          { first: "title", second: ["string", "U"] },
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

    try {
      await prop(
        "update",
        {
          args: [
            { first: "proposal_id", second: ["int64", id] },
            { first: "deadline", second: ["string", "notadate"] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("type mismatch") && !msg.includes("attribute deadline type mismatch")) throw e
    }
  })
})
