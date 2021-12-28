#include <phases/base_phase.hpp>


void Phase::start ()
{
  eosio::check(is_ready_to_start(), "phase is not ready to start");
  start_impl();
}

void Phase::end ()
{
  eosio::check(is_ready_to_end(), "phase is not ready to end");
  end_impl();
}

bool Phase::is_ready_to_start ()
{
  return true;
}

bool Phase::is_ready_to_end ()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  eosio::time_point now = eosio::current_time_point();

  auto & p = pitr->phases[position];

  int64_t num_days = util::day_diff(p.start_date, now);
  if (num_days < p.duration_days) return false;

  return true;
}

void Phase::save_phase_start ()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  proposal_t.modify(pitr, contract_name, [&](auto & item){    
    auto & p = item.phases[position];
    p.start_date = eosio::current_time_point();
    item.current_phase = item.phases[position].phase;
  });
}

void Phase::save_phase_end ()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  proposal_t.modify(pitr, contract_name, [&](auto & item){    
    auto & p = item.phases[position];
    p.end_date = eosio::current_time_point();
    item.current_phase = common::proposals::phases::no_phase;
  });
}

