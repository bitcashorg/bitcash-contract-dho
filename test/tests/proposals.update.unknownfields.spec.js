import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"

describe("Proposals update ignores unknown fields", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("unknown fields in update do not break and are ignored", async () => {
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

    await prop(
      "update",
      {
        args: [
          { first: "proposal_id", second: ["int64", id] },
          { first: "unknown1", second: ["string", "x"] },
          { first: "unknown2", second: ["int64", 5] },
        ],
      },
      `${creator}@active`,
    )
    // Nothing should change; record still exists
    const row = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()[0]
    if (!row || row.proposal_id !== id) throw new Error("update with unknowns should not delete or error")
  })
})
