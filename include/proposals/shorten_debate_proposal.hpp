#pragma once

#include "base_proposal.hpp"

class ShortenDebateProposal : public Proposal {

  public:

    using Proposal::Proposal;

  protected:

    virtual void create_impl(std::map<std::string, common::types::variant_value> & args);
    virtual void update_impl(std::map<std::string, common::types::variant_value> & args);
    virtual void cancel_impl(std::map<std::string, common::types::variant_value> & args);

};
