#pragma once

#include "base_proposal.hpp"


class MainProposal : public Proposal {

  public:

    using Proposal::Proposal;

  protected:

    virtual void create_impl(std::map<std::string, common::types::variant_value> & args);

};
