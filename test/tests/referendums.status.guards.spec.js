import { blockchain, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"

describe("Referendums status guards", () => {
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

  it("hold fails when not started; resume fails when not on hold; finish fails when not started", async () => {
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

    // hold before start
    try {
      await ref("hold", { referendum_id: 1 }, `${Accounts.referendums}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("not in started status")) throw e
    }

    // start then resume without hold
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    try {
      await ref("resume", { referendum_id: 1 }, `${Accounts.referendums}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("not in hold status")) throw e
    }

    // New ref to test finish status guard without start
    const w2 = futureWindowFromChain(2, 5)
    await ref(
      "create",
      {
        referendum_id: 2,
        creator: Accounts.defaultCreator,
        start_date: w2.start,
        end_date: w2.end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    // jump to just after start+24h to bypass time guards
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(w2.start) - nowMs) / 1000)) + 24 * 3600 + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    try {
      await ref("finish", { referendum_id: 2 }, `${Accounts.referendums}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("not in started status")) throw e
    }
  })
})
