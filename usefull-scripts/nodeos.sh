usage="Usage: [start|force_start]"
if [ "$1" == "" ]; then
    echo $usage
    exit 1
fi

if [ "$1" == "force_start" ]; then
  rm -rf ~/.local/share/eosio/nodeos/data/state* ~/.local/share/eosio/nodeos/data/blocks
fi

nodeos -e -p eosio \
    --plugin eosio::producer_plugin \
    --plugin eosio::chain_api_plugin \
    --plugin eosio::http_plugin \
    --http-server-address=0.0.0.0:8888 \
    --access-control-allow-origin=* \
    --contracts-console \
    --http-validate-host=false \
    --verbose-http-errors \
    --max-transaction-time=100