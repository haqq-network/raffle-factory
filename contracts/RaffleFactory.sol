// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./RaffleNFT.sol";

contract RaffleFactory is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    /// @notice Role identifier for managers
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    /// @notice Array of all deployed raffle contract addresses
    address[] public raffles;

    event RaffleCreated(uint256 indexed raffleId, address indexed raffleAddress, address indexed creator);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the RaffleFactory contract and sets up roles for upgradeability and access control.
    /// @dev This function can only be called once. Grants DEFAULT_ADMIN_ROLE to the deployer.
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Authorizes contract upgrades. Only callable by admin.
    /// @dev Required by UUPSUpgradeable. Restricts upgradeability to admin role.
    /// @param newImplementation The address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    /// @notice Modifier to restrict access to only accounts with MANAGER_ROLE.
    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "Not manager");
        _;
    }

    /// @notice Modifier to restrict access to only accounts with DEFAULT_ADMIN_ROLE.
    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    /// @notice Creates a new RaffleNFT contract and starts a raffle with the specified parameters.
    /// @dev Transfers prize tokens from the manager, deploys a new RaffleNFT, approves it, and starts the raffle.
    /// @param name_ The name of the NFT collection.
    /// @param symbol_ The symbol of the NFT collection.
    /// @param tokenURI_ The base URI for the NFT metadata.
    /// @param prizeToken The address of the ERC20 token to be used as a prize.
    /// @param amount The amount of ERC20 tokens to be used as a prize.
    /// @param durationInSeconds The duration of the raffle in seconds.
    /// @return The address of the newly created RaffleNFT contract.
    // Reentrancy is guarded via the `nonReentrant` modifier
    // slither-disable-next-line reentrancy-benign
    function createRaffle(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_,
        address prizeToken,
        uint256 amount,
        uint256 durationInSeconds
    ) external onlyManager nonReentrant returns (address) {
        // Transfer tokens from user to factory
        require(
            IERC20(prizeToken).transferFrom(msg.sender, address(this), amount),
            "Token transfer to factory failed"
        );
        // Deploy RaffleNFT
        RaffleNFT raffle = new RaffleNFT(name_, symbol_, tokenURI_);
        raffles.push(address(raffle));
        // Approve RaffleNFT to spend tokens
        require(
            IERC20(prizeToken).approve(address(raffle), amount),
            "Approve to raffle failed"
        );
        // Start the raffle (transfer tokens to the contract)
        raffle.start(prizeToken, amount, durationInSeconds);
        uint256 raffleId = raffles.length - 1;
        emit RaffleCreated(raffleId, address(raffle), msg.sender);
        return address(raffle);
    }

    /// @notice Finishes an active raffle and determines the winner.
    /// @dev Only callable by manager. Calls finish() on the specified RaffleNFT contract.
    /// @param raffleId The index of the raffle in the raffles array.
    function finishRaffle(uint256 raffleId) external onlyManager nonReentrant {
        require(raffleId < raffles.length, "Raffle does not exist");
        address raffleAddr = raffles[raffleId];
        RaffleNFT raffle = RaffleNFT(raffleAddr);
        require(raffle.winnerAddress() == address(0), "Winner already determined");
        require(raffle.started(), "Raffle not started");
        raffle.finish();
    }
}
