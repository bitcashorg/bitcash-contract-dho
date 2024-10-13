#!/bin/bash

deploy_usage() {
  echo "Usage: $0 deploy -a <account> -c <contract>"
  echo "Example: $0 deploy -a alice -c mycontract"
}

deploy() {
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    deploy_usage
    exit 0
  fi

  account=""
  contract=""

  # Parse options
  while getopts ":a:c:" opt; do
    case ${opt} in
      a )
        account=$OPTARG
        ;;
      c )
        contract=$OPTARG
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
  if [ -z "$account" ] || [ -z "$contract" ]; then
    echo "Error: Missing required arguments."
    deploy_usage
    exit 1
  fi

  # Check if compiled contract folder exists
  if [ ! -d "./compiled/$contract" ]; then
    echo "No compiled folder found for contract $contract"
    exit 1
  fi

  # Execute cleos command
  cleos -u https://eos.greymass.com set contract $account ./compiled/$contract -p $account@active
}
