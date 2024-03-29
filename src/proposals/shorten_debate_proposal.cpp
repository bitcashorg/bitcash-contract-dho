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

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.insert(std::make_pair("days", util::get_attr<int64_t>(args, "days")));
  });

}

void ShortenDebateProposal::update_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  auto ppitr = proposals_t.find(pitr->parent);

  eosio::check(ppitr != proposals_t.end(), "Shorten debate proposal must have an existing proposal parent");

  eosio::check(ppitr->status == common::proposals::phase_debate, "Shorten debate proposal can be only created when main proposal is on debate phase");

  eosio::check(ppitr->awaiting.size() == 0, "This proposal is awaiting for other proposal to pass!");

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.at("days") = util::get_attr<int64_t>(args, "days", pitr->special_attributes.at("days"));
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