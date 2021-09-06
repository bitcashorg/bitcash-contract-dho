#pragma once
#include <tables/proposal.hpp>
#include <proposal/proposal.hpp>

namespace proposal {
    class factory {
    public:
        static std::shared_ptr<proposal> get(tables::proposal& proposal);
        static void run_phase(tables::proposal& proposal);

    };
}
