# **referendums contract**
This contract contains the necessary actions  to create a referendum.

## **Referendums can be in one of the following states:**

| Status | Description |
| -- | -- |
| created | The referendum has been created  |
| started | The referendum has been started, it can store votes |
| hold | The referendum is on 'pause' |
| accepted | The referendum has finished and has been accepted |
| rejected | The referendum has finished and has been rejected |

## **The types of valid votes that users can submit are:**

| Vote | Description |
| -- | -- |
| yes | The vote is in favor |
| no | The vote is no |
| abstain | The vote is abstain |
<!-- 
Please check out, I'm not sure is it 'in' or 'on'.
-->

--- 

## **ACTIONS**
## **reset**
### Description: 
Resets tables: referendum_tables & vote_tables
### Required permission: `refe.bitcash@active` or `prop.bitcash@active`
### Inline actions
N / A
### Parameters
N / A
<!-- Actually it doesn't have parameters. I was thinkig to write: N / A
What do u think? Should we keep as an empty table or just type ' N / A'

| Type | Name | Description |
| -- | -- | -- |
| - | - | - |
-->


---

## **create**
### Description:
Creates a new referendum system.
Referendum status: created
### Required permission: `self@active`
### Inline actions: 
N / A

### Parameters: 
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id | Referendum id |
| name | creator | Creator's name |
| time_point | start_date | Referendum's start day |
| time_point | end_date | Referendum's end date |
| asset | quorum | Absolute quorum threshold (IMPACT) |
| [`std::vector<common::types::day_percentage>`](#reference1) | quorum_config | Configuring Quorum Requirements |
| [`std::vector<common::types::day_percentage>`](#reference1) | majority_config | Configuration of the requirements for the majority |

Note: See data types section for more information

---

## **start**
### Description: 
Changes referendums status to started, users can vote now. 
Referendum status: started
### Required permission: `creator@active` or `prop.bitcash@active` or `refe.bitcash@active`
### Inline actions:
N / A
#### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id |  Referendum id |

---

## **hold**
### Description: 
Pauses the selected referendum.
Referendum status: hold
### Require permission: `refe.bitcash@active`
### Inline actions:
N / A
### Parameters:
| Type | Name| Description | 
| -- | -- | -- |
|uint64_t | referendum_id | Referendum id |

---

## **resume**
### Description: 
Resume a referendum that was on pause
Referendum status: started
### Require presmission: `refe.bitcash@active`
### Inline actions: 
N / A
### Parameters: 
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id | Referendum id |

---

## **finish**
### Description: 
Ends the selected referendum. Depending on votes, referendum can be accepted or rejected.
Referendum status: accepted / rejected 
### Require permission: `creator@active` or `prop.bitcash@active` or `refe.bitcash@active`
### Guards:
 - Must be in `started` status
 - If not `refe.bitcash`, now must be ≥ `end_date`
 - If `refe.bitcash`, now must be ≥ `start_date + 24h`
### Inline actions: 
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id | Referendum id |

---

## **vote**
### Description
Sends user's vote.
### Require permission: `voter@active`
### Guards:
 - Referendum must be `started`
 - One vote per account
 - Voter must hold IMPACT balance > 0
 - Option must be one of `yes`, `no`, `abstain`
### Inline actions:
N / A
### Parameters
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id | Referendum id |
| name | voter | Voter's name |
| name | option | User's Vote |

Note: User's vote can be
+ yes
+ abstain
+ no

---

## **DATA TYPES**
<div id="reference1"></div>

## **day_percentage**

| Type | Name |
| -- | -- |
| `std::vector<common::types::day_percentage>` | day_percentage |
</br>

### **`std::vector<common::types::day_percentage>` composition:**
| Type | name |
| -- | -- |
| uint16_t | start day |
| uint16_t | percentage |

---

# TABLES
## **referendums**
## EOSIO table name: referendum_tables
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | referendum_id | Referendum id |
| name | creator | Referendum's creator |
| time_point | start_date | Mark the start date of the referendum |
| time_point | end_date | Mark the end date of the referendum |
| name | status | Referendum status |
| asset | quorum | Absolute quorum threshold (IMPACT) |
| [`std::vector<common::types::day_percentage>`](#reference1) | quorum_config | Configuring Quorum Requirements |
| [`std::vector<common::types::day_percentage>`](#reference1) | majority_config | Configuration of the requirements for the majority |
| asset | votes_favour | Tally of favour votes (recomputed at finish) |
| asset | votes_against | Tally of against votes (recomputed at finish) |
| asset | votes_abstain | Tally of abstain votes (recomputed at finish) |

---

## **accounts**
## EOSIO table name: token_account_table
| Type | Name | Description |
| -- | -- | -- |
| asset | balance | User's balance |

--- 

## **stat**
## EOSIO table name: currency_stats
| Type | name | Description |
| -- | -- | -- |
| asset | supply | Number of tokens issued |
| asset | max_supply | Maximum number of issued tokens |
| name | issuer | Is the only user who can issue tokens |

---

## **votes**
## EOSIO table name: vote_tables
| Type | name | Description |
| -- | -- | -- |
| name | voter | Voter's name |
| asset | amount | Snapshot of voter's balance at vote time |
| name | option | User's vote (yes, abstain, no) |
| uint32_t | weight | User's vote weight |

---

