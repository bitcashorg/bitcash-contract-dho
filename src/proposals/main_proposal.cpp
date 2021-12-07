#include <proposals/main_proposal.hpp>

void MainProposal::create_impl(std::map<std::string, common::types::variant_value> & args)
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
