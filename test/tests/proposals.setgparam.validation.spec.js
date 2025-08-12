import { blockchain, prop } from "../util.js"
import { initContracts } from "../setup.js"

describe("Proposals setgparam validation (types)", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("stores values as-is; type enforcement happens at read-time in actions", async () => {
    await prop("setgparam", { scope: "main", setting: "quorum", value: ["int64", 1] }, "prop.bitcash@active")
    await prop("setgparam", { scope: "main", setting: "votethresh", value: ["asset", "1.0000 IMPACT"] }, "prop.bitcash@active")
  })
})
