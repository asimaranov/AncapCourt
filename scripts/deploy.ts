import { ethers } from "hardhat";

async function main() {
  const minimumQuorum = ethers.utils.parseEther("150.0");
  const debatingPeriodDuration = 24 * 60 * 60;
  const [chairPerson] = await ethers.getSigners();

  const ItPubToken = await ethers.getContractFactory("ItPubToken");
  const itPubToken = await ItPubToken.deploy();

  await itPubToken.deployed();

  console.log("Token deployed to:", itPubToken.address);

  
  const DAOContract = await ethers.getContractFactory("DAO");
  const DAO = await DAOContract.deploy(chairPerson.address, itPubToken.address, minimumQuorum, debatingPeriodDuration);

  await DAO.deployed();

  console.log(`DAO deployed to: ${DAO.address}. Constructor args:`, chairPerson.address, itPubToken.address, minimumQuorum, debatingPeriodDuration);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
