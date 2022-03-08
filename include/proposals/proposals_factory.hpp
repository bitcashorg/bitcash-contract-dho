#pragma once

#include "main_proposal.hpp"
#include "amendment_proposal.hpp"
#include "extend_debate_proposal.hpp"
#include "shorten_debate_proposal.hpp"

#include "../common/constants.hpp"

class ProposalsFactory {

  public:

    static Proposal * Factory(proposals & _contract, const eosio::name & type) {
      switch (type.value)
      {
        case common::proposals::type_main.value:
          return new MainProposal(_contract);

        case common::proposals::type_amendment.value:
          return new AmendmentProposal(_contract);

        case common::proposals::type_extend_debate.value:
          return new ExtendDebateProposal(_contract);

        case common::proposals::type_shorten_debate.value:
          return new ShortenDebateProposal(_contract);

        default:
          break;
      }

      eosio::check(false, "Unknown proposal type " + type.to_string());
      return nullptr;
    }

};

