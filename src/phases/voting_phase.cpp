#include <phases/voting_phase.hpp>

void VotingPhase::start_impl()
{
  save_phase_start();

  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  auto ppitr = proposal_t.find(pitr->parent);
  // check if we are waiting for another proposal
  if (ppitr != proposal_t.end())
  {
    eosio::check(ppitr->awaiting.size() != 0, "Can not start voting, we are waiting another proposal!");
  }

  uint64_t total_days = 0;

  for (auto &item : pitr->phases)
  {
    total_days += item.duration_days;
  }

  int threshold = 0;

  switch (total_days)
  {
  case 1 ... 6:
    threshold = 90;
    break;
  case 7 ... 10:
    threshold = 80;
    break;
  case 11 ... 14:
    threshold = 70;
    break;
  case 15 ... 18:
    threshold = 60;
    break;
  case 19 ... 20:
    threshold = 55;
    break;
  case 21:
    threshold = 50;
    break;
  case 22 ... 23:
    threshold = 55;
    break;
  case 24 ... 27:
    threshold = 60;
    break;
  case 28 ... 31:
    threshold = 70;
    break;
  case 32 ... 35:
    threshold = 80;
    break;
  case 36 ... 39:
    threshold = 90;
    break;
  }

  auto phase = pitr->phases[position];

  proposals::referendum_tables referendums_t(common::contracts::referendums, common::contracts::referendums.value);
  auto ritr = referendums_t.rbegin();

  uint64_t referendum_id = (ritr != referendums_t.rend()) ? ritr->referendum_id + 1 : 1;

  proposal_t.modify(pitr, contract_name, [&](auto &item)
                    { item.special_attributes.insert(std::make_pair(get_referendum_key(phase.phase), int64_t(referendum_id))); });

  int64_t duration_days = (phase.duration_days != common::proposals::phases::undefined_duration_days) ? phase.duration_days : 10;
  int64_t end_timestamp = phase.start_date.time_since_epoch().count() + (duration_days * common::microseconds_per_day);
  eosio::check(end_timestamp > eosio::current_time_point().time_since_epoch().count(), "can not start voting, the phase has already ended");
  eosio::name scope = pitr->type;
  eosio::asset quorum = util::get_setting<proposals::config_tables, eosio::asset>(contract_name, scope, common::settings::quorum);

  std::vector<common::types::day_percentage> quorum_config = {
      common::types::factory::create_day_percentage_entry(0, quorum.amount),
      // common::types::factory::create_day_percentage_entry(5, 40)
  };

  std::vector<common::types::day_percentage> majority_config = {
      common::types::factory::create_day_percentage_entry(0, threshold),
      // common::types::factory::create_day_percentage_entry(5, 40)
  };

  eosio::action(
      eosio::permission_level(common::contracts::referendums, "active"_n),
      common::contracts::referendums,
      eosio::name("create"),
      std::make_tuple(
          referendum_id,
          pitr->creator,
          phase.start_date,
          eosio::time_point(eosio::microseconds(end_timestamp)),
          quorum,
          quorum_config,
          majority_config))
      .send();

  eosio::action(
      eosio::permission_level(common::contracts::referendums, "active"_n),
      common::contracts::referendums,
      eosio::name("start"),
      std::make_tuple(referendum_id))
      .send();
}

void VotingPhase::end_impl()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  auto phase = pitr->phases[position];
  uint64_t referendum_id = util::get_attr<int64_t>(pitr->special_attributes, get_referendum_key(phase.phase));

  proposals::referendum_tables referendums_t(common::contracts::referendums, common::contracts::referendums.value);
  auto ritr = referendums_t.require_find(referendum_id, "referendum not found");

  if (ritr->status == common::referendums::status_accepted)
  {
    if (position + 1 == pitr->phases.size())
    {
      change_proposal_status(common::proposals::status_accepted);
      if (pitr->type != common::proposals::type_main)
      {
        update_parent();
      }
    }
  }
  else if (ritr->status == common::referendums::status_rejected)
  {
    change_proposal_status(common::proposals::status_rejected);
    if (pitr->type != common::proposals::type_main)
    {
      remove_awaiting_from_parent();
    }
  }
  else
  {
    eosio::check(false, "proposal can not end, the associated referendum is still in progress");
  }

  save_phase_end();
}

std::string VotingPhase::get_referendum_key(const eosio::name &phase_name)
{
  return util::to_str("referendum_id_phase_", phase_name);
}
