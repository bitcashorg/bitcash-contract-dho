const { transact, rpc } = require('./eos')

const { ConfigPhasesBuilder, ConfigGeneralBuilder, ConfigEngineer } = require('./util/ConfigUtil')
const { getContracts, createRandomAccount, Asset, formatTimePoint } = require('./eosio-util')

const { contractNames } = require('./config')
const { proposals, referendums } = contractNames
const prompt = require('prompt-sync')()

async function setConfig(test = false) {
  let contracts
  contracts = await getContracts([proposals])

  const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
  await configEngineerGeneral.execute({})
}

async function getConfig() {
  const res = await rpc.get_table_rows({
    code: proposals,
    scope: proposals,
    table: 'config',
    json: true,
    limit: 200
  })
  return res.rows
}

async function setPhases() {
  let contracts
  contracts = await getContracts([proposals])

  const configEngineerPhases = new ConfigEngineer(new ConfigPhasesBuilder(contracts.proposals, proposals))
  await configEngineerPhases.execute({})
}

// Enhanced functions for better configuration management
async function showCurrentConfig() {
  console.log('=== Current Configuration ===')
  console.log(`Proposals account: ${proposals}`)
  console.log(`Referendums account: ${referendums}`)
  
  try {
    console.log('\n--- Global Parameters ---')
    // Global parameters are stored in 'config' table with different scopes
    const scopes = ['main', 'amendment', 'changetime', 'extenddebate', 'shortndebate']
    
    for (const scope of scopes) {
      console.log(`\n${scope} parameters:`)
      const gparams = await rpc.get_table_rows({
        code: proposals,
        scope: scope,
        table: 'config',
        json: true,
        limit: 200
      })
      if (gparams.rows.length > 0) {
        console.log(JSON.stringify(gparams.rows, null, 2))
      } else {
        console.log(`  No parameters configured for ${scope}`)
      }
    }
  } catch (error) {
    console.log('Could not retrieve global parameters:', error.message)
  }

  try {
    console.log('\n--- Phase Configurations ---')
    const pconfigs = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'phasesconf',
      json: true,
      limit: 200
    })
    console.log(JSON.stringify(pconfigs.rows, null, 2))
  } catch (error) {
    console.log('Could not retrieve phase configurations:', error.message)
  }

  try {
    console.log('\n--- Contract Settings ---')
    const config = await getConfig()
    console.log(JSON.stringify(config, null, 2))
  } catch (error) {
    console.log('Could not retrieve contract settings:', error.message)
  }
}

async function checkContractDeployment() {
  console.log('=== Contract Deployment Status ===')
  
  const accounts = [
    { name: 'Proposals', account: proposals },
    { name: 'Referendums', account: referendums }
  ]
  
  for (const { name, account } of accounts) {
    try {
      console.log(`\n--- ${name} Contract (${account}) ---`)
      
      // Check if account exists
      const accountInfo = await rpc.get_account(account)
      console.log('✓ Account exists')
      console.log(`  RAM: ${accountInfo.ram_quota} bytes (${accountInfo.ram_usage} used)`)
      console.log(`  NET: ${accountInfo.net_weight}`)
      console.log(`  CPU: ${accountInfo.cpu_weight}`)
      
      // Check if contract is deployed
      try {
        const codeInfo = await rpc.get_code(account)
        if (codeInfo.code_hash && codeInfo.code_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
          console.log('✓ Contract code is deployed')
          console.log(`  Code hash: ${codeInfo.code_hash}`)
        } else {
          console.log('✗ No contract code deployed')
        }
      } catch (error) {
        console.log('✗ Could not retrieve contract code:', error.message)
      }
      
      // Check permissions
      if (accountInfo.permissions) {
        const activePermission = accountInfo.permissions.find(p => p.perm_name === 'active')
        if (activePermission) {
          const hasEosioCode = activePermission.required_auth.accounts.some(a => 
            a.permission.permission === 'eosio.code'
          )
          console.log(`  eosio.code permission: ${hasEosioCode ? '✓ Enabled' : '✗ Not set'}`)
          
          const accountPerms = activePermission.required_auth.accounts.filter(a => 
            a.permission.permission === 'active'
          )
          if (accountPerms.length > 0) {
            console.log(`  Cross-contract permissions: ✓ ${accountPerms.length} account(s)`)
            accountPerms.forEach(p => console.log(`    - ${p.permission.actor}@${p.permission.permission}`))
          }
        }
      }
      
    } catch (error) {
      console.log(`✗ ${name} contract (${account}) not found:`, error.message)
    }
  }
}

