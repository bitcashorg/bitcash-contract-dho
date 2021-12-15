#pragma once

#include "base_proposal.hpp"


class MainProposal : public Proposal {

  public:

    using Proposal::Proposal;

  protected:

    virtual void move(std::map<std::string, common::types::variant_value> & args);

    virtual void create_impl(std::map<std::string, common::types::variant_value> & args);
    virtual void update_impl(std::map<std::string, common::types::variant_value> & args);

};
