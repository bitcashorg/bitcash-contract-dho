#pragma once

#include <proposals.hpp>

class Phase {

  public:

    Phase(uint64_t _proposal_id, proposals & _contract, uint64_t _position) : 
      proposal_id(_proposal_id), 
      m_contract(_contract),
      position(_position),
      contract_name(_contract.get_self())
      {};
    virtual ~Phase(){};

    void start();
    void end();

    virtual void start_impl() = 0;
    virtual void end_impl() = 0;

    virtual bool is_ready_to_start();
    virtual bool is_ready_to_end();

  protected:

    uint64_t proposal_id;
    uint64_t position;
    proposals & m_contract;
    eosio::name contract_name;

    void save_phase_start();
    void save_phase_end();
    void change_proposal_status(const eosio::name & status);
    void update_parent();


};
