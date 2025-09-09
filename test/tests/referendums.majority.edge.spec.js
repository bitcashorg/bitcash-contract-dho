import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums majority edge cases", () => {
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

  async function makeAndStart(id) {
    const { start, end } = futureWindowFromChain(2, 5)
    await ref(
      "create",
      {
        referendum_id: id,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }], // 50%
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: id }, `${Accounts.referendums}@active`)
    // advance just after start then +24h for contract finish later
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 3600
    blockchain.addTime(TimePointSec.from(secToStart + 24 * 3600))
  }

  it("all abstain → majority fails", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    await makeAndStart(1)
    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "abstain" }, `${Accounts.defaultCreator}@active`)
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(row.status).to.equal("rejected")
  })

  it("50/50 split with 50% threshold passes", async () => {
    await tok("transfer", { from: Accounts.token, to: "alice", quantity: "1.0000 IMPACT", memo: "" })
    await tok("transfer", { from: Accounts.token, to: "bob", quantity: "1.0000 IMPACT", memo: "" })
    await makeAndStart(2)
    await ref("vote", { referendum_id: 2, voter: "alice", option: "yes" }, `alice@active`)
    await ref("vote", { referendum_id: 2, voter: "bob", option: "no" }, `bob@active`)
    await ref("finish", { referendum_id: 2 }, `${Accounts.referendums}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(row.status).to.equal("accepted")
  })
})
