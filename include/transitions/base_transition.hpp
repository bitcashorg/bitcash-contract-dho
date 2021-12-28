#pragma once

#include <proposals.hpp>

#include "../phases/phases_factory.hpp"


class Transition {

  public:

    Transition(proposals & _contract) : m_contract(_contract), contract_name(_contract.get_self()) {};
    ~Transition(){};

    void execute(const uint64_t & proposal_id);

  
  private:

    proposals & m_contract;
    eosio::name contract_name;

    Phase * from;
    Phase * to;


    std::pair<Phase *, Phase *> getFromTo(const eosio::name & current_phase, const std::vector<common::types::phase> & phases, const uint64_t & proposal_id);
  
};