async function checkTableCounts() {
  console.log('=== Contract Table Statistics ===')
  
  try {
    console.log(`\n--- ${proposals} Tables ---`)
    
    // Check proposals table
    const proposalsTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'proposals',
      json: true,
      limit: 1
    })
    console.log(`Proposals: ${proposalsTable.rows.length > 0 ? 'Has data' : 'Empty'}`)
    
    // Check phase configs
    const phasesTable = await rpc.get_table_rows({
      code: proposals,
      scope: proposals,
      table: 'phasesconf',
      json: true,
      limit: 1
    })
    console.log(`Phase configs: ${phasesTable.rows.length > 0 ? 'Configured' : 'Not configured'}`)
    
    // Check config tables for each scope
    const scopes = ['main', 'amendment', 'changetime', 'extenddebate', 'shortndebate']
    for (const scope of scopes) {
      const configTable = await rpc.get_table_rows({
        code: proposals,
        scope: scope,
        table: 'config',
        json: true,
        limit: 1
      })
      console.log(`${scope} config: ${configTable.rows.length > 0 ? 'Configured' : 'Not configured'}`)
    }
    
  } catch (error) {
    console.log('Could not retrieve table statistics:', error.message)
  }
  
  try {
    console.log(`\n--- ${referendums} Tables ---`)
    
    const referendumsTable = await rpc.get_table_rows({
      code: referendums,
      scope: referendums,
      table: 'referendums',
      json: true,
      limit: 1
    })
    console.log(`Referendums: ${referendumsTable.rows.length > 0 ? 'Has data' : 'Empty'}`)
    
  } catch (error) {
    console.log('Could not retrieve referendums table statistics:', error.message)
  }
}

async function runFullCheck() {
  console.log('=== Full Contract Health Check ===')
  console.log('This will check deployment status, configuration, and table data')
  console.log('')
  
  await checkContractDeployment()
  console.log('\n' + '='.repeat(50))
  await showCurrentConfig()
  console.log('\n' + '='.repeat(50))
  await checkTableCounts()
  
  console.log('\n' + '='.repeat(50))
  console.log('✅ Health check complete!')
  console.log('Tip: Use specific check commands for detailed investigation')
}

async function checkAccounts() {
  console.log('=== Checking Account Status ===')
  
  try {
    console.log(`\nChecking proposals account: ${proposals}`)
    const proposalsAccount = await rpc.get_account(proposals)
    console.log('✓ Proposals account exists')
    console.log(`  RAM: ${proposalsAccount.ram_quota} bytes (${proposalsAccount.ram_usage} used)`)
    console.log(`  NET: ${proposalsAccount.net_weight}`)
    console.log(`  CPU: ${proposalsAccount.cpu_weight}`)
  } catch (error) {
    console.log('✗ Proposals account not found:', error.message)
  }

  try {
    console.log(`\nChecking referendums account: ${referendums}`)
    const referendumsAccount = await rpc.get_account(referendums)
    console.log('✓ Referendums account exists')
    console.log(`  RAM: ${referendumsAccount.ram_quota} bytes (${referendumsAccount.ram_usage} used)`)
    console.log(`  NET: ${referendumsAccount.net_weight}`)
    console.log(`  CPU: ${referendumsAccount.cpu_weight}`)
  } catch (error) {
    console.log('✗ Referendums account not found:', error.message)
  }
}

async function showConfigFiles() {
  console.log('=== Configuration Files ===')
  
  try {
    console.log('\n--- params.json ---')
    const params = require('./config/params.json')
    console.log(JSON.stringify(params, null, 2))
  } catch (error) {
    console.log('Could not load params.json:', error.message)
  }

  try {
    console.log('\n--- phasesConfig.json ---')
    const phases = require('./config/phasesConfig.json')
    console.log(JSON.stringify(phases, null, 2))
  } catch (error) {
    console.log('Could not load phasesConfig.json:', error.message)
  }
}

async function setTestConfig() {
  console.log('=== Setting Test Configuration (Lower Stakes) ===')
  
  let contracts
  contracts = await getContracts([proposals])

  // Use test configuration with lower stakes
  const testConfigPath = require('path').join(__dirname, 'config/params.test.json')
  const configEngineerGeneral = new ConfigEngineer(new ConfigGeneralBuilder(contracts.proposals, proposals))
  await configEngineerGeneral.execute({ path: testConfigPath })
  
  console.log('Test configuration applied successfully')
}

