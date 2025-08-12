import { blockchain, prop, proposals, ref, referendums, tok, token, proposalUtil } from "../util.js"
import { nameToBigInt } from "@eosnetwork/vert"
import { initContracts } from "../setup.js"
import { Name, TimePointSec } from "@greymass/eosio"
import { Accounts } from "../testConfig.js"
import { expect } from "chai"

describe("Referendums re-tally finish", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("recomputes tallies using current balances at finish", async () => {
    // Arrange balances
    await tok("transfer", { from: "eosio.token", to: "alice", quantity: "100.0000 IMPACT", memo: "" })
    await tok("transfer", { from: "eosio.token", to: "bob", quantity: "50.0000 IMPACT", memo: "" })

    // Create a referendum directly (authorized by proposals contract)
    const creator = "alice"
    const advance = async (seconds) => blockchain.addTime(TimePointSec.from(seconds))
    // Use dynamic future window relative to chain time
    const baseMs = blockchain.timestamp.toMilliseconds()
    const startStr = new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    const endStr = new Date(baseMs + 5 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await ref(
      "create",
      {
        referendum_id: 1,
        creator,
        start_date: startStr,
        end_date: endStr,
        quorum: "10.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      `${Accounts.proposals}@active`,
    )
    const referendumId = 1

    // Start the referendum so votes are accepted
    await ref("start", { referendum_id: referendumId }, `${Accounts.referendums}@active`)
    // Advance to just after start + 24h
    const nowMs = blockchain.timestamp.toMilliseconds()
    const secToStart = Math.max(0, Math.ceil((Date.parse(startStr) - nowMs) / 1000)) + 24 * 3600 + 1
    await advance(secToStart)

    // Cast votes: alice yes, bob no
    await ref("vote", { referendum_id: referendumId, voter: "alice", option: "yes" }, "alice@active")
    await ref("vote", { referendum_id: referendumId, voter: "bob", option: "no" }, "bob@active")

    // Move tokens after voting: alice transfers out all to bob
    await tok("transfer", { from: "alice", to: "bob", quantity: "100.0000 IMPACT", memo: "move" }, "alice@active")

    // Advance to after referendum end and finish
    // Advance past end and 24h minimum contract finish guard
    await advance(10 * 24 * 3600)
    await ref("finish", { referendum_id: referendumId }, "refe.bitcash@active")

    // Assert: final tallies reflect current balances (alice 0, bob 150, abstain 0)
    const refAfter = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()[0]
    const fav = refAfter.votes_favour.split(" ")[0]
    const ag = refAfter.votes_against.split(" ")[0]
    expect(fav).to.equal("0.0000")
    expect(ag).to.equal("150.0000")
  })
})
