import { blockchain, ref, tok, referendums } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { nameToBigInt, expectToThrow } from "@eosnetwork/vert"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums clearvote rules", () => {
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

  it("only allows clearvote after finish", async () => {
    await tok("transfer", { from: Accounts.token, to: Accounts.defaultCreator, quantity: "1.0000 IMPACT", memo: "" })
    // Create a future window relative to chain time
    const baseMs = blockchain.timestamp.toMilliseconds()
    const start = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const end = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await makeRef({ start, end })
    // advance just after start and later to satisfy 24h guard
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(start) - nowMs) / 1000)) + 3600
    blockchain.addTime(TimePointSec.from(secToStart))
    await ref("vote", { referendum_id: 1, voter: Accounts.defaultCreator, option: "yes" }, `${Accounts.defaultCreator}@active`)

    await expectToThrow(ref("clearvote", { referendum_id: 1, voter: Accounts.defaultCreator }, `${Accounts.defaultCreator}@active`), "eosio_assert: can only clear vote after referendum is finished")

    // push further to satisfy 24h contract guard from start
    blockchain.addTime(TimePointSec.from(24 * 3600 + 1))
    await ref("finish", { referendum_id: 1 }, `${Accounts.referendums}@active`)
    await ref("clearvote", { referendum_id: 1, voter: Accounts.defaultCreator }, `${Accounts.defaultCreator}@active`)
    const votes = referendums.tables.votes(nameToBigInt("1")).getTableRows()
    expect(votes.length).to.equal(0)
  })
})
