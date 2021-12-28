#pragma once

#include "base_phase.hpp"


class DraftPhase : public Phase {

  public:

    using Phase::Phase;


    virtual void start_impl();
    virtual void end_impl();

    virtual bool is_ready_to_start();
    virtual bool is_ready_to_end();

};
