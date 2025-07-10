// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RaffleNFT is ERC721, ReentrancyGuard {
    address public prizeToken;
    uint256 public amount;
    bool public started;
    string private baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC721(name_, symbol_) {
        baseTokenURI = tokenURI_;
        started = false;
    }

    function startRaffle(
        address prizeToken_,
        uint256 amount_
    ) external nonReentrant {
        require(prizeToken_ != address(0), "Zero address");
        require(!started, "Already started");
        started = true;
        prizeToken = prizeToken_;
        amount = amount_;
        require(
            IERC20(prizeToken).transferFrom(msg.sender, address(this), amount),
            "ERC20 transfer failed"
        );
    }

    function tokenURI(uint256) public view override returns (string memory) {
        return baseTokenURI;
    }
}
