# to save the container state
# docker commit -p container_id ubuntu_eosio:latest
docker run -ti --rm -v $HOME/github.com/bitcashorg/bitcash-contract-dho:/data ubuntu_eosio:latest /bin/bash