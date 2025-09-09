import { blockchain, prop, proposals, referendums, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { TimePointSec } from "@greymass/eosio"
import { expect } from "chai"
import { nameToBigInt } from "@eosnetwork/vert"

describe("ExtendDebate affects parent duration", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("acceptance increases parent debate duration by N days", async () => {
    const creator = "alice"
    // fund creator min stake
    const minStake = proposals.tables.config(nameToBigInt("main")).getTableRow(nameToBigInt("minstake")).value[1]
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "stake" })

    // create main
    const now = new Date()
    const deadline = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().replace("Z", "")
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
    // get current debate duration
    const phases = pRows[0].phases
    const currentIndex = phases.findIndex((ph) => ph.phase === pRows[0].current_phase)
    const initialDebateDays = phases[currentIndex].duration_days

    // lower quorum for extenddebate so vote passes
    await prop("setgparam", { scope: "extenddebate", setting: "quorum", value: ["asset", "0.0000 IMPACT"] }, "prop.bitcash@active")

    // create extenddebate child with +2 days
    const extendDays = 2
    await prop(
      "create",
      {
        args: [
          { first: "type", second: ["name", "extenddebate"] },
          { first: "creator", second: ["name", creator] },
          { first: "title", second: ["string", "Extend"] },
          { first: "description", second: ["string", ""] },
          { first: "kpi", second: ["string", ""] },
          { first: "deadline", second: ["time_point", deadline] },
          { first: "parent", second: ["int64", parentId] },
          { first: "days", second: ["int64", extendDays] },
        ],
      },
      creator,
    )

    // child id is second row
    let rows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const childId = rows.find((r) => r.proposal_id !== parentId).proposal_id

    // move child from debate to voting (create referendum)
    blockchain.addTime(TimePointSec.from(1 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup-debate" })
    await prop("move", { proposal_id: childId }, creator)

    // locate child's referendum id and cast a YES vote
    let refRows = referendums.tables.referendums(nameToBigInt("refe.bitcash")).getTableRows()
    const childRefId = refRows[refRows.length - 1].referendum_id
    await ref("vote", { referendum_id: childRefId, voter: creator, option: "yes" }, "alice@active")

    // elapse child voting well beyond duration and finish referendum
    blockchain.addTime(TimePointSec.from(10 * 24 * 3600))
    await ref("finish", { referendum_id: childRefId }, "refe.bitcash@active")

    // end child voting phase to trigger update_parent
    blockchain.addTime(TimePointSec.from(3 * 24 * 3600))
    await tok("transfer", { from: "eosio.token", to: creator, quantity: minStake, memo: "child-topup-end2" })
    await prop("move", { proposal_id: childId }, creator)

    // verify parent debate duration increased
    pRows = proposals.tables.proposals(nameToBigInt("prop.bitcash")).getTableRows()
    const parent = pRows.find((r) => r.proposal_id === parentId)
    const newDebateDays = parent.phases[currentIndex].duration_days
    expect(newDebateDays).to.equal(initialDebateDays + extendDays)
  })
})
