#pragma once

#include <proposals.hpp>
#include "../common/data_types.hpp"

class Proposal {

  public:

    Proposal(proposals & _contract) : m_contract(_contract), contract_name(_contract.get_self()) {};
    virtual ~Proposal(){};

    virtual void create(std::map<std::string, common::types::variant_value> & args);
    virtual void update(std::map<std::string, common::types::variant_value> & args);
    virtual void cancel(std::map<std::string, common::types::variant_value> & args);
    virtual void move(std::map<std::string, common::types::variant_value> & args);

  protected:
  
    virtual void create_impl(std::map<std::string, common::types::variant_value> & args);

    proposals & m_contract;
    eosio::name contract_name;

};
