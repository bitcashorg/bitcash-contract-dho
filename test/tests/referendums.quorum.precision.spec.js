import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"

describe("Referendums quorum precision bounds", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects quorum precision > 18", async () => {
    try {
      await ref(
        "create",
        {
          referendum_id: 1,
          creator: Accounts.defaultCreator,
          start_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().replace("Z", ""),
          end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().replace("Z", ""),
          quorum: "0.0000000000000000001 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      // Encoder or contract may throw; accept either
      if (!msg.includes("precision too large") && !msg.includes("precision must be 18 or less")) throw e
    }
  })
})
