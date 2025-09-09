import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"

describe("Referendums start twice guard", () => {
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

  it("second start fails when already started", async () => {
    // seed a balance so creator exists in token tables
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
    // contract can start before start_date
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    // second start should fail
    let threw = false
    try {
      await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in created")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
