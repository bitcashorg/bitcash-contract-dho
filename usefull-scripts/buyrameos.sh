cleos -u https://eos.greymass.com push transaction '{
  "delay_sec": 0,
  "max_cpu_usage_ms": 0,
  "actions": [
    {
      "account": "eosio",
      "name": "buyram",
      "data": {
        "payer": "erick.bk",
        "receiver": "testrefendum",
        "quant": "10.0000 EOS"
      },
      "authorization": [
        {
          "actor": "erick.bk",
          "permission": "active"
        }
      ]
    }
  ]
}'