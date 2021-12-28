#include <phases/draft_phase.hpp>


void DraftPhase::start_impl () 
{
  save_phase_start();
}

void DraftPhase::end_impl ()
{
  save_phase_end();
}

bool DraftPhase::is_ready_to_start ()
{
  return true;
}

bool DraftPhase::is_ready_to_end ()
{
  return true;
}
