#!/bin/bash

# Get the directory of the current script
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the individual command files
source "$BASE_DIR/commands/buyrambytes.sh"
source "$BASE_DIR/commands/deploy.sh"
source "$BASE_DIR/commands/powerup.sh"

# CLI usage function
usage() {
  echo "Usage: $0 [command] [options]"
  echo
  echo "Commands:"
  echo "  buyrambytes - Buy RAM on EOS blockchain"
  echo "  deploy      - Deploy a smart contract to an EOS account"
  echo "  powerup     - Power up an EOS account with CPU and NET resources"
  echo "  help        - Display this help message"
  echo
  echo "Examples:"
  echo "  $0 buyrambytes -p alice -r bob -b 8192"
  echo "  $0 deploy -a alice -c mycontract"
  echo "  $0 powerup -a alice -p bob -n 1000 -c 5000 -m 3.0 EOS"
}

# Main logic
if [ $# -lt 1 ]; then
  usage
  exit 1
fi

command=$1
shift # Shift the command away to process options

case $command in
  buyrambytes )
    buyrambytes "$@"
    ;;
  deploy )
    deploy "$@"
    ;;
  powerup )
    powerup "$@"
    ;;
  help | --help | -h )
    usage
    ;;
  * )
    echo "Error: Unknown command '$command'"
    usage
    exit 1
    ;;
esac
