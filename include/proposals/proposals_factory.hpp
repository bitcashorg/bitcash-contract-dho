#pragma once

#include "main_proposal.hpp"
#include "../common/constants.hpp"

class ProposalsFactory {

  public:

    static Proposal * Factory(proposals & _contract, const eosio::name & type) {
      switch (type.value)
      {
        case common::proposals::type_main.value:
          return new MainProposal(_contract);

        default:
          break;
      }

      eosio::check(false, "Unknown proposal type " + type.to_string());
      return nullptr;
    }

};

