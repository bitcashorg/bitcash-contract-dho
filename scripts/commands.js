const {
  contracts,
  publicKeys,
  owner,
  chain,
  sleep,
  isLocalNode,
} = require("./config");
const { compileContract, updateConstants } = require("./compile");
const { createAccount, deployContract } = require("./deploy");
const { accountExists, contractRunningSameCode } = require("./eosio-errors");
const { updatePermissions } = require("./permissions");
const {
  setGlobalParameters,
  setPhasesConfiguration,
  showCurrentConfig,
  checkAccounts,
  showConfigFiles,
  setTestConfig,
  interactiveConfig,
  checkContractDeployment,
  checkTableCounts,
  runFullCheck,
  createTestProposals,
  createTestReferendums,
  createTestData,
} = require("./contract-settings");
const {
  resetReferendums,
  cleanupRefs,
  resetProposals,
  cleanupProps,
} = require("./maintenance");
const prompt = require("prompt-sync")();

async function manageDeployment(contract) {
  if (isLocalNode()) {
    console.log("create account:", contract.nameOnChain);
    try {
      await createAccount({
        account: contract.nameOnChain,
        publicKey: publicKeys.active,
        stakes: contract.stakes,
        creator: owner,
      });
    } catch (err) {
      accountExists(err);
    }
  } else {
    console.log("skip account creation (non-local chain)");
  }
  console.log("deploy contract for:", contract.nameOnChain);
  try {
    await deployContract(contract);
  } catch (err) {
    contractRunningSameCode(err);
  }
  console.log("done\n");
}

async function init() {
  await compile();

  // deploy contracts
  console.log("DEPLOYING CONTRACTS\n");

  for (const contract of contracts) {
    await manageDeployment(contract);
    await sleep(1000);
  }

  console.log("deployment finished\n\n");

  console.log("UPDATE PERMISSIONS\n");
  await updatePermissions();
  console.log("update permissions finished\n\n");

  console.log("SETTING CONTRACTS PARAMETERS\n");

  console.log("setting config");
  await setConfig();

  console.log("setting phases");
  await setPhases();

  console.log("setting parameters finished\n\n");
}

async function setParamsValue() {
  console.log("SETTING CONTRACTS PARAMETERS\n");
  // console.log('setting config')
  // await setConfig()

  console.log("setting phases");
  await setPhases();

  console.log("setting parameters finished\n\n");
}

async function run(contractName) {
  let contract = contracts.filter((c) => c.name == contractName);
  if (contract.length > 0) {
    contract = contract[0];
  } else {
    console.log("contract not found");
    return;
  }

  console.log(`Setting ${process.env.ENV_NAME} constants`);
  await updateConstants();

  await compileContract({
    contract: contract.name,
    path: `./src/${contract.name}.cpp`,
  });

  await manageDeployment(contract);
}

async function compile() {
  console.log(`Setting ${process.env.ENV_NAME} constants`);
  await updateConstants();

  // compile contracts
  console.log("COMPILING CONTRACTS\n");

  await Promise.all(
    contracts.map((contract) => {
      return compileContract({
        contract: contract.name,
        path: `./src/${contract.name}.cpp`,
      });
    })
  );

  console.log("compilation finished\n\n");
}

async function compile_contract(contractName) {
  let contract = contracts.filter((c) => c.name == contractName);
  if (contract.length > 0) {
    contract = contract[0];
  } else {
    console.log("contract not found");
    return;
  }

  await compileContract({
    contract: contract.name,
    path: `./src/${contract.name}.cpp`,
  });

  console.log("compilation finished\n\n");
}

