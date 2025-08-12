import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"

describe("Referendums hold wrong status", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("hold fails unless status is started", async () => {
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
    // hold in created fails
    let threw = false
    try {
      await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in started")) throw e
    }
    if (!threw) throw new Error("should fail")

    // start then hold succeeds
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
  })
})
