import { blockchain, prop, proposals, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"

describe("Proposals update deadline boundary", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects deadline <= now; accepts future boundary", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })
    const deadline = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "D"] },
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

    // Reject past (<= now): build past relative to chain time
    const chainNow = blockchain.timestamp.toMilliseconds()
    const past = new Date(chainNow - 1000).toISOString().replace("Z", "")
    let threw = false
    try {
      await prop(
        "update",
        {
          args: [
            { first: "proposal_id", second: ["int64", id] },
            { first: "deadline", second: ["time_point", past] },
          ],
        },
        `${creator}@active`,
      )
    } catch (e) {
      threw = true
      if (!String(e).includes("deadline must be in the future")) throw e
    }
    if (!threw) throw new Error("should fail")

    // Accept slightly future (> now)
    const nearFuture = new Date(blockchain.timestamp.toMilliseconds() + 1000).toISOString().replace("Z", "")
    await prop(
      "update",
      {
        args: [
          { first: "proposal_id", second: ["int64", id] },
          { first: "deadline", second: ["time_point", nearFuture] },
        ],
      },
      `${creator}@active`,
    )
  })
})
