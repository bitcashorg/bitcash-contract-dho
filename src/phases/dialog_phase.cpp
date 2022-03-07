#include <phases/dialog_phase.hpp>


void DialogPhase::start_impl ()
{
  save_phase_start();

  proposals::proposal_tables proposal_t(contract_name, contract_name.value);
  auto pitr = proposal_t.require_find(proposal_id, "proposal not found");

  if (pitr->type != common::proposals::type_main) {
    auto ppitr = proposal_t.find(pitr->parent);

    proposal_t.modify(ppitr, contract_name, [&](auto & item){
      item.awaiting.push_back(proposal_id);
    });

  }

}


void DialogPhase::end_impl ()
{
  save_phase_end();


}