function showMenu() {
  console.log('\n=== Bitcash Contract Configuration Menu ===')
  console.log('1) Show current configuration (from blockchain)')
  console.log('2) Show configuration files (local JSON)')
  console.log('3) Set parameters (from JSON files)')
  console.log('4) Set phases (from JSON files)')
  console.log('5) Set test configuration (lower stakes)')
  console.log('6) Check account status')
  console.log('7) Set both parameters and phases')
  console.log('8) Check contract deployment status')
  console.log('9) Check table statistics')
  console.log('10) Run full health check')
  console.log('0) Exit')
  console.log('==============================================')
}

async function interactiveConfig() {
  console.log('Bitcash Contract Interactive Configuration')
  console.log('Using existing Node.js configuration system')
  
  while (true) {
    showMenu()
    const choice = prompt('Enter your choice [0-10]: ')
    
    try {
      switch (choice) {
        case '1':
          await showCurrentConfig()
          break
        case '2':
          await showConfigFiles()
          break
        case '3':
          console.log('Setting parameters from configuration files...')
          await setConfig()
          break
        case '4':
          console.log('Setting phases from configuration files...')
          await setPhases()
          break
        case '5':
          await setTestConfig()
          break
        case '6':
          await checkAccounts()
          break
        case '7':
          console.log('Setting both parameters and phases...')
          await setConfig()
          await setPhases()
          break
        case '8':
          await checkContractDeployment()
          break
        case '9':
          await checkTableCounts()
          break
        case '10':
          await runFullCheck()
          break
        case '0':
          console.log('Exiting...')
          return
        default:
          console.log('Invalid choice. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error.message)
    }
    
    if (choice !== '0') {
      prompt('\nPress Enter to continue...')
    }
  }
}

/**
 * Create test proposals using JavaScript API
 */
async function createTestProposals() {
  const { transact } = require('./eos');
  
  console.log('\n📝 Creating test proposals...\n');
  
  try {
    // Create main proposal
    console.log('Creating main proposal: Community Garden Initiative...');
    const mainProposalArgs = {
      args: [
        { first: "type", second: ["name", "main"] },
        { first: "creator", second: ["name", "bitcash"] },
        { first: "title", second: ["string", "Community Garden Initiative"] },
        { first: "description", second: ["string", "Establish a community garden to promote local food production and environmental awareness. This proposal includes funding for seeds, tools, and basic infrastructure."] },
        { first: "kpi", second: ["string", "Number of families participating, pounds of food produced, community events held"] },
        { first: "deadline", second: ["time_point", "2025-02-15T00:00:00.000"] },
        { first: "parent", second: ["int64", 0] },
        { first: "budget", second: ["asset", "50000.0000 IMPACT"] }
      ]
    };
    
    await transact({
      actions: [{
        account: proposals,
        name: 'create',
        authorization: [{
          actor: 'bitcash',
          permission: 'active'
        }],
        data: mainProposalArgs
      }]
    });
    console.log('✅ Main proposal created successfully');

    // Create amendment proposal
    console.log('Creating amendment proposal...');
    const amendmentArgs = {
      args: [
        { first: "type", second: ["name", "amendment"] },
        { first: "creator", second: ["name", "bitcash"] },
        { first: "title", second: ["string", "Amendment: Increase Garden Budget"] },
        { first: "description", second: ["string", "Increase the budget for the community garden initiative to include greenhouse construction and advanced irrigation systems."] },
        { first: "kpi", second: ["string", "Greenhouse completion, water usage efficiency improvement"] },
        { first: "deadline", second: ["time_point", "2025-02-10T00:00:00.000"] },
        { first: "parent", second: ["int64", 1] },
        { first: "budget", second: ["asset", "25000.0000 IMPACT"] }
      ]
    };
    
    await transact({
      actions: [{
        account: proposals,
        name: 'create',
        authorization: [{
          actor: 'bitcash',
          permission: 'active'
        }],
        data: amendmentArgs
      }]
    });
    console.log('✅ Amendment proposal created successfully');

    // Create extend debate proposal
    console.log('Creating extend debate proposal...');
    const extendDebateArgs = {
      args: [
        { first: "type", second: ["name", "extenddebate"] },
        { first: "creator", second: ["name", "bitcash"] },
        { first: "title", second: ["string", "Extend Debate Period"] },
        { first: "description", second: ["string", "Request to extend the debate period for the community garden proposal to allow for more community input."] },
        { first: "kpi", second: ["string", "Number of additional community members participating in discussions"] },
        { first: "deadline", second: ["time_point", "2025-02-08T00:00:00.000"] },
        { first: "parent", second: ["int64", 1] },
        { first: "days", second: ["int64", 5] }
      ]
    };
    
    await transact({
      actions: [{
        account: proposals,
        name: 'create',
        authorization: [{
          actor: 'bitcash',
          permission: 'active'
        }],
        data: extendDebateArgs
      }]
    });
    console.log('✅ Extend debate proposal created successfully');

    console.log('\n🎉 All test proposals created successfully!');
    console.log('You can now check them with: node scripts/commands.js check tables');
    
  } catch (error) {
    console.error('❌ Error creating test proposals:', error.message);
    if (error.json && error.json.error) {
      console.error('Contract error:', error.json.error.details);
    }
  }
}

/**
 * Create test referendums using JavaScript API
 */
async function createTestReferendums() {
  const { transact, rpc } = require('./eos');
  
  console.log('\n🗳️  Creating test referendums...\n');
  
  try {
    // Get next available referendum IDs
    const existingReferendums = await rpc.get_table_rows({
      code: referendums,
      scope: referendums,
      table: 'referendums',
      limit: 1000
    });
    
    const nextId1 = existingReferendums.rows.length > 0 
      ? Math.max(...existingReferendums.rows.map(r => r.referendum_id)) + 1 
      : 1;
    const nextId2 = nextId1 + 1;
    
    console.log(`Creating referendum with ID ${nextId1}...`);

    // Create community governance referendum
    console.log('Creating community governance referendum...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate1 = new Date(tomorrow);
    endDate1.setDate(endDate1.getDate() + 14);
    
    await transact({
      actions: [{
        account: referendums,
        name: 'create',
        authorization: [{
          actor: referendums,
          permission: 'active'
        }],
        data: {
          referendum_id: nextId1,
          creator: "bitcash",
          start_date: tomorrow.toISOString().replace('Z', ''),
          end_date: endDate1.toISOString().replace('Z', ''),
          quorum: "100000.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 2500 }, { start_day: 7, percentage: 1500 }],
          majority_config: [{ start_day: 0, percentage: 6000 }]
        }
      }]
    });
    console.log(`✅ Community governance referendum (ID: ${nextId1}) created successfully`);

    // Create constitutional amendment referendum
    console.log(`Creating referendum with ID ${nextId2}...`);
    const endDate2 = new Date(tomorrow);
    endDate2.setDate(endDate2.getDate() + 21);
    
    await transact({
      actions: [{
        account: referendums,
        name: 'create',
        authorization: [{
          actor: referendums,
          permission: 'active'
        }],
        data: {
          referendum_id: nextId2,
          creator: "bitcash",
          start_date: tomorrow.toISOString().replace('Z', ''),
          end_date: endDate2.toISOString().replace('Z', ''),
          quorum: "150000.0000 IMPACT",
          quorum_config: [{ start_day: 0, percentage: 3000 }, { start_day: 14, percentage: 2000 }],
          majority_config: [{ start_day: 0, percentage: 6500 }]
        }
      }]
    });
    console.log(`✅ Constitutional amendment referendum (ID: ${nextId2}) created successfully`);

    console.log('\n🎉 All test referendums created successfully!');
    console.log('You can now check them with: node scripts/commands.js check tables');
    
  } catch (error) {
    console.error('❌ Error creating test referendums:', error.message);
    if (error.json && error.json.error) {
      console.error('Contract error:', error.json.error.details);
    }
  }
}

/**
 * Interactive test data creation menu
 */
async function createTestData() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function askUser(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  console.log('\n🧪 Test Data Creation Menu');
  console.log('========================');
  console.log('1. Create test proposals');
  console.log('2. Create test referendums');
  console.log('3. Create both proposals and referendums');
  console.log('4. Back to main menu');
  
  const choice = await askUser('\nSelect an option (1-4): ');
  
  switch(choice) {
    case '1':
      await createTestProposals();
      break;
    case '2':
      await createTestReferendums();
      break;
    case '3':
      console.log('\n🚀 Creating all test data...');
      await createTestProposals();
      await createTestReferendums();
      console.log('\n✅ All test data created successfully!');
      break;
    case '4':
      console.log('Returning to main menu...');
      break;
    default:
      console.log('Invalid choice. Please select 1-4.');
  }
  
  rl.close();
}



module.exports = {
  setGlobalParameters: setConfig,
  setPhasesConfiguration: setPhases,
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
  createTestData
}



