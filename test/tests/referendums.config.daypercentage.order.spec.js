import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums day_percentage order validations", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects non-increasing start_day or non-decreasing percentage", async () => {
    const base = {
      referendum_id: 1,
      creator: Accounts.defaultCreator,
      start_date: "2099-01-02T00:00:00.000",
      end_date: "2099-01-05T00:00:00.000",
      quorum: "0.0000 IMPACT",
    }
    // non-increasing start_day
    let threw = false
    try {
      await ref(
        "create",
        {
          ...base,
          quorum_config: [
            { start_day: 1, percentage: 0 },
            { start_day: 1, percentage: 0 },
          ],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
    } catch (e) {
      threw = true
      if (!String(e).includes("start dates must be in increasing order")) throw e
    }
    if (!threw) throw new Error("should fail")

    // non-decreasing percentage
    threw = false
    try {
      await ref(
        "create",
        {
          ...base,
          quorum_config: [
            { start_day: 0, percentage: 10 },
            { start_day: 1, percentage: 20 },
          ],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
    } catch (e) {
      threw = true
      if (!String(e).includes("percentages must be in decreasing order")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
