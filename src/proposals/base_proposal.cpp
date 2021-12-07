#include <proposals/base_proposal.hpp>


void Proposal::create (std::map<std::string, common::types::variant_value> & args)
{
  // check for enough stake

  proposals::proposal_tables proposals_t(contract_name, contract_name.value);

  eosio::name type = util::get_attr<eosio::name>(args, "type");
  
  proposals::phases_config_tables pconfig_t(contract_name, contract_name.value);
  auto pcitr = pconfig_t.require_find(type.value, ("default phases configuration does not exist for proposal type: " + type.to_string()).c_str());

  uint64_t proposal_id = util::format_id(proposals_t.available_primary_key());

  proposals_t.emplace(contract_name, [&](auto & item){
    item.proposal_id = proposal_id;
    item.creator = util::get_attr<eosio::name>(args, "creator");
    item.type = type;
    item.title = util::get_attr<std::string>(args, "title");
    item.description = util::get_attr<std::string>(args, "description");
    item.kpi = util::get_attr<std::string>(args, "kpi");
    item.deadline = util::get_attr<eosio::time_point>(args, "deadline");

    bool first_phase = true;
    for (auto & default_phase : pcitr->default_phases)
    {
      if (first_phase) {
        item.current_phase = default_phase.phase;
      }
      item.phases.push_back(common::types::factory::create_phase_entry(
        util::get_attr<eosio::name>(args, util::to_str("phase_", default_phase.phase, "_name"), default_phase.phase),
        int16_t(util::get_attr<int64_t>(args, util::to_str("phase_", default_phase.phase, "_duration_days"), int64_t(default_phase.duration_days))),
        util::get_attr<eosio::name>(args, util::to_str("phase_", default_phase.phase, "_type"), default_phase.type),
        first_phase ? eosio::current_time_point() : eosio::time_point(eosio::microseconds(0))
      ));
      first_phase = false;
    }

    item.parent = util::get_attr<int64_t>(args, "parent");
  });

  args.insert(std::make_pair("proposal_id", int64_t(proposal_id)));
  create_impl(args);
}


void Proposal::update (std::map<std::string, common::types::variant_value> & args)
{

}


void Proposal::cancel (std::map<std::string, common::types::variant_value> & args)
{

}

void Proposal::move (std::map<std::string, common::types::variant_value> & args)
{

}

void Proposal::create_impl (std::map<std::string, common::types::variant_value> & args) {}
