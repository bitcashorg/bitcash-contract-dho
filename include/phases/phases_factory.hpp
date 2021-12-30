#pragma once

#include "draft_phase.hpp"
#include "dialog_phase.hpp"
#include "voting_phase.hpp"

#include "../common/constants.hpp"

class PhasesFactory {

  public:

    static Phase * Factory(const eosio::name & type, uint64_t proposal_id, proposals & contract, uint64_t position) {
      switch (type.value)
      {
        case common::proposals::phases::type_draft.value:
          return new DraftPhase(proposal_id, contract, position);

        case common::proposals::phases::type_dialog.value:
          return new DialogPhase(proposal_id, contract, position);

        case common::proposals::phases::type_voting.value:
          return new VotingPhase(proposal_id, contract, position);

        default:
          break;
      }

      eosio::check(false, "Unknown phase type " + type.to_string());
      return nullptr;
    }

};

