cleos -u https://eos.greymass.com push action eosio updateauth '{
    "account": "eospropvotes",
    "permission": "owner",
    "parent": "" ,
    "auth": {
        "keys": [
            {
                "key": "EOS73BQAiofDo4Eq57HyhrYmKxj8VXFSz5YSPcduQgctnXTDHzqtZ",
                "weight": 1
            },
            {
                "key": "EOS7XUQhbWMpQPJpRouGSWMtdnyBcqkGkyM5x3BzcMSCfuEXB8LBi",
                "weight": 1
            },
            {
                "key": "EOS8UQqzawtRUwtozSTPYLoyWv1ms1RKVrqVQikfQi5C77HFnFB51",
                "weight": 1
            }
        ],
        "threshold": 1,
        "accounts": [
            {
                "permission": {
                    "actor": "erick.bk",
                    "permission": "active"
                },
                "weight": 1
            }
        ],
        "waits": []
    }
}' -p eospropvotes@owner
