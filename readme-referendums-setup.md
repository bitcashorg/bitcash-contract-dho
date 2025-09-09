# Allow referendums contract to call itself (for internal actions)
cleos set account permission referendums active \
  '{"threshold": 1,"keys": [{"key": "YOUR_PUBLIC_KEY","weight": 1}],"accounts": [{"permission":{"actor":"referendums","permission":"eosio.code"},"weight":1}]}' \
  owner -p referendums@owner

# Allow proposals contract to call referendums contract  
cleos set account permission referendums active \
  '{"threshold": 1,"keys": [{"key": "YOUR_PUBLIC_KEY","weight": 1}],"accounts": [{"permission":{"actor":"proposals","permission":"active"},"weight":1}]}' \
  owner -p referendums@owner

# Allow proposals contract to call itself
cleos set account permission proposals active \
  '{"threshold": 1,"keys": [{"key": "YOUR_PUBLIC_KEY","weight": 1}],"accounts": [{"permission":{"actor":"proposals","permission":"eosio.code"},"weight":1}]}' \
  owner -p proposals@owner


# Main proposal parameters
cleos push action proposals setgparam '["main", "minstake", ["asset", "1.0000 IMPACT"]]' -p proposals@active
cleos push action proposals setgparam '["main", "quorum", ["asset", "100.0000 IMPACT"]]' -p proposals@active

# Amendment proposal parameters  
cleos push action proposals setgparam '["amendment", "minstake", ["asset", "1.0000 IMPACT"]]' -p proposals@active
cleos push action proposals setgparam '["amendment", "quorum", ["asset", "100.0000 IMPACT"]]' -p proposals@active

# Change time proposal parameters
cleos push action proposals setgparam '["changetime", "minstake", ["asset", "1.0000 IMPACT"]]' -p proposals@active  
cleos push action proposals setgparam '["changetime", "quorum", ["asset", "100.0000 IMPACT"]]' -p proposals@active

# Extend debate proposal parameters
cleos push action proposals setgparam '["extenddebate", "minstake", ["asset", "1.0000 IMPACT"]]' -p proposals@active
cleos push action proposals setgparam '["extenddebate", "quorum", ["asset", "100.0000 IMPACT"]]' -p proposals@active

# Shorten debate proposal parameters  
cleos push action proposals setgparam '["shortndebate", "minstake", ["asset", "1.0000 IMPACT"]]' -p proposals@active
cleos push action proposals setgparam '["shortndebate", "quorum", ["asset", "100.0000 IMPACT"]]' -p proposals@active



# Main proposal phases (4 phases: discussion → debate → prevote → vote)
cleos push action proposals setpconfig '["main", [
  {"phase_name": "discussion", "duration_days": 7, "type": "dialog"},
  {"phase_name": "debate", "duration_days": 7, "type": "dialog"},
  {"phase_name": "prevote", "duration_days": 7, "type": "voting"}, 
  {"phase_name": "vote", "duration_days": 7, "type": "voting"}
]]' -p proposals@active

# Amendment proposal phases (2 phases: debate → vote)
cleos push action proposals setpconfig '["amendment", [
  {"phase_name": "debate", "duration_days": 7, "type": "dialog"},
  {"phase_name": "vote", "duration_days": 7, "type": "voting"}
]]' -p proposals@active

# Change time proposal phases (1 phase: vote only)
cleos push action proposals setpconfig '["changetime", [
  {"phase_name": "vote", "duration_days": 2, "type": "voting"}
]]' -p proposals@active

# Extend debate proposal phases (1 phase: vote only)  
cleos push action proposals setpconfig '["extenddebate", [
  {"phase_name": "vote", "duration_days": 3, "type": "voting"}
]]' -p proposals@active

# Shorten debate proposal phases (2 phases: debate → vote)
cleos push action proposals setpconfig '["shortndebate", [
  {"phase_name": "debate", "duration_days": 10, "type": "dialog"},
  {"phase_name": "vote", "duration_days": 3, "type": "voting"}
]]' -p proposals@active