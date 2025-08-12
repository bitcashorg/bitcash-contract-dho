import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"

describe("Referendums parameter bounds", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  const futureWindowFromChain = (daysStart, daysEnd) => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    return {
      start: new Date(baseMs + daysStart * 24 * 3600 * 1000).toISOString().replace("Z", ""),
      end: new Date(baseMs + daysEnd * 24 * 3600 * 1000).toISOString().replace("Z", ""),
    }
  }

  it("rejects wrong quorum symbol", async () => {
    const { start, end } = futureWindowFromChain(2, 5)
    try {
      await ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: end,
          quorum: "0.0000 SYS",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("quorum symbol must be")) throw e
    }
  })

  it("rejects duration < 1 day and > 30 days", async () => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const endTooShort = new Date(baseMs + 2 * 24 * 3600 * 1000 + 3600 * 1000).toISOString().replace("Z", "")
    const endTooLong = new Date(baseMs + 34 * 24 * 3600 * 1000).toISOString().replace("Z", "")

    await expectToThrow(
      ref(
        "create",
        {
          referendum_id: 2,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: endTooShort,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      ),
      "eosio_assert: referendum duration must be between 1 and 30 days",
    )

    await expectToThrow(
      ref(
        "create",
        {
          referendum_id: 3,
          creator: Accounts.defaultCreator,
          start_date: start,
          end_date: endTooLong,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      ),
      "eosio_assert: referendum duration must be between 1 and 30 days",
    )
  })
})
