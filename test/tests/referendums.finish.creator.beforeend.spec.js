import { blockchain, ref, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"
import { TimePointSec } from "@greymass/eosio"

describe("Referendums finish by creator before end is rejected", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("creator cannot finish before end_date", async () => {
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
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    let threw = false
    try {
      await ref("finish", { referendum_id: 1 }, `${Accounts.defaultCreator}@active`)
    } catch (e) {
      threw = true
      if (!String(e).includes("can not finish referendum, it is too soon")) throw e
    }
    if (!threw) throw new Error("should fail")
  })
})
