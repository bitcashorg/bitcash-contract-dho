#pragma once

#include "base_phase.hpp"


class VotingPhase : public Phase {

  public:

    using Phase::Phase;


    virtual void start_impl();
    virtual void end_impl();

  
  private:

    std::string get_referendum_key(const eosio::name & phase_name);

};
