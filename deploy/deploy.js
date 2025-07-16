const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy RaffleFactory as UUPS proxy
  const RaffleFactory = await ethers.getContractFactory("RaffleFactory");
  const factory = await upgrades.deployProxy(RaffleFactory, [], { kind: "uups" });
  await factory.waitForDeployment();
  const address = factory.target.toString();
  console.log("RaffleFactory (proxy) deployed to:", address);

  // Get deployment tx and receipt
  const tx = factory.deploymentTransaction();
  const receipt = await ethers.provider.getTransactionReceipt(factory.deploymentTransaction().hash);

  // Read artifact for ABI and bytecode
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "RaffleFactory.sol", "RaffleFactory.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Prepare output JSON
  const output = {
    address,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    transactionHash: tx.hash,
    receipt,
  };

  // Create network-specific deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments", network.name);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(deploymentsDir, "RaffleFactory.json"),
    JSON.stringify(output, null, 2)
  );
  console.log(`Full deployment info saved to deployments/${network.name}/RaffleFactory.json`);

  // Save RaffleNFT ABI/bytecode for frontend and factory usage
  const nftArtifactPath = path.join(__dirname, "..", "artifacts", "contracts", "RaffleNFT.sol", "RaffleNFT.json");
  const nftArtifact = JSON.parse(fs.readFileSync(nftArtifactPath, "utf8"));
  const nftOutput = {
    abi: nftArtifact.abi,
    bytecode: nftArtifact.bytecode,
  };
  fs.writeFileSync(
    path.join(deploymentsDir, "RaffleNFT.json"),
    JSON.stringify(nftOutput, null, 2)
  );
  console.log(`RaffleNFT ABI/bytecode saved to deployments/${network.name}/RaffleNFT.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 