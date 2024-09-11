usage="Usage: reset.sh <account>"

if [ -z "$1" ]; then
  echo $usage
  exit 1
fi

ACCOUNT=$1

cleos -u https://eos.greymass.com push transaction '{
  "delay_sec": 0,
  "max_cpu_usage_ms": 0,
  "actions": [
    {
      "account": "testrefendum",
      "name": "reset",
      "data": {},
      "authorization": [
        {
          "actor": "erick.bk",
          "permission": "active"
        }
      ]
    }
  ]
}'