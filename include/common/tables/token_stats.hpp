
// stats table from token contract

#define DEFINE_TOKEN_STATS TABLE currency_stats { \
    eosio::asset supply; \
    eosio::asset max_supply; \
    eosio::name issuer; \
\
    uint64_t primary_key() const { return supply.symbol.code().raw(); } \
}; \
\
typedef eosio::multi_index<"stat"_n, currency_stats> stats;
