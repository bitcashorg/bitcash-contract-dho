import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"
import { TimePointSec } from "@greymass/eosio"

describe("Referendums finish wrong status", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("finish fails unless status is started", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
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
    // finish in created fails (advance beyond end so time guard passes)
    let threw = false
    try {
      const nowMs = blockchain.timestamp.toMilliseconds()
      const toEnd = Math.max(0, Math.ceil((Date.parse(end) - nowMs) / 1000)) + 1
      blockchain.addTime(TimePointSec.from(toEnd))
      await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in started") && !msg.includes("can not hold referendum")) throw e
    }
    if (!threw) throw new Error("should fail")

    // start then hold; finish fails in hold
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    threw = false
    try {
      // advance 24h from start to satisfy contract guard
      const to24h = 24 * 3600 + 1
      blockchain.addTime(TimePointSec.from(to24h))
      await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    } catch (e) {
      threw = true
      const msg = String(e)
      if (!msg.includes("not in started") && !msg.includes("can not hold referendum")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
