const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
require('@openzeppelin/hardhat-upgrades');

describe("Factory", function () {
  it("Should deploy RaffleFactory (proxy) and RaffleNFT", async function () {
    // Deploy RaffleFactory as UUPS proxy
    const RaffleFactory = await ethers.getContractFactory("RaffleFactory");
    const factory = await upgrades.deployProxy(RaffleFactory, [], { kind: "uups" });
    await factory.waitForDeployment();
    expect(factory.target).to.properAddress;

    // Deploy RaffleNFT (not upgradeable)
    const RaffleNFT = await ethers.getContractFactory("RaffleNFT");
    const nft = await RaffleNFT.deploy("TestNFT", "TNFT");
    await nft.waitForDeployment();
    expect(nft.target).to.properAddress;
  });
});
