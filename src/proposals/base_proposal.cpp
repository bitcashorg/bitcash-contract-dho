#include <proposals/base_proposal.hpp>


void Proposal::check_requirements (std::map<std::string, common::types::variant_value> & args)
{
  eosio::name creator = util::get_attr<eosio::name>(args, "creator");
  eosio::asset creator_balance = util::get_account_balance<proposals::token_account_tables>(common::contracts::bank_token, creator, common::token_symbol);

  eosio::name scope = util::get_attr<eosio::name>(args, "type");
  eosio::asset min_stake = util::get_setting<proposals::config_tables, eosio::asset>(contract_name, scope, common::settings::min_stake);

  eosio::check(creator_balance >= min_stake, 
    "the account " + creator.to_string() + " has " + creator_balance.to_string() + 
    ", minimum required balance to create this proposal is " + min_stake.to_string());
}


void Proposal::create (std::map<std::string, common::types::variant_value> & args)
{
  check_requirements(args);

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
    item.status = common::proposals::status_open;

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
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);
  
  int64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.require_find(proposal_id, util::to_str("proposal with id ", proposal_id, " was not found").c_str());

  eosio::check(
    pitr->current_phase == common::proposals::phase_discussion, 
    util::to_str("can not modify proposal, it is not in ", common::proposals::phase_discussion, " phase")
  );

  proposals_t.modify(pitr, contract_name, [&](auto & item){
    item.title = util::get_attr<std::string>(args, "title", pitr->title);
    item.description = util::get_attr<std::string>(args, "description", pitr->description);
    item.kpi = util::get_attr<std::string>(args, "kpi", pitr->kpi);
    item.deadline = util::get_attr<eosio::time_point>(args, "deadline", pitr->deadline);
  });

  update_impl(args);
}


void Proposal::cancel (std::map<std::string, common::types::variant_value> & args)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);
  
  int64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");
  auto pitr = proposals_t.require_find(proposal_id, util::to_str("proposal with id ", proposal_id, " was not found").c_str());

  eosio::check(
    pitr->current_phase == common::proposals::phase_discussion, 
    util::to_str("can not modify proposal, it is not in ", common::proposals::phase_discussion, " phase")
  );

  cancel_impl(args);
  proposals_t.erase(pitr);
}

void Proposal::move (std::map<std::string, common::types::variant_value> & args)
{
  int64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");

  Transition * transition = new Transition(m_contract);
  transition->execute(proposal_id);
}


void Proposal::create_impl (std::map<std::string, common::types::variant_value> & args) {}

void Proposal::update_impl (std::map<std::string, common::types::variant_value> & args) {}

void Proposal::cancel_impl (std::map<std::string, common::types::variant_value> & args) {}
