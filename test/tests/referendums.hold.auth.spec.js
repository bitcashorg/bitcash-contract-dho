import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums hold/resume auth requirements", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("hold and resume require refe.bitcash auth", async () => {
    const start = "2099-01-02T00:00:00.000"
    const end = "2099-01-05T00:00:00.000"
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    let threw = false
    try {
      await ref("hold", { referendum_id: 1 }, `${Accounts.proposals}@active`)
    } catch (e) {
      threw = true
    }
    if (!threw) throw new Error("should fail")

    threw = false
    try {
      await ref("resume", { referendum_id: 1 }, `${Accounts.proposals}@active`)
    } catch (e) {
      threw = true
    }
    if (!threw) throw new Error("should fail")
  })
})
