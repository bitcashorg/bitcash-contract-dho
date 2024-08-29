FROM mcr.microsoft.com/devcontainers/base:focal

# Install tmux
RUN apt-get update && \
  apt install -y tmux

RUN apt update \
    && apt install -y \
        libtinfo5 \
        libpq5

# Install EOSIO
ARG EOSIO_VERSION=2.1.0
ARG EOSIO_BINARY=eosio_${EOSIO_VERSION}-1-ubuntu-20.04_amd64.deb

RUN wget https://github.com/eosio/eos/releases/download/v${EOSIO_VERSION}/${EOSIO_BINARY} \
    && apt install -y ./${EOSIO_BINARY} \
    && rm ${EOSIO_BINARY}

RUN wget https://github.com/eosio/eosio.cdt/releases/download/v1.8.0/eosio.cdt_1.8.0-1-ubuntu-20.04_amd64.deb

RUN sudo apt install ./eosio.cdt_1.8.0-1-ubuntu-20.04_amd64.deb
    
RUN cleos wallet create -f /tmp/wallet_password.txt
# Install nvm

ENV NVM_DIR='/usr/local/nvm'
# This is where nvm will install the node versions
RUN sudo  mkdir -p $NVM_DIR
ENV NODE_VERSION=20.16.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH=$NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/v$NODE_VERSION/bin:$PATH

# Make nvm available to the user vscode
RUN echo "source /usr/local/nvm/nvm.sh" >> /home/vscode/.bashrc
