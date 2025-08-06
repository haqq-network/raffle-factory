// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RaffleNFT is ERC721, ReentrancyGuard, Ownable {
    /// @notice Address of the token used as a prize
    address public prizeToken;
    /// @notice Amount of tokens used as a prize
    uint256 public prizeAmount;
    /// @notice Amount of tokens transferred to the winner
    uint256 public winnerAmount;
    /// @notice Flag indicating whether the raffle has started
    bool public started;
    /// @notice Raffle start time (timestamp, unix time)
    uint256 public startTime;
    /// @notice Raffle end time (timestamp, unix time)
    uint256 public endTime;
    /// @notice Base URI for NFT metadata
    string private baseTokenURI;
    /// @notice Total number of tokens minted
    uint256 public totalSupply;
    /// @notice Mapping from token ID to owner address (for quick access)
    mapping(uint256 => address) public tokenOwners;
    /// @notice Last mint time (timestamp, unix time) for each address
    mapping(address => uint256) public lastMintTime;
    /// @notice Address of the raffle winner (0x0 if not determined)
    address public winnerAddress;
    /// @notice Contract version for compatibility checking
    string public constant VERSION = "0.0.3";

    /// @notice Emitted when a raffle starts
    /// @param prizeToken The address of the ERC20 token used as prize
    /// @param amount The amount of tokens locked as prize
    event Start(address indexed prizeToken, uint256 amount);
    
    /// @notice Emitted when a raffle finishes and winner is determined
    /// @param prizeToken The address of the ERC20 token that was used as prize
    /// @param amount The amount of tokens transferred to the winner
    /// @param winner The address of the raffle winner
    event Finish(address indexed prizeToken, uint256 amount, address indexed winner);

    /// @notice Constructor for the RaffleNFT contract.
    /// @param name_ The name of the NFT collection.
    /// @param symbol_ The symbol of the NFT collection.
    /// @param tokenURI_ The base URI for the NFT metadata.
    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        baseTokenURI = tokenURI_;
        started = false;
    }

    /// @notice Starts the raffle by locking the prize tokens in the contract and sets the end time.
    /// @dev Transfers prize tokens to the contract and sets endTime.
    /// @param prizeToken_ Address of the ERC20 token to be used as a prize
    /// @param amount_ Amount of tokens to be used as a prize
    /// @param durationInSeconds Duration of the raffle in seconds
    function start(
        address prizeToken_,
        uint256 amount_,
        uint256 durationInSeconds
    ) external onlyOwner nonReentrant {
        require(prizeToken_ != address(0), "Zero address");
        require(!started, "Already started");
        started = true;
        startTime = block.timestamp;
        prizeToken = prizeToken_;
        prizeAmount = amount_;
        endTime = block.timestamp + durationInSeconds;
        require(
            IERC20(prizeToken).transferFrom(msg.sender, address(this), prizeAmount),
            "ERC20 transfer failed"
        );
        emit Start(prizeToken_, amount_);
    }

    /// @notice Finishes the raffle, selects a winner, and transfers the prize.
    /// @dev Uses pseudorandomness based on on-chain variables. Only callable by the owner.
    function finish() external nonReentrant {
        require(started, "Raffle not started");
        // slither-disable-next-line timestamp
        require(block.timestamp >= endTime, "Raffle not ended");
        require(prizeAmount > 0, "No prize");
        require(winnerAddress == address(0), "Already finished");

        address winner = owner();

        if (totalSupply > 0) {
            uint256 winnerTokenId = uint256(
            keccak256(abi.encodePacked(
                block.prevrandao, 
                address(this),
                tx.gasprice,
                gasleft(),
                totalSupply
                ))
            ) % totalSupply;
            winner = ownerOf(winnerTokenId);
            winnerAddress = winner;
        }
        require(winner != address(0), "Winner not found");

        winnerAmount = prizeAmount;
        prizeAmount = 0;
        started = false;

        require(
            IERC20(prizeToken).transfer(winner, winnerAmount),
            "ERC20 transfer to winner failed"
        );
        emit Finish(prizeToken, winnerAmount, winner);
    }

    /// @notice Returns the current prize amount (active + paid)
    /// @return The total amount of tokens (current prize + paid prize)
    function amount() public view returns (uint256) {
        return prizeAmount + winnerAmount;
    }

    /// @notice Allows a user to mint a raffle ticket (NFT) if 24 hours have passed since their last mint.
    /// @dev Each address can mint only once every 24 hours.
    function mint() public {
        require(started, "Raffle not started");
        require(block.timestamp <= endTime, "Raffle ended");
        require(msg.sender != address(0), "Zero address");
        // We intentionally use block.timestamp to limit NFT minting to once every 24 hours per address.
        // This is acceptable for our use case, as precise cryptographic unpredictability is not required here.
        // slither-disable-next-line timestamp
        require(
            block.timestamp - lastMintTime[msg.sender] >= 1 days,
            "You can only mint once every 24 hours"
        );
        uint256 tokenId = totalSupply;
        _mint(msg.sender, tokenId);
        tokenOwners[tokenId] = msg.sender;
        totalSupply++;
        lastMintTime[msg.sender] = block.timestamp;
    }

    /// @notice Returns the base URI for the NFT metadata.
    /// @dev param - The ID of the token (unused, always returns the same URI).
    /// @return The base token URI as a string.
    function tokenURI(uint256) public view override returns (string memory) {
        return baseTokenURI;
    }

    /// @notice Updates the base token URI for the NFT collection.
    /// @dev Only callable by the owner.
    /// @param tokenURI_ The new base URI for the NFT metadata.
    function updateTokenURI(string memory tokenURI_) external onlyOwner {
        baseTokenURI = tokenURI_;
    }

    /// @notice Internal function to update token ownership mapping on transfer.
    /// @dev Overrides the ERC721 _update function to track tokenOwners mapping.
    /// @param to The address receiving the token.
    /// @param tokenId The ID of the token being transferred.
    /// @param auth The address initiating the transfer.
    /// @return The address of the previous owner.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        require(to != address(0), "Zero address");
        address from = super._update(to, tokenId, auth);
        if (from != to && to != address(0)) {
            tokenOwners[tokenId] = to;
        }
        return from;
    }
}
