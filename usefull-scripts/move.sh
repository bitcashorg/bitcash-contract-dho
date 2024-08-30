usage="Usage: move.sh <account> <proposal_id>"
if [ -z "$1" ]; then
  echo $usage
  exit 1
fi

if [ -z "$2" ]; then
  echo $usage
  exit 1
fi

ACCOUNT=$1

cleos push action eosmakeprops move [$2] -p $ACCOUNT