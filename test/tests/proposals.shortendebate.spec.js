import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ShortenDebate affects parent duration", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("acceptance decreases parent debate duration by N days (not below 1)", async () => {
    const creator = "alice"
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "stake" })

    // create main
    const deadline = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "main"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Main"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", 0] },
          { first: "budget", second: ["asset", "0.0000 IMPACT"] },
        ],
      },
      creator,
    )

    // move main to debate
    blockchain.addTime(TimePointSec.from(7 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "topup" })
    let pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parentId = pRows[0].proposal_id
    await prop("move", { proposal_id: parentId }, creator)
    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    expect(pRows[0].current_phase).to.equal("debate")
    const phases = pRows[0].phases
    const currentIndex = phases.findIndex((ph) => ph.phase === pRows[0].current_phase)
    const initialDebateDays = phases[currentIndex].duration_days

    // lower quorum for shortndebate
    await prop("setgparam", { scope: "shortndebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create shortndebate child with -2 days
    const reduceDays = 2
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "shortndebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Shorten"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "days", second: ["int64", reduceDays] },
        ],
      },
      creator,
    )

    // locate child id
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== parentId).proposal_id

    // move child from debate to voting, then finish
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup-debate" })
    await prop("move", { proposal_id: childId }, creator)
    // vote yes
    let refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, "alice@active")
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")
    // end child voting phase
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup-end" })
    await prop("move", { proposal_id: childId }, creator)

    // verify parent debate duration decreased (but not below 1)
    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parent = pRows.find((r) => r.proposal_id === parentId)
    const newDebateDays = parent.phases[currentIndex].duration_days
    expect(newDebateDays).to.equal(Math.max(1, initialDebateDays - reduceDays))
  })
})
