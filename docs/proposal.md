# **proposals contract**
This contract contains the necessary actions to create a new proposal, modify it, extend it or shorten its time. 

### **Proposal's type can be:**

| Type | Description |
| -- | --| 
| main | Main proposal | 
| amendment | A minor change or addition designed to improve the selected proposal. |
| extenddebate | Extends the debate phase of the proposal. |
| shortndebate | Shortens the debate phase of the proposal. |
</br>

### **The states of a proposal are:**

| Status | Description |
| -- | -- |
| open | It means that the proposal is open to debate or modifications. |
| accepted | It means that the proposal has finished and has been accepted. |
| rejected | It means that the proposal has finished and has been rejected. |
</br>

### **Proposals have the following phases:**

| Phase | Description |
| -- | -- |
| discussion | Proposal it can be modified. |
| debate | Users can discuss the proposal. |
| debatevoting | It is a voting phase to go to voting  |
| voting | Proposal is in voting phase. |
| accpeted | Proposal has been accepted. |
| rejected | Proposal has been rejected. |
</br>

### **Phase types:**

| Type | Description |
| -- | -- |
| nophase | No defined phase, it is used to test errors.  |
| draft | Draft phase, proposal it can be modified. |
| dialog | Users can discuss the proposals. |
| voting | Proposal is in voting phase. |
</br>

<!-- Doubt:
Please, read carefully what i wrote above, I think maybe I missunderstand types and phases, 'cause as I undertand every phase can have its own type.
I marked as `pending` some fields because I'm not sure how to describe them.
Also, I haven't seen 'propvoting' in the constants.hpp file, only its use in the Unit Tests
-->

---

