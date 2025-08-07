#include <proposals/shorten_debate_proposal.hpp>

void ShortenDebateProposal::create_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  uint64_t parent = util::get_attr<int64_t>(args, "parent");

  auto ppitr = proposals_t.find(parent);

  eosio::check(ppitr != proposals_t.end(), "Shorten debate proposal must have an existing proposal parent");

  eosio::check(ppitr->current_phase == common::proposals::phase_debate, "Shorten debate proposal can be only created when main proposal is on debate phase");

  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  int64_t days = util::get_attr<int64_t>(args, "days");
  eosio::check(days >= 1 && days <= 30, "shortening days must be between 1 and 30");

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.insert(std::make_pair("days", days));
  });

}

void ShortenDebateProposal::update_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Shorten debate proposal must have an existing proposal parent");

  eosio::check(ppitr->current_phase == common::proposals::phase_debate, "Shorten debate proposal can be updated only when main proposal is on debate phase");

  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  auto days_itr = pitr->special_attributes.find("days");
  eosio::check(days_itr != pitr->special_attributes.end(), "days attribute not found");
  uint64_t current_days = std::get<int64_t>(days_itr->second);
  uint64_t days = util::get_attr<int64_t>(args, "days", current_days);

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    auto days_attr_itr = item.special_attributes.find("days");
    eosio::check(days_attr_itr != item.special_attributes.end(), "days attribute not found");
    days_attr_itr->second = common::types::variant_value(int64_t(days));
  });

}

void ShortenDebateProposal::cancel_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Proposal proposal must have an existing proposal parent");

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.status = common::proposals::status_rejected;
  });

  proposals_t.modify(ppitr, contract_name, [&](auto & item){
    item.awaiting.erase(std::remove(item.awaiting.begin(), item.awaiting.end(), proposal_id), item.awaiting.end());
  });

}