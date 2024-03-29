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

  // eosio::check(util::get_attr<int64_t>(args, "days", pitr->special_attributes.at("days")) < 5, 'Proposal can not be extended more than 5 days');
  // total days can not be more than 40
  proposals_t.modify(pitr, contract_name, [&](auto &item)
                     {
    item.special_attributes.insert(std::make_pair("debate_days", util::get_attr<int64_t>(args, "debate_days")));
    item.special_attributes.insert(std::make_pair("prevote_days", util::get_attr<int64_t>(args, "prevote_days")));
    item.special_attributes.insert(std::make_pair("voting_days  ", util::get_attr<int64_t>(args, "voting_days"))); });
}

void ChangeTimeProposal::update_impl(std::map<std::string, common::types::variant_value> &args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Change time proposal must have an existing proposal parent");

  eosio::check(ppitr->status == common::proposals::phase_debate, "Change time proposal can be only created when main proposal is on debate phase");

  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  // uint64_t days = util::get_attr<int64_t>(args, "days", pitr->special_attributes.at("days"));
  // eosio::check(days < 5, 'Proposal can not be extended more than 5 days');
  // eosio::check(util::get_attr<int64_t>(args, "days", pitr->special_attributes.at("days")) < 5, 'Proposal can not be extended more than 5 days');

  proposals_t.modify(pitr, contract_name, [&](auto &item)
                     { 
    item.special_attributes.insert(std::make_pair("debate", util::get_attr<int64_t>(args, "debate")));
    item.special_attributes.insert(std::make_pair("prevote", util::get_attr<int64_t>(args, "prevote")));
    item.special_attributes.insert(std::make_pair("voting", util::get_attr<int64_t>(args, "voting"))); });
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