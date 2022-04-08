#include <phases/voting_phase.hpp>


void VotingPhase::start_impl ()
{
  save_phase_start();

  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  auto ppitr = proposal_t.find(pitr->parent);

  check(ppitr->awaiting.size() != 0, "Can not start voting, we are waiting another proposal!");

  auto phase = pitr->phases[position];

  proposals::referendum_tables referendums_t(common::contracts::referendums, common::contracts::referendums.value);
  auto ritr = referendums_t.rbegin();
  
  uint64_t referendum_id = (ritr != referendums_t.rend()) ? ritr->referendum_id + 1 : 1;

  proposal_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.insert(std::make_pair(get_referendum_key(phase.phase), int64_t(referendum_id)));
  });

  int64_t duration_days = (phase.duration_days != common::proposals::phases::undefined_duration_days) ? phase.duration_days : 10;
  int64_t end_timestamp = phase.start_date.time_since_epoch().count() + (duration_days * common::microseconds_per_day);

  std::vector<common::types::day_percentage> quorum_config = {
    common::types::factory::create_day_percentage_entry(0, 60),
    common::types::factory::create_day_percentage_entry(5, 40)
  };

  std::vector<common::types::day_percentage> majority_config = {
    common::types::factory::create_day_percentage_entry(0, 60),
    common::types::factory::create_day_percentage_entry(5, 40)
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
      quorum_config,
      majority_config
    )
  ).send();

  eosio::action(
    eosio::permission_level(common::contracts::referendums, "active"_n),
    common::contracts::referendums,
    eosio::name("start"),
    std::make_tuple(referendum_id)
  ).send();
}

void VotingPhase::end_impl ()
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
      if (pitr->type != common::proposals::type_main ) { update_parent(); }
    }
  }
  else if (ritr->status == common::referendums::status_rejected)
  {
    change_proposal_status(common::proposals::status_rejected);
    if (pitr->type != common::proposals::type_main ) { remove_awaiting_from_parent(); }
  }
  else
  {
    eosio::check(false, "proposal can not end, the associated referendum is still in progress");
  }

  save_phase_end();
}

std::string VotingPhase::get_referendum_key (const eosio::name & phase_name)
{
  return util::to_str("referendum_id_phase_", phase_name);
}
