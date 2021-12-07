#include <proposals.hpp>

#include <proposals/proposals_factory.hpp>

#include "proposals/base_proposal.cpp"
#include "proposals/main_proposal.cpp"


ACTION proposals::reset () 
{}

ACTION proposals::create (std::map<std::string, common::types::variant_value> & args)
{
  eosio::name creator = util::get_attr<eosio::name>(args, "creator");
  eosio::require_auth(creator);

  eosio::name type = util::get_attr<eosio::name>(args, "type");

  std::unique_ptr<Proposal> prop = std::unique_ptr<Proposal>(ProposalsFactory::Factory(*this, type));
  prop->create(args);
}

ACTION proposals::setpconfig (const eosio::name & proposal_type, std::vector<common::types::phase_config> & default_phases)
{
  require_auth(get_self());

  phases_config_tables pconfig_t(get_self(), get_self().value);
  auto pcitr = pconfig_t.find(proposal_type.value);

  std::vector<common::types::phase> phases;
  for (auto & default_phase : default_phases)
  {
    phases.push_back(common::types::factory::create_phase_entry(
      default_phase.phase_name,
      default_phase.duration_days,
      default_phase.type
    ));
  }

  if (pcitr == pconfig_t.end())
  {
    pconfig_t.emplace(_self, [&](auto & item){
      item.type = proposal_type;
      item.default_phases = phases;
    });
  }
  else
  {
    pconfig_t.modify(pcitr, _self, [&](auto & item){
      item.default_phases = phases;
    });
  }
}
