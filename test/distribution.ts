import { expect } from "chai";
import { ethers } from "hardhat";

const generateAmountArray = (length: number) =>
  Array.apply(null, Array(length)).map(() => Math.floor(Math.random() * (100 - 1) + 1));

const makeSut = async () => {
  const [, randomAddress, ...addresses] = await ethers.getSigners();
  const distributionFactory = await ethers.getContractFactory("Distribution");
  const DistributionContract = await distributionFactory.deploy();

  await DistributionContract.fund({
    value: ethers.utils.parseEther("1"),
  });

  return {
    DistributionContract,
    randomAddress,
    addresses: addresses.map(({ address }) => address),
    amounts: generateAmountArray(addresses.length),
  };
};

describe("Distribution", () => {
  describe("fund", () => {
    it("should add the value sent on fund function to the contract balance", async () => {
      const { DistributionContract } = await makeSut();

      const contractSigner = await ethers.getSigner(DistributionContract.address);
      const balanceBefore = await contractSigner.getBalance();

      await DistributionContract.fund({ value: ethers.utils.parseEther("10") });

      const balanceAfter = await contractSigner.getBalance();

      const balanceDiff = ethers.utils.formatEther(balanceAfter.sub(balanceBefore));

      expect(balanceDiff).to.equals("10.0");
    });
  });
  describe("distributeDonation", () => {
    describe("With bad arguments", () => {
      it("should return an error because someone who aren't the owner is calling the function", async () => {
        const { DistributionContract, randomAddress, addresses, amounts } = await makeSut();
        const transaction = DistributionContract.connect(randomAddress).distributeDonation(addresses, amounts);

        await expect(transaction).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("should return an error because recipients array and amount array has different lenght", async () => {
        const { DistributionContract, addresses, amounts } = await makeSut();

        const transaction = DistributionContract.distributeDonation(addresses, [...amounts, 100]);

        await expect(transaction).to.be.revertedWith("must have the same length");
      });

      it("should return an error because the balance isn't enough to pay all the recipients", async () => {
        const { DistributionContract, addresses, amounts, randomAddress } = await makeSut();

        const transaction = DistributionContract.distributeDonation(
          [...addresses, randomAddress.address],
          [...amounts, ethers.utils.parseEther("2")]
        );

        await expect(transaction).to.be.revertedWith("must have balance to distribute");
      });

      it("should return an error because the recipients array has an invalid address", async () => {
        const { DistributionContract } = await makeSut();

        const transaction = DistributionContract.distributeDonation(
          ["0x0000000000000000000000000000000000000000"],
          [ethers.utils.parseEther("0.1")]
        );

        await expect(transaction).to.be.revertedWith("must have a valid address");
      });
    });
    describe("With right arguments", () => {
      it("should distribute the correct amount over all the recipients", async () => {
        const { DistributionContract, addresses, amounts } = await makeSut();

        const signers = await Promise.all(addresses.map((address) => ethers.getSigner(address)));
        const beforeBalances = await Promise.all(signers.map((signer) => signer.getBalance()));

        await DistributionContract.distributeDonation(addresses, amounts);

        const afterBalances = await Promise.all(signers.map((signer) => signer.getBalance()));

        expect(
          addresses.every((_, index) => {
            const balanceDiff = afterBalances[index].sub(beforeBalances[index]);
            return balanceDiff.toString() === amounts[index].toString();
          })
        ).to.equals(true);
      });

      it("should emit a transfer event for each recipient", async () => {
        const { DistributionContract, addresses, amounts } = await makeSut();

        const transaction = await DistributionContract.distributeDonation(addresses, amounts);
        const transactionReceipt = await transaction.wait();

        expect(transactionReceipt.events?.length).to.equals(addresses.length);
      });
    });
  });
});
