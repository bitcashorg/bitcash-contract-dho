import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"

describe("Referendums config validation", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects invalid day_percentage arrays", async () => {
    const start = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")

    // non-increasing start_day
    try {
      await ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "0.0000 IMPACT",
          quorum_config: [
            { start_day: 0, percentage: 9000 },
            { start_day: 0, percentage: 8000 },
          ],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("quorum config start dates must be in increasing order")) throw e
    }

    // non-decreasing percentage
    try {
      await ref(
        "create",
        {
          referendum_id: 2,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "0.0000 IMPACT",
          quorum_config: [
            { start_day: 0, percentage: 7000 },
            { start_day: 1, percentage: 9000 },
          ],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("percentages must be in decreasing order")) throw e
    }

    // percentage > 10000
    try {
      await ref(
        "create",
        {
          referendum_id: 3,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 11000 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("percentage must be <= 10000")) throw e
    }
  })
})
