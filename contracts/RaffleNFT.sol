// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RaffleNFT is ERC721, ReentrancyGuard, Ownable {
    address public prizeToken;
    uint256 public amount;
    bool public started;
    string private baseTokenURI;
    uint256 private _tokenIdCounter;
    mapping(uint256 => address) public tokenOwners;
    mapping(address => uint256) public lastMintTime;
    address public winnerAddress;

    event Start(address indexed prizeToken, uint256 amount);
    event Finish(address indexed prizeToken, uint256 amount, address indexed winner);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        baseTokenURI = tokenURI_;
        started = false;
    }

    function start(
        address prizeToken_,
        uint256 amount_
    ) external onlyOwner nonReentrant {
        require(prizeToken_ != address(0), "Zero address");
        require(!started, "Already started");
        started = true;
        prizeToken = prizeToken_;
        amount = amount_;
        require(
            IERC20(prizeToken).transferFrom(msg.sender, address(this), amount),
            "ERC20 transfer failed"
        );
        emit Start(prizeToken_, amount_);
    }

    function finish() external onlyOwner nonReentrant {
        require(started, "Raffle not started");
        require(_tokenIdCounter > 0, "No participants");
        require(amount > 0, "No prize");

        uint256 winnerTokenId = uint256(
            keccak256(abi.encodePacked(
                block.prevrandao, 
                address(this),
                tx.gasprice,
                gasleft(),
                _tokenIdCounter
                ))
        ) % _tokenIdCounter;
        address winner = ownerOf(winnerTokenId);
        require(winner != address(0), "Winner not found");
        winnerAddress = winner;

        uint256 prize = amount;
        amount = 0;
        started = false;
        require(
            IERC20(prizeToken).transfer(winner, prize),
            "ERC20 transfer to winner failed"
        );
        emit Finish(prizeToken, prize, winner);
    }

    function mint() public {
        // We intentionally use block.timestamp to limit NFT minting to once every 24 hours per address.
        // This is acceptable for our use case, as precise cryptographic unpredictability is not required here.
        // slither-disable-next-line timestamp
        require(
            block.timestamp - lastMintTime[msg.sender] >= 1 days,
            "You can only mint once every 24 hours"
        );
        uint256 tokenId = _tokenIdCounter;
        _mint(msg.sender, tokenId);
        tokenOwners[tokenId] = msg.sender;
        _tokenIdCounter++;
        lastMintTime[msg.sender] = block.timestamp;
    }

    function tokenURI(uint256) public view override returns (string memory) {
        return baseTokenURI;
    }

    function updateTokenURI  (string memory tokenURI_) external onlyOwner {
        baseTokenURI = tokenURI_;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != to && to != address(0)) {
            tokenOwners[tokenId] = to;
        }
        return from;
    }
}
