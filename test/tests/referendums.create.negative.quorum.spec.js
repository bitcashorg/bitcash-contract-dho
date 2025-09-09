import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums create rejects negative quorum", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("negative quorum fails", async () => {
    const start = "2099-01-02T00:00:00.000"
    const end = "2099-01-05T00:00:00.000"
    let threw = false
    try {
      await ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "-1.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("quorum must be non-negative")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
