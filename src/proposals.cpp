#include <proposals.hpp>

#include <proposals/proposals_factory.hpp>

#include "proposals/base_proposal.cpp"
#include "proposals/main_proposal.cpp"
#include "proposals/amendment_proposal.cpp"
#include "proposals/extend_debate_proposal.cpp"
#include "proposals/shorten_debate_proposal.cpp"
#include "proposals/change_time_proposal.cpp"

#include "phases/base_phase.cpp"
#include "phases/dialog_phase.cpp"
#include "phases/draft_phase.cpp"
#include "phases/voting_phase.cpp"

#include "transitions/base_transition.cpp"

ACTION proposals::reset()
{
  require_auth(get_self());

  proposal_tables proposals_t(_self, _self.value);
  auto proposal_itr = proposals_t.begin();
  while (proposal_itr != proposals_t.end())
  {
    proposal_itr = proposals_t.erase(proposal_itr);
  }
}

ACTION proposals::create(std::map<std::string, common::types::variant_value> &args)
{
  eosio::name creator = util::get_attr<eosio::name>(args, "creator");
  eosio::require_auth(creator);

  eosio::name type = util::get_attr<eosio::name>(args, "type");

  std::unique_ptr<Proposal> prop = std::unique_ptr<Proposal>(ProposalsFactory::Factory(*this, type));
  prop->create(args);
}

ACTION proposals::update(std::map<std::string, common::types::variant_value> &args)
{
  int64_t proposal_id = util::get_attr<int64_t>(args, "proposal_id");

  proposal_tables proposals_t(get_self(), get_self().value);
  auto pitr = proposals_t.require_find(proposal_id, "proposal not found");

  require_auth(pitr->creator);

  std::unique_ptr<Proposal> prop = std::unique_ptr<Proposal>(ProposalsFactory::Factory(*this, pitr->type));
  prop->update(args);
}

ACTION proposals::cancel(const uint64_t &proposal_id)
{
  proposal_tables proposals_t(get_self(), get_self().value);
  auto pitr = proposals_t.require_find(proposal_id, "proposal not found");

  require_auth(pitr->creator);

  std::unique_ptr<Proposal> prop = std::unique_ptr<Proposal>(ProposalsFactory::Factory(*this, pitr->type));

  std::map<std::string, common::types::variant_value> args = {{"proposal_id", int64_t(proposal_id)}};
  prop->cancel(args);
}

ACTION proposals::move(const uint64_t &proposal_id)
{
  proposal_tables proposals_t(get_self(), get_self().value);
  auto pitr = proposals_t.require_find(proposal_id, "proposal not found");

  require_auth(has_auth(pitr->creator) ? pitr->creator : _self);

  std::unique_ptr<Proposal> prop = std::unique_ptr<Proposal>(ProposalsFactory::Factory(*this, pitr->type));

  std::map<std::string, common::types::variant_value> args = {{"proposal_id", int64_t(proposal_id)}};
  prop->move(args);
}

ACTION proposals::setpconfig(const eosio::name &proposal_type, std::vector<common::types::phase_config> &default_phases)
{
  require_auth(get_self());

  phases_config_tables pconfig_t(get_self(), get_self().value);
  auto pcitr = pconfig_t.find(proposal_type.value);

  std::vector<common::types::phase> phases;
  for (auto &default_phase : default_phases)
  {
    phases.push_back(common::types::factory::create_phase_entry(
        default_phase.phase_name,
        default_phase.duration_days,
        default_phase.type));
  }

  if (pcitr == pconfig_t.end())
  {
    pconfig_t.emplace(_self, [&](auto &item)
                      {
      item.type = proposal_type;
      item.default_phases = phases; });
  }
  else
  {
    pconfig_t.modify(pcitr, _self, [&](auto &item)
                     { item.default_phases = phases; });
  }
}

ACTION proposals::setgparam(const eosio::name &scope, const eosio::name &setting, common::types::variant_value &value)
{
  require_auth(get_self());

  config_tables config_t(get_self(), scope.value);
  auto citr = config_t.find(setting.value);

  if (citr == config_t.end())
  {
    config_t.emplace(_self, [&](auto &item)
                     {
      item.setting = setting;
      item.value = value; });
  }
  else
  {
    config_t.modify(citr, _self, [&](auto &item)
                    { item.value = value; });
  }
}
