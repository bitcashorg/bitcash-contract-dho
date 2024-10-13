#!/bin/bash

buyrambytes_usage() {
  echo "Usage: $0 buyrambytes -p <payer> -r <receiver> -b <bytes>"
  echo "Example: $0 buyrambytes -p alice -r bob -b 8192"
}

buyrambytes() {
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    buyrambytes_usage
    exit 0
  fi

  payer=""
  receiver=""
  bytes=""

  # Parse options
  while getopts ":p:r:b:" opt; do
    case ${opt} in
      p )
        payer=$OPTARG
        ;;
      r )
        receiver=$OPTARG
        ;;
      b )
        bytes=$OPTARG
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

  # Check if required arguments are provided
  if [ -z "$payer" ] || [ -z "$receiver" ] || [ -z "$bytes" ]; then
    echo "Error: Missing required arguments."
    buyrambytes_usage
    exit 1
  fi

  # Execute cleos command
  cleos -u https://eos.api.eosnation.io push action eosio buyrambytes '{
    "payer":"'$payer'", 
    "receiver":"'$receiver'", 
    "bytes":'$bytes'
  }' -p $payer@active
}
