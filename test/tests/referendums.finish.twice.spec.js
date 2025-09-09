import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"

describe("Referendums finish twice guard", () => {
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

  it("second finish fails when already finished", async () => {
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
    // start then advance beyond end for creator finish
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    // advance past end
    const afterStartMs = blockchain.timestamp.toMilliseconds()
    const toEndSecs = Math.max(0, Math.ceil((Date.parse(end) - afterStartMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(toEndSecs))

    // first finish by creator succeeds
    await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)

    // second finish should fail
    let threw = false
    try {
      await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in started")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
