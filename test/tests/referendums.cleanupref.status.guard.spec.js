import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"
import { TimePointSec } from "@greymass/eosio"

describe("Referendums cleanupref status guard", () => {
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

  it("fails in created and started statuses", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    const { start, end } = futureWindowFromChain(2, 5)
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
    // created status
    let threw = false
    try {
      await ref("cleanupref", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("can only cleanup after referendum is finished")) throw e
    }
    if (!threw) throw new Error("should fail")

    // started status
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    threw = false
    try {
      await ref("cleanupref", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("can only cleanup after referendum is finished")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
