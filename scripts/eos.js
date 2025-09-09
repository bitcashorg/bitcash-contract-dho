require("dotenv").config();

const eosjs = require("eosjs");
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig");
const { TextEncoder, TextDecoder } = require("util");
const fetch = require("node-fetch");

const { Api, JsonRpc } = eosjs;
const { endpoint } = require("./config");

function parseKeys() {
  const raw = process.env.PRIVATE_KEYS || process.env.PRIVATE_KEY || "";
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const getChainInfo = () => {
  const chainName = process.env.CHAIN_NAME;

  // Use endpoint from config.js which supports environment variable overrides
  const httpEndpoint = endpoint;

  switch (chainName) {
    case "local":
      return { keyProvider: parseKeys(), httpEndpoint };
    case "telosTestnet":
      return { keyProvider: parseKeys(), httpEndpoint };
    case "telosMainnet":
      return { keyProvider: parseKeys(), httpEndpoint };
    case "layer1":
      return { keyProvider: parseKeys(), httpEndpoint };
    case "jungleTestnet":
      return { keyProvider: parseKeys(), httpEndpoint };
    case "eosMainnet":
      return {
        keyProvider: [process.env.PRIVATE_KEY],
        httpEndpoint,
      };
    default:
      return {
        keyProvider: parseKeys(),
        httpEndpoint: httpEndpoint || "http://127.0.0.1:8888",
      };
  }
};

const { keyProvider, httpEndpoint } = getChainInfo();

const signatureProvider = new JsSignatureProvider(
  Array.isArray(keyProvider) ? keyProvider : [keyProvider]
);

const rpc = new JsonRpc(httpEndpoint, { fetch });
const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
});

async function transact(transaction, options = {}) {
  options = {
    blocksBehind: 3,
    expireSeconds: 30,
    expireSeconds: 2000,
    ...options,
  };
  const res = await api.transact(transaction, options);
  return res;
}
module.exports = { rpc, api, transact };
