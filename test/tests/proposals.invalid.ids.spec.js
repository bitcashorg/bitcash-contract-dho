import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"

describe("Proposals invalid ids", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("move/update/cancel with unknown id fails", async () => {
    const bad = 9999
    const calls = [() => prop("move", { proposal_id: bad }, "prop.bitcash@active"), () => prop("update", { args: [{ first: "proposal_id", second: ["int64", bad] }] }, "prop.bitcash@active"), () => prop("cancel", { proposal_id: bad }, "prop.bitcash@active")]
    for (const c of calls) {
      let threw = false
      try {
        await c()
      } catch (e) {
        threw = true
        const msg = String(e)
        if (!msg.includes("was not found") && !msg.includes("proposal not found")) throw e
      }
      if (!threw) throw new Error("should fail")
    }
  })
})
