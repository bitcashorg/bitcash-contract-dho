import { blockchain, ref, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums finish guard", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  async function makeRef({ start, end }) {
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
  }

  it("rejects contract-led finish before 24h, succeeds after", async () => {
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await makeRef({ start, end })
    // immediately after start, contract-led finish must fail (< 24h)
    try {
      await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
      throw new Error("should fail")
    } catch (e) {
      const msg = String(e)
      if (!msg.includes("referendum must run for at least 24 hours")) throw e
    }
    // Advance to start + 24h + 1s to satisfy guard
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 24 * 3600 + 1
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    const row = (await referendums.tables.referendums(nameToBigInt(Accounts.referendums)).getTableRows())[0]
    expect(["accepted", "rejected"]).to.include(row.status)
  })
})
