import { blockchain, ref, referendums, tok } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow, nameToBigInt } from "@eosnetwork/vert"
import { TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums clearvote auth and notfound", () => {
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

  it("rejects wrong auth and notfound vote", async () => {
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
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`)

    // wrong auth (substring match to allow account suffix)
    try {
      await ref("clearvote", { referendum_id: 1, voter: Accounts.defaultCreator }, `${Accounts.proposals}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("missing required authority")) throw e
    }

    // finish then clearvote OK, and second clearvote should fail notfound
    // satisfy guard
    blockchain.addTime(TimePointSec.from(24 * 3600 + 1))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await ref("clearvote", { referendum_id: 1, voter: Accounts.defaultCreator }, `${Accounts.defaultCreator}@active`)
    const votes = referendums.tables.votes(1n).getTableRows()
    expect(votes.length).to.equal(0)
    try {
      await ref("clearvote", { referendum_id: 1, voter: Accounts.defaultCreator }, `${Accounts.defaultCreator}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("vote not found")) throw e
    }
  })
})
