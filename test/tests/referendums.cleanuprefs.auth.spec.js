import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"

describe("Referendums cleanuprefs requires contract auth", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects wrong auth", async () => {
    let threw = false
    try {
      await ref("cleanuprefs", { max_rows: 1 }, "prop.bitcash@active")
    } catch (e) {
      threw = true
    }
    if (!threw) throw new Error("should fail")
  })
})
