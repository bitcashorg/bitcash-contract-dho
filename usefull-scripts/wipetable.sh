usage="Usage: wipetable.sh <account> <table>"
if [ -z "$1" ]; then
  echo $usage
  exit 1
fi

ACCOUNT = $1

if [ -z "$2" ]; then
  echo $usage
  exit 1
fi

TABLE = $2

cleos -u https://eos.greymass.com set table $ACCOUNT $ACCOUNT $TABLE