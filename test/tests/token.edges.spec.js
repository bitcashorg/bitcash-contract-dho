import { blockchain, tok, ref } from "../util.js"
import { initContracts } from "../setup.js"
import { expectToThrow } from "@eosnetwork/vert"

describe("Token edges for voting", () => {
  beforeEach(async () => {
    blockchain.resetTables()
    await initContracts()
  })

  it("rejects vote when voter has zero balance", async () => {
    await ref(
      "create",
      {
        referendum_id: 1,
        creator: "alice",
        start_date: "2050-01-02T00:00:00.000",
        end_date: "2050-01-04T00:00:00.000",
        quorum: "0.0000 IMPACT",
        quorum_config: [{ start_day: 0, percentage: 0 }],
        majority_config: [{ start_day: 0, percentage: 5000 }],
      },
      "prop.bitcash@active",
    )
    await ref("start", { referendum_id: 1 }, "refe.bitcash@active")

    await expectToThrow(ref("vote", { referendum_id: 1, voter: "dave", option: "yes" }, "dave@active"), "eosio_assert_message: voter does not have IMPACT")
    // zero-quantity transfer is rejected by token contract; instead confirm that with a tiny positive amount vote will succeed
    await tok("transfer", { from: "eosio.token", to: "dave", quantity: "0.0001 IMPACT", memo: "" })
    await ref("vote", { referendum_id: 1, voter: "dave", option: "yes" }, "dave@active")
  })
})
