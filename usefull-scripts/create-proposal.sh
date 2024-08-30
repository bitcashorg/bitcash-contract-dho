ACCOUNT=$1

cleos push action eosmakeprops create '{"args":[{"key":"type","value":["name","main"]},{"key":"creator","value":["name","erick.bk"]},{"key":"title","value":["string","default title"]},{"key":"description","value":["string","default description"]},{"key":"kpi","value":["string","default kpis"]},{"key":"deadline","value":["time_point","2024-05-24T21:46:18.584"]},{"key":"parent","value":["int64",0]},{"key":"budget","value":["asset","100.0000 EOS"]}]}' -p $ACCOUNT 


