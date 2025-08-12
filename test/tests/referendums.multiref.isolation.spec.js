import { blockchain, ref, referendums, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums: multi-referendum voter isolation", () => {
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

  it("votes for the same account in two referendums are kept separate", async () => {
    await tok("transfer", { from: Accounts.token, to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    const w1 = futureWindowFromChain(2, 5)
    const w2 = futureWindowFromChain(2, 5)
    for (let i = 1; i <= 2; i++) {
      const w = i === 1 ? w1 : w2
      await ref(
        "create",
        {
          referendum_id: i,
          creator: Accounts.defaultCreator,
          start_date: w.start,
          end_date: w.end,
          quorum: "0.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 0 }],
          majority_config: [{ start_day: 0, percentage: 5000 }],
        },
        `${Accounts.proposals}@active`,
      )
      await ref("start", { referendum_id: i }, `${Accounts.referendums}@active`)
    }
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(w1.start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("vote", { referendum_id: 1, voter: "alice", option: "yes" }, "alice@active")
    await ref("vote", { referendum_id: 2, voter: "alice", option: "no" }, "alice@active")

    const votes1 = referendums.tables.votes(1n).getTableRows()
    const votes2 = referendums.tables.votes(2n).getTableRows()
    expect(votes1.length).to.equal(1)
    expect(votes2.length).to.equal(1)
    expect(votes1[0].option).to.equal("yes")
    expect(votes2[0].option).to.equal("no")
  })
})
