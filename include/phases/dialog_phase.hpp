#pragma once

#include "base_phase.hpp"


class DialogPhase : public Phase {

  public:

    using Phase::Phase;


    virtual void start_impl();
    virtual void end_impl();

};
