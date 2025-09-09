import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"

describe("Proposals unknown type", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects create with unknown proposal type", async () => {
    try {
      await prop(
        "create",
        {
          args: [
            { first: "type", second: ["name", "doesnotexist"] },
            { first: "creator", second: ["name", "alice"] },
            { first: "title", second: ["string", "UnknownType"] },
            { first: "description", second: ["string", "desc"] },
            { first: "kpi", second: ["string", "kpi"] },
            { first: "deadline", second: ["time_point", new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().replace("Z", "")] },
            { first: "parent", second: ["int64", 0] },
            { first: "budget", second: ["asset", "0.0000 IMPACT"] },
          ],
        },
        "alice@active",
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("Unknown proposal type doesnotexist")) throw e
    }
  })
})
