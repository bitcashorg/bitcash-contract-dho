#!/bin/bash

powerup_usage() {
  echo "Usage: $0 powerup -a <account> -p <payer> -n <net_frac> -c <cpu_frac> -m <max_payment>"
  echo "Example: $0 powerup -a alice -p bob -n 1000 -c 5000 -m 3.0 EOS"
}

powerup() {
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    powerup_usage
    exit 0
  fi

  account=""
  payer=""
  net_frac=0
  cpu_frac=3805
  max_payment="4.7291 EOS"

  # Parse options
  while getopts ":a:p:n:c:m:" opt; do
    case ${opt} in
      a )
        account=$OPTARG
        ;;
      p )
        payer=$OPTARG
        ;;
      n )
        net_frac=$OPTARG
        ;;
      c )
        cpu_frac=$OPTARG
        ;;
      m )
        max_payment=$OPTARG
        ;;
      \? )
        echo "Invalid option: -$OPTARG" >&2
        exit 1
        ;;
      : )
        echo "Option -$OPTARG requires an argument." >&2
        exit 1
        ;;
    esac
  done

  # Check if account is provided
  if [ -z "$account" ]; then
    echo "Error: Missing required account argument."
    powerup_usage
    exit 1
  fi

  # If payer is not provided, the account pays for itself
  if [ -z "$payer" ]; then
    payer=$account
  fi

  # Execute cleos command
  cleos -u https://eos.greymass.com push transaction "{
    \"delay_sec\": 0,
    \"max_cpu_usage_ms\": 0,
    \"actions\": [
      {
        \"account\": \"eosio\",
        \"name\": \"powerup\",
        \"data\": {
          \"payer\": \"$payer\",
          \"receiver\": \"$account\",
          \"days\": 1,
          \"net_frac\": $net_frac,
          \"cpu_frac\": $cpu_frac,
          \"max_payment\": \"$max_payment\"
        },
        \"authorization\": [
          {
            \"actor\": \"$payer\",
            \"permission\": \"active\"
          }
        ]
      }
    ]
  }"
}
