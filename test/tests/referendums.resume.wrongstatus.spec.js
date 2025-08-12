import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums resume wrong status", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("resume fails unless status is hold", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: Accounts.defaultCreator,
        start_date: "2099-01-02T00:00:00.000",
        end_date: "2099-01-05T00:00:00.000",
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    // resume in created fails
    let threw = false
    try {
      await ref("resume", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in hold")) throw e
    }
    if (!threw) throw new Error("should fail")

    // start then resume fails (not hold)
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    threw = false
    try {
      await ref("resume", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in hold")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
