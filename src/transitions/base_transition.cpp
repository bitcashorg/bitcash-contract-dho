#include <transitions/base_transition.hpp>
#include <memory>


void Transition::execute (const uint64_t & proposal_id)
{
  proposals::proposal_tables proposals_t(contract_name, contract_name.value);
  auto pitr = proposals_t.require_find(proposal_id, util::to_str("proposal with id ", proposal_id, " was not found").c_str());

  auto [from_raw, to_raw] = getFromTo(pitr->current_phase, pitr->phases, proposal_id);
  std::unique_ptr<Phase> from(from_raw);
  std::unique_ptr<Phase> to(to_raw);
  from->end();
  if (to != nullptr) {
      to->start();
  } else {
      // Final phase completed - since every proposal must go through voting,
      // if we reach here without voting, the proposal auto-expires
      proposals::proposal_tables proposals_t(contract_name, contract_name.value);
      auto pitr = proposals_t.require_find(proposal_id, "proposal not found");
      
      // Check if this was a voting phase (should be handled by voting phase itself)
      bool was_voting_phase = false;
      for (const auto& phase : pitr->phases) {
          if (phase.phase == pitr->current_phase && phase.type == common::proposals::phases::type_voting) {
              was_voting_phase = true;
              break;
          }
      }
      
      // If final phase was NOT voting, this proposal expired without voting
      if (!was_voting_phase) {
          proposals_t.modify(pitr, contract_name, [&](auto &item) {
              item.status = common::proposals::status_rejected; // Auto-expire as rejected
          });
      }
      // If it WAS voting phase, the voting phase end_impl() should have handled the status
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
