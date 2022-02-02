//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Distribution {
    address public owner;
    event Transfer(address recipient, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    function fund() public payable returns (uint256) {
        return address(this).balance;
    }

    function distributeDonation(address[] memory _recipients, uint256[] memory _amounts) public onlyOwner {
        require(_recipients.length == _amounts.length, "must have the same length");

        uint256 total = 0;

        for (uint256 i = 0; i < _amounts.length; i++) {
            total = total + _amounts[i];
        }

        require(address(this).balance >= total, "must have balance to distribute");

        for (uint256 i = 0; i < _recipients.length; i++) {
            address recipient = _recipients[i];
            uint256 amount = _amounts[i];

            require(recipient != address(0), "must have a valid address");

            payable(recipient).transfer(amount);

            emit Transfer(recipient, amount);
        }
    }
}
