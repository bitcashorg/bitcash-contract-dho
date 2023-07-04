#include <phases/base_phase.hpp>

void Phase::start()
{
  eosio::check(is_ready_to_start(), "phase is not ready to start");
  start_impl();
}

void Phase::end()
{
  eosio::check(is_ready_to_end(), "phase is not ready to end");
  end_impl();
}

bool Phase::is_ready_to_start()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  return pitr->status == common::proposals::status_open;
}

bool Phase::is_ready_to_end()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  eosio::time_point now = eosio::current_time_point();

  auto &p = pitr->phases[position];

  int64_t num_days = util::day_diff(p.start_date, now);
  if (num_days < p.duration_days)
    return false;

  return true;
}

void Phase::save_phase_start()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  proposal_t.modify(pitr, contract_name, [&](auto &item)
                    {    
    auto & p = item.phases[position];
    p.start_date = eosio::current_time_point();
    item.current_phase = item.phases[position].phase; });
}

void Phase::save_phase_end()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  proposal_t.modify(pitr, contract_name, [&](auto &item)
                    {    
    auto & p = item.phases[position];
    p.end_date = eosio::current_time_point();
    item.current_phase = common::proposals::phases::no_phase; });
}

void Phase::change_proposal_status(const eosio::name &status)
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  proposal_t.modify(pitr, contract_name, [&](auto &item)
                    { item.status = status; });
}

void Phase::update_parent()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  check(pitr->type != common::proposals::type_main, "Main proposals don't have parents!");

  auto ppitr = proposal_t.require_find(pitr->parent, "proposal parent not found");

  if (pitr->type == common::proposals::type_amendment)
  {

    proposal_t.modify(ppitr, contract_name, [&](auto &item)
                      { item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end()); });
  }

  if (pitr->type == common::proposals::type_extend_debate)
  {

    uint64_t days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("day", 's'));

    proposal_t.modify(ppitr, contract_name, [&](auto &item)
                      {
      item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end());
      item.phases[position].duration_days += days; });
  }

  if (pitr->type == common::proposals::type_shorten_debate)
  {

    uint64_t days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("day", 's'));

    eosio::check(ppitr->phases.size() > 0, "phases vector must contain at least one element");

    proposal_t.modify(ppitr, contract_name, [&](auto &item)
                      {
      item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end());
      item.phases[position].duration_days -= days; });
  }

  if (pitr->type == common::proposals::type_change_time)
  {

    uint64_t days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("day", 's'));
    uint64_t debate_days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("debat", 'e'));
    uint64_t prevote_days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("prevot", 'e'));
    uint64_t vote_days = util::get_attr<int64_t>(pitr->special_attributes, util::to_str("vot", 'e'));

    size_t i = 0;

    for (; i < pitr->phases.size(); i++)
    {
      break;
      // if (pitr->phases[i].phase == current_phase)
      // {
      //   // from_position = i;
      //   break;
      // }
    }

    proposal_t.modify(ppitr, contract_name, [&](auto &item)
                      {
      item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end());
      item.phases[position].duration_days -= days; });
  }
}

void Phase::remove_awaiting_from_parent()
{
  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  check(pitr->type != common::proposals::type_main, "Main proposals don't have parents!");

  auto ppitr = proposal_t.require_find(pitr->parent, "proposal parent not found");

  proposal_t.modify(ppitr, contract_name, [&](auto &item)
                    { item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end()); });
}
