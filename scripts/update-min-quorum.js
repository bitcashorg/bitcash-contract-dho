require("dotenv").config();

const { transact } = require("./eos");
const { contractNames } = require("./config");

const { proposals } = contractNames;

async function main() {
  const scopes = [
    "main",
    "amendment",
    "changetime",
    "extenddebate",
    "shortndebate",
  ];

  const minstake = process.argv[2] || process.env.MINSTAKE || "1.0000 IMPACT";
  const quorum = process.argv[3] || process.env.QUORUM || "1000.0000 IMPACT";

  console.log(`Setting parameters on ${proposals}`);
  console.log(`  minstake = ${minstake}`);
  console.log(`  quorum   = ${quorum}`);

  const actions = [];
  for (const scope of scopes) {
    actions.push({
      account: proposals,
      name: "setgparam",
      authorization: [{ actor: proposals, permission: "active" }],
      data: { scope, setting: "minstake", value: ["asset", minstake] },
    });
    actions.push({
      account: proposals,
      name: "setgparam",
      authorization: [{ actor: proposals, permission: "active" }],
      data: { scope, setting: "quorum", value: ["asset", quorum] },
    });
  }

  await transact({ actions });
  console.log("✓ Updated minstake and quorum across all scopes");
}

main().catch((e) => {
  console.error("Failed to update parameters:", e && e.message ? e.message : e);
  process.exit(1);
});
