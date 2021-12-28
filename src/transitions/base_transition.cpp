#include <transitions/base_transition.hpp>


void Transition::execute (const uint64_t & proposal_id)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);
  auto pitr = proposals_t.require_find(proposal_id, util::to_str("proposal with id ", proposal_id, " was not found").c_str());

  auto [from, to] = getFromTo(pitr->current_phase, pitr->phases, proposal_id);

  from->end();

  if (to != nullptr)
  {
    to->start();
  }
}

std::pair<Phase *, Phase *> Transition::getFromTo (
  const eosio::name & current_phase, 
  const std::vector<common::types::phase> & phases,
  const uint64_t & proposal_id
)
{
  eosio::check(phases.size() > 0, "phases vector must contain at least one element");

  size_t from_position = 0;
  size_t i = 0;

  for (; i < phases.size(); i++)
  {
    if (phases[i].phase == current_phase)
    {
      from_position = i;
      break;
    }
  }

  eosio::check(i < phases.size(), "invalid current phase");

  Phase * from = PhasesFactory::Factory(phases[from_position].type, proposal_id, m_contract, from_position);
  Phase * to = nullptr;

  if ((from_position + 1) < phases.size())
  {
    to = PhasesFactory::Factory(phases[from_position+1].type, proposal_id, m_contract, from_position + 1);
  }

  return std::make_pair(from, to);
}
