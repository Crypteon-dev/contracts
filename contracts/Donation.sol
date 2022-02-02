//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Donate {
  struct Donation {
    address sender;
    string repoId;
    uint256 amount;
    uint256 timestamp;
  }

  event NewDonation(Donation _donation);

  address public owner;
  address payable public distributionContract = payable(0xB0C052c271296f18Be342AcC3Ba8E3ACe9907d90);
  Donation[] public donations;

  constructor() {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Ownable: caller is not the owner");
    _;
  }

  function setDistributionContract(address payable to) public onlyOwner {
    distributionContract = to;
  }

  function getAllDonations() public view onlyOwner returns (Donation[] memory) {
    return donations;
  }

  function donate(string memory _repoId) public payable {
    require(msg.value > 100, "must be greater than 100 WEI");

    Donation memory createdDonation = Donation(msg.sender, _repoId, msg.value, block.timestamp);

    payable(owner).transfer((msg.value * 2) / 100);
    payable(distributionContract).transfer((msg.value * 98) / 100);

    emit NewDonation(createdDonation);
    donations.push(createdDonation);
  }
}
