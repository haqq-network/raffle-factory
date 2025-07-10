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
    const nft = await RaffleNFT.deploy("TestNFT", "TNFT", "https://example.com/metadata.json");
    await nft.waitForDeployment();
    expect(nft.target).to.properAddress;
  });
});

describe("RaffleFactory full flow", function () {
  it("Should deploy ERC20, RaffleFactory, and create Raffle via factory with correct checks", async function () {
    const [owner, manager] = await ethers.getSigners();

    // Deploy test ERC20 token
    const ERC20TestToken = await ethers.getContractFactory("ERC20TestToken", manager);

    const erc20 = await ERC20TestToken.deploy("TestToken", "TTK");
    await erc20.waitForDeployment();
    expect(erc20.target).to.properAddress;

    // Mint tokens to manager
    await erc20.mint(manager.address, 1000);
    expect(await erc20.balanceOf(manager.address)).to.equal(1000);

    // Deploy RaffleFactory as UUPS proxy (owner)
    const RaffleFactory = await ethers.getContractFactory("RaffleFactory", owner);
    const factory = await upgrades.deployProxy(RaffleFactory, [], { kind: "uups" });
    await factory.waitForDeployment();
    expect(factory.target).to.properAddress;

    // Grant MANAGER_ROLE to manager
    const MANAGER_ROLE = await factory.MANAGER_ROLE();
    await factory.grantRole(MANAGER_ROLE, manager.address);
    expect(await factory.hasRole(MANAGER_ROLE, manager.address)).to.be.true;

    // Manager approves factory to spend tokens
    await erc20.connect(manager).approve(factory.target, 500);
    expect(await erc20.allowance(manager.address, factory.target)).to.equal(500);

    // Manager creates a new Raffle
    const tokenURI = "https://example.com/metadata.json";
    const tx = await factory.connect(manager).createRaffle(
      "TestRaffle",
      "TRFL",
      tokenURI,
      erc20.target,
      500
    );
    const receipt = await tx.wait();

    // Check event
    const event = receipt.logs.find(l => l.fragment && l.fragment.name === "RaffleCreated");
    expect(event).to.exist;
    const raffleAddress = event.args.raffleAddress;
    expect(raffleAddress).to.properAddress;

    // Check balances
    expect(await erc20.balanceOf(manager.address)).to.equal(500);
    expect(await erc20.balanceOf(factory.target)).to.equal(0);
    expect(await erc20.balanceOf(raffleAddress)).to.equal(500);

    // Check RaffleNFT state
    const RaffleNFT = await ethers.getContractFactory("RaffleNFT");
    const raffle = await RaffleNFT.attach(raffleAddress);
    expect(await raffle.prizeToken()).to.equal(erc20.target);
    expect(await raffle.amount()).to.equal(500);
    expect(await raffle.started()).to.be.true;
    expect(await raffle.tokenURI(0)).to.equal(tokenURI);
  });
});
