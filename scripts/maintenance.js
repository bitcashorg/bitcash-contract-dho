const { transact } = require("./eos");
const { contractNames } = require("./config");

const { proposals, referendums } = contractNames;

async function resetReferendums() {
  console.log(`Resetting referendums on ${referendums} ...`);
  await transact({
    actions: [
      {
        account: referendums,
        name: "reset",
        authorization: [{ actor: referendums, permission: "active" }],
        data: {},
      },
    ],
  });
  console.log("✓ referendums.reset completed");
}

async function cleanupRefs(max = 1000) {
  console.log(`Cleaning up referendums in batches on ${referendums} ...`);
  await transact({
    actions: [
      {
        account: referendums,
        name: "cleanuprefs",
        authorization: [{ actor: referendums, permission: "active" }],
        data: { max_rows: max },
      },
    ],
  });
  console.log("✓ referendums.cleanuprefs completed");
}

async function resetProposals() {
  console.log(`Resetting proposals on ${proposals} ...`);
  await transact({
    actions: [
      {
        account: proposals,
        name: "reset",
        authorization: [{ actor: proposals, permission: "active" }],
        data: {},
      },
    ],
  });
  console.log("✓ proposals.reset completed");
}

async function cleanupProps(max = 1000) {
  console.log(`Cleaning up proposals in batches on ${proposals} ...`);
  await transact({
    actions: [
      {
        account: proposals,
        name: "cleanupprops",
        authorization: [{ actor: proposals, permission: "active" }],
        data: { max_rows: max },
      },
    ],
  });
  console.log("✓ proposals.cleanupprops completed");
}

module.exports = {
  resetReferendums,
  cleanupRefs,
  resetProposals,
  cleanupProps,
};
