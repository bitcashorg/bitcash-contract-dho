import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"

describe("Referendums start wrong status guards", () => {
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

  it("start fails in hold/started/finished statuses", async () => {
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
    // Start once
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    // Start again fails (already started)
    let threw = false
    try {
      await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in created")) throw e
    }
    if (!threw) throw new Error("should fail")

    // Put on hold
    await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    threw = false
    try {
      await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in created")) throw e
    }
    if (!threw) throw new Error("should fail")

    // Resume and jump to end and finish
    await ref("resume", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const secs = Math.ceil((Date.parse(end) - blockchain.timestamp.toMilliseconds()) / 1000) + 1
    blockchain.addTime(TimePointSec.from(secs))
    await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)
    // Start after finished fails
    threw = false
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
