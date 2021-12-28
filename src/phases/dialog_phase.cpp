#include <phases/dialog_phase.hpp>


void DialogPhase::start_impl ()
{
  save_phase_start();
}


void DialogPhase::end_impl ()
{
  save_phase_end();
}

