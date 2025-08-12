import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { Accounts } from "../testConfig.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt } from "@eosnetwork/vert"
import { expect } from "chai"

describe("Referendums re-tally flips outcome after balance change", () => {
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

  it("yes vote then transfer away tokens -> finish counts zero for that voter", async () => {
    // seed alice with 1 IMPACT; bob gets none
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
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    // move just after start and vote yes
    const nowMs = blockchain.timestamp.toMilliseconds()
    const toStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(toStart))
    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`)
    // transfer tokens away so balance becomes 0
    await tok("transfer", { from: Accounts.defaultCreator, to: Accounts.token, quantity: "1.0000 IMPACT", memo: "" }, `${Accounts.defaultCreator}@active`)
    // advance beyond end; finish should re-tally with zero weight for alice
    const afterMs = blockchain.timestamp.toMilliseconds()
    const toEnd = Math.max(0, Math.ceil((Date.parse(end) - afterMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(toEnd))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(row.votes_favour).to.equal("0.0000 IMPACT")
  })
})
