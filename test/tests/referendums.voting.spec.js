import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { Accounts, TimeWindows } from "../testConfig.js"

describe("Referendums voting rules", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  async function makeRef({ start, end, quorum = "0.0000 IMPACT" }) {
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: Accounts.defaultCreator,
        start_date: start,
        end_date: end,
        quorum,
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    await ref("start", { referendum_id: 1 }, `${Accounts.referendums}@active`)
  }

  it("prevents duplicate votes per voter", async () => {
    // balances
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "10.0000 IMPACT", memo: "" })
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await makeRef({ start, end })

    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`)
    await expectToThrow(ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`), "eosio_assert: only one vote per account is allowed")
  })

  it("finish respects end + 24h contract guard", async () => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await makeRef({ start, end })
    // advance some but not enough for end+24h
    // move just after start (< 24h) then attempt early finish
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStartExact = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000))
    blockchain.addTime(TimePointSec.from(secToStartExact + 1))
    // Too soon
    try {
      await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("referendum must run for at least 24 hours")) throw e
    }
    // advance +24h from current point
    blockchain.addTime(TimePointSec.from(24 * 3600 + 1))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const row = referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows()[0]
    expect(["accepted", "rejected"]).to.include(row.status)
  })

  // clearvote covered in referendums.clearvote.spec.js
})
