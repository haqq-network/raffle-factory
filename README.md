# raffle-factory

Solidity smart contract system for decentralized raffles (lotteries) with NFT tickets and ERC20 prizes.

## Architecture
- **RaffleFactory**: UUPS-upgradeable proxy contract for deploying and managing individual raffles.
- **RaffleNFT**: ERC721 contract representing a single raffle. Each NFT is a ticket. The winner receives the ERC20 prize.
- **ERC20TestToken**: Simple ERC20 token for testing.

## Features
- Factory pattern: deploys new raffles as separate contracts.
- Each raffle uses NFT tickets (ERC721).
- Prize is any ERC20 token.
- Upgradeable architecture (UUPS proxy).
- Access control: only managers can create/finish raffles, only admin can withdraw stuck tokens.
- Emergency withdraw for admin.

## Project Structure
```
contracts/
  RaffleFactory.sol   # Factory contract (UUPS proxy)
  RaffleNFT.sol       # Raffle contract (ERC721)
  test/ERC20.sol      # Test ERC20 token

test/
  Factory.js          # Full test suite (Chai + Hardhat)

deploy/
  deploy.js           # Deployment script for RaffleFactory (and artifact saving)

deployments/
  {network}/
    RaffleFactory.json   # Full JSON: address, abi, bytecode, txHash, receipt
    RaffleNFT.json       # ABI and bytecode for frontend and factory
    # (you can similarly add ERC20TestToken.json if needed)
```

## Deployment (Hardhat)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your network and private key in `hardhat.config.js` or via `.env`:
   ```js
   // Example for haqq-testedge2
   networks: {
     'haqq-testedge2': {
       url: 'https://rpc.eth.testedge2.haqq.network',
       accounts: [process.env.PRIVATE_KEY],
     },
   }
   ```

3. Deploy RaffleFactory as UUPS proxy using a script:
   ```bash
   npx hardhat run deploy/deploy.js --network haqq-testedge2
   ```
   After deployment, all contract artifacts (address, abi, bytecode, txHash, receipt) for RaffleFactory and RaffleNFT will be saved in `deployments/{network}/`.

## Example: Creating a Raffle

1. Grant MANAGER_ROLE to your address (from admin):
   ```js
   await factory.grantRole(await factory.MANAGER_ROLE(), managerAddress);
   ```
2. Approve ERC20 tokens to the factory from manager:
   ```js
   await erc20.approve(factory.address, amount);
   ```
3. Create a new raffle:
   ```js
   await factory.createRaffle(
     "MyRaffle", "MRFL", "https://example.com/metadata.json",
     erc20.address, amount, 3600 // 1 hour duration
   );
   ```

## Verifying contracts

To verify on haqq-testedge2:
```bash
npx hardhat verify --network haqq-testedge2 0xYOUR_CONTRACT_ADDR
```
To verify on haqq-mainnet:
```bash
npx hardhat verify --network haqq-mainnet 0xYOUR_CONTRACT_ADDR
```

## Scripts

### Upgrade Contract
Upgrades RaffleFactory contract via UUPS proxy.

```bash
# Set proxy address
export PROXY_ADDRESS=0x1234567890123456789012345678901234567890

# Run upgrade
npx hardhat run scripts/upgrade.js --network <network_name>
```

**Examples:**
```bash
# Testnet
PROXY_ADDRESS=0x3Bfb78027A66df3180E7174E6f77d37b16DF252b npx hardhat run scripts/upgrade.js --network haqq-testedge2

# Local
PROXY_ADDRESS=0x1234567890123456789012345678901234567890 npx hardhat run scripts/upgrade.js --network localhost
```

**Requirements:**
- Contract must be deployed as UUPS proxy
- Valid proxy address
- Admin role permissions

## Tests
Run all tests:
```bash
npx hardhat test
```