import { blockchain, prop, proposals, tok, proposalUtil } from "../util.js"
import { initContracts } from "../setup.js"

describe("Proposals input type safety", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("wrong attribute types are rejected with clear messages", async () => {
    const creator = "alice"
    const minStake = proposalUtil.getConfig("main", "minstake")[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "" })

    // deadline wrong type
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "Types"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["string", "notadate"] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("attribute deadline type mismatch") && !msg.includes("type mismatch")) throw e
    }

    // parent wrong type
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "main"] },
            { first: "creator", second: ["name", creator] },
            { first: "title", second: ["string", "Types"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["name", "oops"] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        `${creator}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("attribute parent type mismatch") && !msg.includes("type mismatch")) throw e
    }
  })
})
