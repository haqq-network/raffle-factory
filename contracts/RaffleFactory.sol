// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./RaffleNFT.sol";

contract RaffleFactory is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    address[] public raffles;

    event RaffleCreated(address indexed raffleAddress, address indexed creator);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "Not manager");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    // Reentrancy guarded via `nonReentrant` modifier
    // slither-disable-next-line reentrancy-benign
    function createRaffle(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_,
        address prizeToken,
        uint256 amount
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
        raffle.startRaffle(prizeToken, amount);
        emit RaffleCreated(address(raffle), msg.sender);
        return address(raffle);
    }
}
