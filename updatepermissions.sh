cleos -u https://eos.greymass.com push action eosio updateauth '{
    "account": "testproposal",
    "permission": "active",
    "parent": "owner" ,
    "auth": {
        "keys": [
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
}' -p testproposal@owner
