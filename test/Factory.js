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
    const [owner, manager, participant1] = await ethers.getSigners();

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
    const raffleId = event.args.raffleId;
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

    // --- New test: raffle and prize claim by participant ---
    // Participant mints NFT
    await raffle.connect(participant1).mint();
    expect(await raffle.balanceOf(participant1.address)).to.equal(1);

    // Before the raffle is finished, the participant does not have prize tokens
    expect(await erc20.balanceOf(participant1.address)).to.equal(0);

    // Manager finishes the raffle via factory
    await factory.connect(manager).finishRaffle(raffleId);

    // After the raffle is finished, the participant should receive the prize tokens
    expect(await erc20.balanceOf(participant1.address)).to.equal(500);
    expect(await raffle.winnerAddress()).to.equal(participant1.address);
  });

  it("RaffleNFT trasfer", async function () {
    const [owner, manager, participant1, participant2] = await ethers.getSigners();

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
    const raffleId = event.args.raffleId;
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

    // --- New test: raffle and prize claim by participant ---
    // Participant mints NFT
    await raffle.connect(participant1).mint();
    expect(await raffle.balanceOf(participant1.address)).to.equal(1);

    // Before the raffle is finished, participant2 does not have prize tokens
    expect(await erc20.balanceOf(participant2.address)).to.equal(0);

    // New step: participant1 transfers NFT to participant2
    await raffle.connect(participant1).transferFrom(participant1.address, participant2.address, 0);
    expect(await raffle.balanceOf(participant1.address)).to.equal(0);
    expect(await raffle.balanceOf(participant2.address)).to.equal(1);
    // Before the raffle is finished, participant2 does not have prize tokens
    expect(await erc20.balanceOf(participant2.address)).to.equal(0);

    // Manager finishes the raffle via factory
    await factory.connect(manager).finishRaffle(raffleId);

    // After the raffle is finished, participant2 should receive the prize tokens
    expect(await erc20.balanceOf(participant2.address)).to.equal(500);
    expect(await raffle.winnerAddress()).to.equal(participant2.address);
  });

  it("RaffleNFT ticket error", async function () {
    const [owner, manager, participant1, participant2] = await ethers.getSigners();

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
    const raffleId = event.args.raffleId;
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

    // --- New test: raffle and prize claim by participant ---
    // Participant1 mints NFT
    await raffle.connect(participant1).mint();
    expect(await raffle.balanceOf(participant1.address)).to.equal(1);

    // Participant2 mints NFT
    await raffle.connect(participant2).mint();
    expect(await raffle.balanceOf(participant2.address)).to.equal(1);

    // Participant1 tries to get a second ticket — should revert
    await expect(
      raffle.connect(participant1).mint()
    ).to.be.revertedWith("You can only mint once every 24 hours");

    // Before the raffle is finished, participants do not have prize tokens
    expect(await erc20.balanceOf(participant1.address)).to.equal(0);
    expect(await erc20.balanceOf(participant2.address)).to.equal(0);

    // Manager finishes the raffle via factory
    await factory.connect(manager).finishRaffle(raffleId);

    // Check if the prize was received by either participant1 or participant2
    const balance1 = await erc20.balanceOf(participant1.address);
    const balance2 = await erc20.balanceOf(participant2.address);
    const winner = await raffle.winnerAddress();

    expect(
      (balance1 === 500n && balance2 === 0n && winner === participant1.address) ||
      (balance2 === 500n && balance1 === 0n && winner === participant2.address)
    ).to.be.true;
  });
});
