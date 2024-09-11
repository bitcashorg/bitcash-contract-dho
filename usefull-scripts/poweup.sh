usage="Usage: poweup.sh <account> <payer> (buys 1 day of CPU for the account)"
if [ -z "$1" ]; then
  echo $usage
  exit 1
fi

PAYER=$2

if [ -z "$2" ]; then
  # if no payer is provided, the account will pay for itself
  ACCOUNT=$1
  PAYER=$1
fi


ACCOUNT=$1

cleos -u https://eos.greymass.com push transaction "{
  \"delay_sec\": 0,
  \"max_cpu_usage_ms\": 0,
  \"actions\": [
    {
      \"account\": \"eosio\",
      \"name\": \"powerup\",
      \"data\": {
        \"payer\": \"$PAYER\",
        \"receiver\": \"$ACCOUNT\",
        \"days\": 1,
        \"net_frac\": 39384,
        \"cpu_frac\": 10,
        \"max_payment\": \"0.7291 EOS\"
      },
      \"authorization\": [
        {
          \"actor\": \"$PAYER\",
          \"permission\": \"active\"
        }
      ]
    }
  ]
}"