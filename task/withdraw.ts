import { task, types } from "hardhat/config";

task("withdraw", "Withdraw tokens from the DAO")
    .addParam("contractAddr", "Address of the deployed DAO contract", "")
    .addParam("amount", "Amount of tokens to withdraw", "0.01")

    .setAction(async (taskArgs, hre) => {
        const DAO = await hre.ethers.getContractAt("DAO", taskArgs['contractAddr']);
        const amountToDeposit = hre.ethers.utils.parseEther(taskArgs['amount']);

        const withdrawTransaction = await DAO.withdraw(amountToDeposit);

        const rc = await withdrawTransaction.wait();
        const withdrawedEvent = rc!.events!.find(e => e.event == "Withdraw");
        const [user, amount] = withdrawedEvent!.args!;
    
        console.log(`You successfully withdrawed ${hre.ethers.utils.formatEther(amount)} tokens`);
    });
