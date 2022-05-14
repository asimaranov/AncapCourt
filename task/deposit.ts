import { task, types } from "hardhat/config";

task("deposit", "Deposit tokens to the DAO")
    .addParam("contractAddr", "Address of the deployed DAO contract", "")
    .addParam("tokenAddr", "Address of the deployed Token contract to approve", "")
    .addParam("amount", "Amount of tokens to deposit", "0.01")

    .setAction(async (taskArgs, hre) => {
        const DAO = await hre.ethers.getContractAt("DAO", taskArgs['contractAddr']);
        const token = await hre.ethers.getContractAt("ItPubToken", taskArgs['tokenAddr']);
        const amountToDeposit = hre.ethers.utils.parseEther(taskArgs['amount']);
        await token.approve(DAO.address, amountToDeposit)
        const depositTransaction = await DAO.deposit(amountToDeposit);

        const rc = await depositTransaction.wait();
        const depositedEvent = rc!.events!.find(e => e.event == 'Deposited');
        const [user, amount] = depositedEvent!.args!;
        console.log(`You successfully deposited ${hre.ethers.utils.formatEther(amount)} tokens`);
    });
