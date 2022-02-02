/* eslint-disable node/no-missing-import */
import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Donate } from "../typechain";
import { BigNumber } from "ethers";

type MakeDonationParams = {
  contract: Donate;
  donater: SignerWithAddress;
  amount?: BigNumber | number;
};

const makeDonation = async ({ contract, donater, amount }: MakeDonationParams) =>
  contract.connect(donater).donate("nicolaslopes7/crypteon-contracts", {
    value: amount || ethers.utils.parseEther("0.1"),
  });

const makeSut = async () => {
  const [owner, distributionContract, randomAddress] = await ethers.getSigners();
  const donationFactory = await ethers.getContractFactory("Donate");
  const DonationContract = await donationFactory.deploy();

  const setDistributionContractTxn = await DonationContract.setDistributionContract(distributionContract.address);
  await setDistributionContractTxn.wait();

  return { DonationContract, owner, distributionContract, randomAddress };
};

describe("Donation", function () {
  describe("setDistributionContract", async () => {
    it("Should update the distributionContract address if the sender is the owner", async () => {
      const { DonationContract, distributionContract } = await makeSut();
      await DonationContract.setDistributionContract(distributionContract.address);
      const currentDistributionContract = await DonationContract.distributionContract();

      expect(currentDistributionContract).to.be.eql(distributionContract.address);
    });

    it("Should return an error when try to update the distributionContract address and the sender isn't the owner", async () => {
      const { DonationContract, distributionContract, randomAddress } = await makeSut();

      const transaction = DonationContract.connect(randomAddress).setDistributionContract(distributionContract.address);
      await expect(transaction).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("getAllDonations", async () => {
    it("Should return an error when someone try to get the donations and isn't the owner", async () => {
      const { DonationContract, randomAddress } = await makeSut();
      const transactionPromise = DonationContract.connect(randomAddress).getAllDonations();

      await expect(transactionPromise).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("Should list the donations array", async () => {
      const { DonationContract } = await makeSut();
      const donations = await DonationContract.getAllDonations();

      expect(donations.length).to.equal(0);
    });
  });

  describe("donate", async () => {
    describe("With bad arguments", () => {
      it("Should return an error when the value is lower or equal than 100 WEI", async () => {
        const { DonationContract, randomAddress } = await makeSut();
        const transaction = makeDonation({ contract: DonationContract, donater: randomAddress, amount: 100 });

        await expect(transaction).to.be.revertedWith("must be greater than 100 WEI");
      });
    });

    describe("With correct arguments", async () => {
      it("Should split correctly the payment from the distributionContract and the owner ", async () => {
        const { DonationContract, distributionContract, owner, randomAddress } = await makeSut();

        const [previousOwnerBalance, previousDistributionContractBalance] = await Promise.all([
          owner.getBalance(),
          distributionContract.getBalance(),
        ]);

        await makeDonation({ contract: DonationContract, donater: randomAddress });

        const [currentOwnerBalance, currentDistributionContractBalance] = await Promise.all([
          owner.getBalance(),
          distributionContract.getBalance(),
        ]);

        const ownerBalanceDiff = ethers.utils.formatEther(currentOwnerBalance.sub(previousOwnerBalance));
        const distributionContractBalanceDiff = ethers.utils.formatEther(
          currentDistributionContractBalance.sub(previousDistributionContractBalance)
        );

        expect(ownerBalanceDiff).to.be.eql("0.002");
        expect(distributionContractBalanceDiff).to.be.eql("0.098");
      });

      it("Should emit an NewDonationEvent", async () => {
        const { randomAddress, DonationContract } = await makeSut();

        const transaction = await makeDonation({ contract: DonationContract, donater: randomAddress });

        expect(transaction)
          .to.emit(DonationContract, "NewDonation")
          .withArgs([randomAddress.address, "nicolaslopes7/crypteon-contracts", ethers.utils.parseEther("0.1")]);
      });

      it("Should add to in memory donation array", async () => {
        const { DonationContract, randomAddress } = await makeSut();

        await makeDonation({
          contract: DonationContract,
          donater: randomAddress,
        });

        const donations = await DonationContract.getAllDonations();

        expect(donations.length).to.equal(1);
      });
    });
  });
});
