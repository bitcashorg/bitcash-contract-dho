#include <proposals/change_time_proposal.hpp>

void ChangeTimeProposal::create_impl(std::map<std::string, common::types::variant_value> &args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  uint64_t parent = util::get_attr<int64_t>(args, "parent");

  auto ppitr = proposals_t.find(parent);

  eosio::check(ppitr != proposals_t.end(), "Change time proposal must have an existing proposal parent");

  eosio::check(ppitr->current_phase == common::proposals::phase_debate, "Change time proposal can be only created when main proposal is on debate phase");

  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  int64_t debate_days = util::get_attr<int64_t>(args, "debate_days");
  int64_t prevote_days = util::get_attr<int64_t>(args, "prevote_days");
  int64_t voting_days = util::get_attr<int64_t>(args, "voting_days");

  // Validate time parameters
  eosio::check(debate_days >= 1 && debate_days <= 90, "debate_days must be between 1 and 90");
  eosio::check(prevote_days >= 1 && prevote_days <= 14, "prevote_days must be between 1 and 14");
  eosio::check(voting_days >= 1 && voting_days <= 90, "voting_days must be between 1 and 90");
  eosio::check((debate_days + prevote_days + voting_days) <= 194, "total duration cannot exceed 194 days");

  proposals_t.modify(pitr, contract_name, [&](auto &item)
                     {
    item.special_attributes.insert(std::make_pair("debate", debate_days));
    item.special_attributes.insert(std::make_pair("prevote", prevote_days));
    item.special_attributes.insert(std::make_pair("voting", voting_days)); });
}

void ChangeTimeProposal::update_impl(std::map<std::string, common::types::variant_value> &args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Change time proposal must have an existing proposal parent");
  eosio::check(ppitr->current_phase == common::proposals::phase_debate, "Change time proposal can be only updated when main proposal is on debate phase");
  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  int64_t debate_days = util::get_attr<int64_t>(args, "debate_days");
  int64_t prevote_days = util::get_attr<int64_t>(args, "prevote_days");
  int64_t voting_days = util::get_attr<int64_t>(args, "voting_days");

  // Validate time parameters
  eosio::check(debate_days >= 1 && debate_days <= 90, "debate_days must be between 1 and 90");
  eosio::check(prevote_days >= 1 && prevote_days <= 14, "prevote_days must be between 1 and 14");
  eosio::check(voting_days >= 1 && voting_days <= 90, "voting_days must be between 1 and 90");
  eosio::check((debate_days + prevote_days + voting_days) <= 194, "total duration cannot exceed 194 days");

  proposals_t.modify(pitr, contract_name, [&](auto &item)
                     { 
    item.special_attributes.insert(std::make_pair("debate", debate_days));
    item.special_attributes.insert(std::make_pair("prevote", prevote_days));
    item.special_attributes.insert(std::make_pair("voting", voting_days)); });
}

void ChangeTimeProposal::cancel_impl(std::map<std::string, common::types::variant_value> &args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Proposal must have an existing proposal parent");

  proposals_t.modify(pitr, contract_name, [&](auto &item)
                     { item.status = common::proposals::status_rejected; });

  proposals_t.modify(ppitr, contract_name, [&](auto &item)
                     { item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end()); });
}