import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums create symbol/precision matrix", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const base = {
    referendum_id: 1,
    creator: Accounts.defaultCreator,
    start_date: "2099-01-02T00:00:00.000",
    end_date: "2099-01-05T00:00:00.000",
    quorum_config: [{ start_day: 0, percentage: 0 }],
    majority_config: [{ start_day: 0, percentage: 5000 }],
  }

  it("rejects wrong symbol and precision > 18", async () => {
    // wrong symbol
    try {
      await ref("create", { ...base, quorum: "0.0000 OTHER" }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      if (!String(e).includes("quorum symbol must be")) throw e
    }
    // precision > 18
    try {
      await ref("create", { ...base, quorum: "0.0000000000000000001 IMPACT" }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("precision must be 18 or less") && !msg.includes("precision too large")) throw e
    }
  })
})