# **ACTIONS**
## **create** 
### Description: 
Creates a new proposal.
### Required permission: `creator@active`
### Inline actions:
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| [`std::map<std::string, common::types::variant_value>`](#reference2)  | args | Basic information of the proposal |

</br>

### **variant_value**
| Key | Data Type | Description |
| -- | -- | -- |
| type  | name | Type of proposal |
| creator | name | Proposal creator |
| title | string | Proposal title |
| description | string | Proposal description |
| kpi | string | Key perfomance indicator |
| dead_line | time_point | Proposal deadline |
| parent | int64_t | Marks if the proposal has a parent |
| [special_attributes](#reference3) | variant_value | May vary depending on the proposal's type | 
<!-- Here I dont know how to handle specialAttributes because when u call create or update actions, both actions expect to receive a `std::map<std::string, common::types::variant_value>`.
If we look into the proposal_table, we can see there are defined data types (like name, time_point, string, etc.) and `std::map<std::string, common::types::variant_value>`.

[...]
| `std::map<std::string, common::types::variant_value>` | special_attributes | May vary depending on the porposal's type |

or create a new table where u explain speciual_attributes

## special_attibutes

| Type | Name | Description |
| -- | -- | -- |
| asset | budget | Proposal budget (BANK) |
 -->
</br>

---

## **update** 
### Description: 
Updates the selected proposal.
### Required permission: `creator@active`
### Inline actions:
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| [`std::map<std::string, common::types::variant_value>`](#reference2)  | args | Basic information of the proposal |

</br>

### **variant_value**
| Key | Data Type | Description |
| -- | -- | -- |
| type  | name | Type of proposal |
| creator | name | Proposal creator |
| title | string | Proposal title |
| description | string | Proposal description |
| kpi | string | Key perfomance indicator |
| dead_line | time_point | Proposal deadline |
| parent | int64_t | Marks if the proposal has a parent |
| [special_attributes](#reference3) | variant_value | May vary depending on the proposal's type | 

---

## **cancel** 
### Description: 
Cancels the selected proposal.
### Required permission: `creator@active`
### Inline actions:
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint64_t  | proposal_id | Proposal id |

---

## **move** 
### Description: 
Changes the phase of the proposal. 
draft -> debate -> debatevoting -> propvoting
### Required permission: `creator@active`
### Inline actions:
Voting phase

| actions | permission |
| -- | -- |
| referendums1::create | `creator@active`|
| referendums1::start | `creator@active`|

<!-- I'm not sure if inline actions are like above,
I saw both actions in voting_phase.cpp
I undertand is required `referendums@active` to execute the action
but i don't figure out if @creator calls the action-->
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint64_t  | proposal_id | Proposal id |

--- 

## **setpconfig** 
### Description: 
This action define all the phases of each proposal type as:

+ The main proposals has these phases:
Discussion -> Debate -> Voting for going voting -> Voting for approval
+ The rest of the proposals (amendment, extenddebate & shortndebate) have these phases:
Discussion -> Debate -> Voting for approval
### Required permission: `self@active`
### Inline actions:
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| name  | proposal_type | Proposal type |
| [phase_config](#reference5) | default phases | Basic information about phase (type, name, duration) |

**Note:** See Data Type for more information.



---

## **setgparam** 
### Description: 
The action is used for set global parameters like the cost of each proposal (stake)
### Required permission: `self@active`
### Inline actions:
N / A
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| name | scope | Proposal scope |
| name | setting | Proposal settings |
| [`std::map<std::string, common::types::variant_value>`](#reference2) | value | Basic information of the proposal |

---

# **DATA TYPE**

<div id="reference1"></div>

 ## **`std::vector<common::types::day_percentage>`**
| Type | Name | Description |
| -- | -- | -- | 
| uint16_t | start day | Start day of the referendum |
| uint16_t | end_day | End day of the referendum |

</br>

---
<div id="reference2"></div>

Along this contract we use a special datum type: 
## **`std::map<std::string, common::types::variant_value>`**

Variable takes two arguments to form a key-value pair: A common `std:::string` for the key and a `common::types::variant_value` for the value. 

## **`common::types::variant_value`**
The definition of a variant_value is:

`typedef std::variant<std::monostate, int64_t, double, eosio::name, eosio::asset, std::string, bool, eosio::time_point> variant_value`

</br>

| **Values type** |
| -- |
| monostate |
| int64_t |
| double |
| name |
| asset |
| string |
| bool |
| time_point |
</br>

### **Example:**
<div id="reference3"></div>

## **special_attributes**
Some of the special attributes used on this contract are:
| Value | Key | Description/Where is used? | Proposal Type |
| -- | -- | -- | -- |
|`common::types::variant_value`  | `std::string`  | -- |
| asset | budget | Proposal budget (BANK) | main, amendment |
| time_point | close_date | Deadline | shortndebate, extenddebate |

---
</br>
<div id="reference4"></div>

## **phase**
| Type | Name | Description |
| -- | -- | -- |
| name | phase | Phase name |
| int16_t | durations days | Phase duration |
| name | type | Phase type |
| time_point | start_date | Start day of the phase |
| time_point | end_date | End day of the phase |

---
</br>
<div id="reference5"></div>

### **phase_config**
| Type | name | Description |
| -- | -- | -- |
| name | phase_name | Phase name |
| int16_t | duration days | Days the phase lasts | 
| name | type | Phase type|

---

# **TABLES**
## **accounts**
## EOSIO table name: token_account_table
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| asset | balance | User's balance |

---
</br>

## **config**
## EOSIO table name: config_table
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| name | setting | Proposal settings |
| [`std::map<std::string, common::types::variant_value>`](#reference2)  | value | May vary depending on the needs |

---
</br>

## **phasesconf**
## EOSIO table name: phases_config_table
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| name | type | Proposal's phase type |
| [phase](#reference4)  | default_phases | Basic information of the proposal  |

</br>

---

## **proposals**
## EOSIO table name: proposal_table
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint64_t | proposal_id | Proposal ID |
| name | creator | Creator's name |
| name | type | Proposal type |
| string | title | Proposal title |
| string | description | Description of the proposal | 
| string | kpi | Key Performance Indicator | 
| time_point | deadline | Proposal deadline |
| name | status | Proposal Status | 
| name | current_phase | Current status of the proposal |
| `std::vector<uint64_t> ` | phases | Phases of the proposal |
| uint64_t | parent | Proposal parent |
| vector<uint64_t> | awaiting | Marks related proposals that need to be finished before continuing this process |
| [`std::map<std::string, common::types::variant_value>`](#reference2)| [special_attributes](#reference3) | May vary depending on the proposal's type  |

<!-- I'm not sure if we need to describe what is a special_attributes
like above, 
If this way is approved, I can add the other special_attributes .-->
</br>

---


## **referendums**
## EOSIO table name: referendum_table
### Parameters:
| Type | Name | Description |
| -- | -- | -- |
| uint16_t | referendum_id | Referendum id |
| name | creator | Creator's name |
| time_point | start_date | Start day of the phase |
| time_point | end_date | End day of the phase |
| name | status | Referendum status |
| [`std::vector<common::types::day_percentage>`](#reference1) | quorum_config | Settings of the quorum requirements |
| [`std::vector<common::types::day_percentage>`](#reference1) | majority_config | Settings of the majority requirements |
| asset | vote_tally | Stores all kind of votes |

---
