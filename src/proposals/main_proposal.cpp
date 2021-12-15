#include <proposals/main_proposal.hpp>

void MainProposal::create_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  uint64_t parent = util::get_attr<int64_t>(args, "parent");
  eosio::check(parent == 0, "parent of main proposal must be id = 0, since a main proposal does not have a parent");

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.insert(std::make_pair("budget", util::get_attr<eosio::asset>(args, "budget")));
  });
}

void MainProposal::update_impl (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.find(proposal_id);

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.special_attributes.at("budget") = util::get_attr<eosio::asset>(args, "budget", pitr->special_attributes.at("budget"));
  });
}

void MainProposal::move (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.require_find(proposal_id, "proposal not found");

  eosio::name current_phase = pitr->current_phase;

  switch (current_phase.value)
  {
    case common::proposals::phase_discussion.value:
      phase_discussion(args);
      break;
    
    case common::proposals::phase_debate.value:
      phase_debate(args);
      break;

    case common::proposals::phase_debate_voting.value:
      phase_debate_voting(args);
      break;

    case common::proposals::phase_voting.value:
      phase_voting(args);
      break;
    
    default:
      eosio::check(false, "phase not found");
      break;
  }
}

void MainProposal::phase_discussion (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  uint64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.require_find(proposal_id, "proposal not found");

  // check if we are in the correct phase
  eosio::check(pitr->current_phase == common::proposals::phase_discussion, "proposal is not in discussion phase");

  // check if it is time to finish this phase

  // check next phase requirements

  // change proposal's phase

  // init next phase
}

void MainProposal::phase_debate (std::map<std::string, common::types::variant_value> & args)
{

}

void MainProposal::phase_debate_voting (std::map<std::string, common::types::variant_value> & args)
{

}

void MainProposal::phase_voting (std::map<std::string, common::types::variant_value> & args)
{

}
