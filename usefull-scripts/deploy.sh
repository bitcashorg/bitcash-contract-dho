usage="Usage: deploy.sh <account> <contract>"
if [ -z "$1" ]; then
  echo $usage
  exit 1
fi

if [ -z "$2" ]; then
  echo $usage
  exit 1
fi

# check if there is a compiled folder with a folder named as the contract
if [ ! -d "./compiled/$2" ]; then
  echo "No compiled folder found for contract $2"
  exit 1
fi

ACCOUNT=$1

cleos -u https://eos.greymass.com set contract $ACCOUNT ./compiled/$2 -p $ACCOUNT@active