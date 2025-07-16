// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FactoryModule", (m) => {
  // Deploy RaffleFactory as UUPS proxy (no constructor args)
  const factory = m.contract("RaffleFactory", [], {
    proxy: {
      kind: "uups"
    }
  });

  return { factory };
});
