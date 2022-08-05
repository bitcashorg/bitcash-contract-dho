cleos -u https://eos.api.eosnation.io push action eosio updateauth '{
    "account": "testrefendum",
    "permission": "active",
    "parent": "owner" ,
    "auth": {
        "threshold": 1,
        "keys": [
            {
                "key": "EOS73BQAiofDo4Eq57HyhrYmKxj8VXFSz5YSPcduQgctnXTDHzqtZ",
                "weight": 1
            }
        ],
        "accounts": [
            {
                "permission": {
                    "actor": "testrefendum",
                    "permission": "eosio.code"
                },
                "weight": 1
            },
            {
                "permission": {
                    "actor": "testproposal",
                    "permission": "active"
                },
                "weight": 1
            },
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
}' -p testrefendum@active
