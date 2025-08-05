const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the proxy address from environment variable
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS environment variable is required");
  }

  console.log("Upgrading RaffleFactory proxy at:", proxyAddress);
  console.log("Network:", network.name);

  // Get the new implementation contract factory
  const RaffleFactory = await ethers.getContractFactory("RaffleFactory");
  
  // Upgrade the proxy
  const upgraded = await upgrades.upgradeProxy(proxyAddress, RaffleFactory);
  await upgraded.waitForDeployment();
  
  console.log("RaffleFactory upgraded successfully!");
  console.log("Proxy address:", upgraded.target);
  
  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(upgraded.target);
  console.log("Implementation address:", implementationAddress);
  
  // Get transaction info if available
  const deploymentTx = upgraded.deploymentTransaction();
  if (deploymentTx) {
    console.log("Upgrade transaction hash:", deploymentTx.hash);
  }

  // Read artifact for ABI and bytecode
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "RaffleFactory.sol", "RaffleFactory.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Prepare output JSON (same format as deploy script)
  const output = {
    address: upgraded.target,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    transactionHash: deploymentTx?.hash || "N/A",
    implementationAddress,
  };

  // Create network-specific deployments folder
  const deploymentsDir = path.join(__dirname, "..", "deployments", network.name);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save RaffleFactory info (overwrite existing file)
  fs.writeFileSync(
    path.join(deploymentsDir, "RaffleFactory.json"),
    JSON.stringify(output, null, 2)
  );
  console.log(`RaffleFactory info saved to deployments/${network.name}/RaffleFactory.json`);

  // Save RaffleNFT ABI/bytecode for frontend and factory usage (overwrite existing file)
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

  // Basic contract verification after upgrade
  console.log("\n🔍 Running basic contract verification after upgrade...");
  
  try {
    // Check if contract is accessible
    const managerRole = await upgraded.MANAGER_ROLE();
    console.log("✅ MANAGER_ROLE accessible:", managerRole);
    
    // Check if admin role is set correctly
    const adminRole = await upgraded.DEFAULT_ADMIN_ROLE();
    console.log("✅ DEFAULT_ADMIN_ROLE accessible:", adminRole);
    
    // Check if deployer has admin role
    const [deployer] = await ethers.getSigners();
    const hasAdminRole = await upgraded.hasRole(adminRole, deployer.address);
    console.log("✅ Deployer has admin role:", hasAdminRole);
    
    // Check raffles count
    const rafflesCount = await upgraded.rafflesCount();
    console.log("✅ Raffles count:", rafflesCount.toString());
    
    console.log("✅ All basic verifications passed!");
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 