async function main() {
  if (!isLocalNode()) {
    if (process.env.AUTO_YES === "1") {
      // proceed non-interactively
    } else {
      const option = prompt(
        `You are about to run a command on ${chain}, are you sure? [y/n] `
      );
      if (option.toLowerCase() !== "y") {
        return;
      }
    }
  }

  const args = process.argv.slice(2);

  switch (args[0]) {
    case "cleanup": {
      const sub = args[1];
      if (sub === "refs") {
        await resetReferendums();
      } else if (sub === "refs-batch") {
        const max = parseInt(args[2] || "1000", 10);
        await cleanupRefs(max);
      } else if (sub === "props") {
        await resetProposals();
      } else if (sub === "props-batch") {
        const max = parseInt(args[2] || "1000", 10);
        await cleanupProps(max);
      } else if (sub === "all") {
        await resetReferendums();
        if (args[2] === "--props") {
          await resetProposals();
        }
      } else {
        console.log("Cleanup options:");
        console.log("  cleanup refs           - call referendums.reset");
        console.log(
          "  cleanup refs-batch [N] - call referendums.cleanuprefs with max_rows=N"
        );
        console.log("  cleanup props          - call proposals.reset");
        console.log(
          "  cleanup props-batch N  - call proposals.cleanupprops with max_rows=N"
        );
        console.log(
          "  cleanup all [--props]  - reset referendums; optionally reset proposals"
        );
      }
      break;
    }

    case "init":
      await init();
      break;

    case "compile":
      if (args.length == 1) {
        await compile();
      } else {
        await compile_contract(args[1]);
      }
      break;

    case "run":
      await run(args[1]);
      break;

    case "set":
      if (args[1] == "params") {
        await setParamsValue();
      } else if (args[1] == "permissions") {
        await updatePermissions();
      }
      break;

    case "config":
      if (args[1] == "show") {
        await showCurrentConfig();
      } else if (args[1] == "files") {
        await showConfigFiles();
      } else if (args[1] == "test") {
        await setTestConfig();
      } else if (args[1] == "accounts") {
        await checkAccounts();
      } else if (args[1] == "interactive" || args.length == 1) {
        await interactiveConfig();
      } else {
        console.log("Config options: show, files, test, accounts, interactive");
      }
      break;

    case "check":
      const checkSubCommand = process.argv[3];
      if (checkSubCommand === "deployment") {
        await checkContractDeployment();
      } else if (checkSubCommand === "config") {
        await showCurrentConfig();
      } else if (checkSubCommand === "tables") {
        await checkTableCounts();
      } else if (checkSubCommand === "accounts") {
        await checkAccounts();
      } else if (checkSubCommand === "all") {
        await runFullCheck();
      } else {
        console.log("Running full health check...");
        await runFullCheck();
        console.log("Check options: deployment, config, tables, accounts, all");
      }
      break;

    case "test":
      const testSubCommand = process.argv[3];
      if (testSubCommand === "proposals") {
        await createTestProposals();
      } else if (testSubCommand === "referendums") {
        await createTestReferendums();
      } else if (testSubCommand === "data") {
        await createTestData();
      } else {
        console.log("🧪 Test Data Creation");
        console.log("===================");
        console.log("Available test commands:");
        console.log(
          "  test proposals    - Create sample proposals for testing"
        );
        console.log(
          "  test referendums  - Create sample referendums for testing"
        );
        console.log(
          "  test data         - Interactive menu for creating test data"
        );
        console.log("\nExample: node scripts/commands.js test proposals");
      }
      break;

    case "help":
      console.log("Available commands:");
      console.log(
        "  init                    - Deploy and configure everything"
      );
      console.log(
        "  compile [contract]      - Compile all contracts or specific contract"
      );
      console.log("  run <contract>          - Deploy specific contract");
      console.log("  set params              - Set parameters from JSON files");
      console.log("  set permissions         - Update contract permissions");
      console.log("  config [option]         - Configuration management:");
      console.log("    config                - Interactive configuration menu");
      console.log(
        "    config show           - Show current blockchain configuration"
      );
      console.log("    config files          - Show local configuration files");
      console.log(
        "    config test           - Set test configuration (lower stakes)"
      );
      console.log("    config accounts       - Check account status");
      console.log("    config interactive    - Interactive configuration menu");
      console.log(
        "  check [option]          - Contract verification and monitoring:"
      );
      console.log(
        "    check                 - Full health check (deployment + config + tables)"
      );
      console.log(
        "    check deployment      - Check if contracts are deployed and permissions"
      );
      console.log(
        "    check config          - Show current blockchain configuration"
      );
      console.log(
        "    check tables          - Check table contents and statistics"
      );
      console.log(
        "    check accounts        - Check account status and resources"
      );
      console.log("    check all             - Full health check");
      console.log("  cleanup [option]        - Cleanup on-chain data:");
      console.log(
        "    cleanup refs          - Reset referendums (clears refs + all votes)"
      );
      console.log(
        "    cleanup refs-batch N  - Batch delete referendums (max_rows=N)"
      );
      console.log("    cleanup props         - Reset proposals (optional)");
      console.log(
        "    cleanup props-batch N - Batch delete proposals (max_rows=N)"
      );
      console.log(
        "    cleanup all [--props] - Reset referendums; optionally proposals"
      );
      console.log("  test [option]           - Test data creation:");
      console.log(
        "    test                  - Show test data creation options"
      );
      console.log(
        "    test proposals        - Create sample proposals for testing"
      );
      console.log(
        "    test referendums      - Create sample referendums for testing"
      );
      console.log(
        "    test data             - Interactive menu for creating test data"
      );
      console.log("  help                    - Show this help message");
      break;

    default:
      console.log('Invalid input. Use "help" to see available commands.');
  }
}

main();
