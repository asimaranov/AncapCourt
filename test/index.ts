import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat";

function getTestCallData(userToTransfer: string, amountToTransfer: BigNumber) {
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  ];

  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('transfer', [userToTransfer, amountToTransfer]);
}

function genSetMinimumQuorumCallData(newMinimumQuorum: BigNumber){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newMinimumQuorum",
        "type": "uint256"
      }
    ],
    "name": "setMinimumQuorum",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setMinimumQuorum', [newMinimumQuorum]);
}

function genSetChairPersonCallData(newChairPerson: string){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "address",
        "name": "newChairPerson",
        "type": "address"
      }
    ],
    "name": "setChairPerson",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setChairPerson', [newChairPerson]);
}

function genSetDebatingPeriodDurationCallData(newDebatingPeriodDuration: number){
  var jsonAbi = [{
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newDebatingPeriodDuration",
        "type": "uint256"
      }
    ],
    "name": "setDebatingPeriodDuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }];
  const iface = new ethers.utils.Interface(jsonAbi);
  return iface.encodeFunctionData('setDebatingPeriodDuration', [newDebatingPeriodDuration]);
}

describe("Test DAO", function () {

  let DAO: Contract;
  let token: Contract;
  let owner: SignerWithAddress, chairPerson: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, user3: SignerWithAddress;

  const testMinimumQuorum = ethers.utils.parseEther("150.0");
  const testDebatingPeriodDuration = 24 * 60 * 60;

  const testUser1Amount = ethers.utils.parseEther("100.0");
  const testUser2Amount = ethers.utils.parseEther("200.0");
  const testUser3Amount = ethers.utils.parseEther("1.0");

  let testCallData: string;
  let testRecepient: string;

  const testDescription = "Test description";

  const firstProposalId = 0;
  const secondProposalId = 1;

  enum FinishedProposalStatus {
    Rejected = 0,
    RejectedTooFewQuorum = 1,
    ConfirmedCallSucceeded = 2,
    ConfirmedCallFailded = 3
  }

  this.beforeEach(async () => {
    [owner, chairPerson, user1, user2, user3] = await ethers.getSigners();

    const TokenContract = await ethers.getContractFactory("ItPubToken");
    token = await TokenContract.deploy();
    testRecepient = token.address;

    await token.transfer(user1.address, testUser1Amount);
    await token.transfer(user2.address, testUser2Amount);
    const DAOContract = await ethers.getContractFactory("DAO");
    DAO = await DAOContract.deploy(chairPerson.address, token.address, testMinimumQuorum, testDebatingPeriodDuration);
    await DAO.deployed();
    testCallData = getTestCallData(user3.address, testUser3Amount);
  });

  it("Test deposit behaviour", async function () {
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    const depositTransaction = await DAO.connect(user1).deposit(testUser1Amount);
    const rc = await depositTransaction.wait();
    const depositedEvent = await rc.events.find((e: { event: string }) => e.event == 'Deposited');
    const [user, amount] = depositedEvent.args;
    expect(user).to.equal(user1.address);
    expect(amount).to.equal(amount).to.equal(testUser1Amount);
  });

  it("Check that only chair person can propose", async () => {
    await expect(DAO.connect(user1).addProposal(testCallData, testRecepient, testDescription)).to.be.revertedWith("Only chairperson can do that");
  });

  it("Check add proposal behaviour", async () => {
    const addProposalTransaction = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc = await addProposalTransaction.wait();
    const proposedEvent = rc.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = proposedEvent.args;
    expect(proposalId).to.equal(firstProposalId);
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(0);
    expect(deadline * 1000 > Date.now());
    expect(recipient).to.equal(testRecepient);
    expect(callData).to.equal(testCallData);
    expect(description).to.equal(testDescription);
  });

  it("Check that proposals have different id", async () => {
    const addProposalTransaction1 = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc1 = await addProposalTransaction1.wait();
    const proposedEvent1 = rc1.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId1,]] = proposedEvent1.args;

    const addProposalTransaction2 = await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const rc2 = await addProposalTransaction2.wait();
    const proposedEvent2 = rc2.events.find((e: { event: string }) => e.event == 'Proposed');
    const [[proposalId2,]] = proposedEvent2.args;

    expect(proposalId1).to.equal(firstProposalId);
    expect(proposalId2).to.equal(secondProposalId);
  });

  it("Check that user can't vote if haven't deposited any tokens", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await expect(DAO.connect(user1).vote(firstProposalId, false)).revertedWith("No suffrage");
  });

  it("Check that user can't vote after deadline", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await expect(DAO.connect(user1).vote(firstProposalId, false)).revertedWith("Proposal voting ended");
  });

  it("Check voting for behaviour", async () => {
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
    expect(votesAgainst).to.equal(0);
  });

  it("Check voting against behaviour", async () => {
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, true);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(testUser1Amount);

  });

  it("Check voting for and against behaviour", async () => {
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await token.connect(user2).approve(DAO.address, testUser2Amount);

    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user2).deposit(testUser2Amount);

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(user1).vote(firstProposalId, false);
    const votingTransaction = await DAO.connect(user2).vote(firstProposalId, true);

    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, votesAgainst, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
    expect(votesAgainst).to.equal(testUser2Amount);

  });

  it("Check that user can't vote twice without new depposit", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await expect(DAO.connect(user1).vote(firstProposalId, false)).to.be.revertedWith("No suffrage");;
  });


  it("Check that user can vote second time after new deposit", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount.div(2));
    await DAO.connect(user1).deposit(testUser1Amount.div(2));
    await DAO.connect(user1).vote(firstProposalId, false);

    await token.connect(user1).approve(DAO.address, testUser1Amount.div(2));
    await DAO.connect(user1).deposit(testUser1Amount.div(2));

    const votingTransaction = await DAO.connect(user1).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount);
  });

  it("Check that user votes are combined", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);

    const votingTransaction = await DAO.connect(user2).vote(firstProposalId, false);
    const rc = await votingTransaction.wait();
    const votedEvent = rc.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId, votesFor, ]] = votedEvent.args;
    expect(votesFor).to.equal(testUser1Amount.add(testUser2Amount));
  });

  it("Check that user can vote in multiple votings with the same tokens", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);

    const votingTransaction1 = await DAO.connect(user1).vote(firstProposalId, false);
    const rc1 = await votingTransaction1.wait();
    const votedEvent1 = rc1.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId1, votesFor1,]] = votedEvent1.args;
    expect(votesFor1).to.equal(testUser1Amount);

    const votingTransaction2 = await DAO.connect(user1).vote(secondProposalId, false);
    const rc2 = await votingTransaction2.wait();
    const votedEvent2 = rc2.events.find((e: { event: string }) => e.event == 'Voted');

    const [[proposalId2, votesFor2,]] = votedEvent2.args;
    expect(votesFor2).to.equal(testUser1Amount);
  });

  it("Check that user can't finish active voting", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await expect(DAO.connect(user1).finishProposal(firstProposalId)).revertedWith("Proposal voting is not ended");
  });

  it("Check proposal finishing, case of rejecting, no one voted", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.RejectedTooFewQuorum);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, quorum less than needed", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.RejectedTooFewQuorum);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, enough quorum but all voices are against", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, true);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.Rejected);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of rejecting, enough quorum but most voices are against", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, true);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.Rejected);
    expect(isActive).to.equal(false);
  });

  it("Check proposal finishing, case of enough quorum, most voted for, valid call", async () => {
    await token.transfer(DAO.address, ethers.utils.parseEther("1.0"));

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.ConfirmedCallSucceeded);
    expect(isActive).to.equal(false);
    expect(await token.balanceOf(user3.address)).to.equal(testUser3Amount);
  });

  it("Check proposal finishing, case of enough quorum if unable to call function", async () => {
    await token.transfer(DAO.address, ethers.utils.parseEther("1.0"));

    await DAO.connect(chairPerson).addProposal(testCallData, "0x0000000000000000000000000000000000000000", testDescription);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    const finishTransaction = await DAO.connect(user1).finishProposal(firstProposalId);
    const rc = await finishTransaction.wait();
    const finishEvent = rc.events.find((e: { event: string }) => e.event == 'ProposalFinished');
    const [status, [proposalId, votesFor, votesAgainst, deadline, recipient, isActive, callData, description]] = finishEvent.args;

    expect(status).to.equal(FinishedProposalStatus.ConfirmedCallSucceeded);
    expect(isActive).to.equal(false);
    expect(await token.balanceOf(user3.address)).to.equal(0);
  });

  it("Check that user can't vote in finished proposal votings", async () => {
    await token.transfer(DAO.address, ethers.utils.parseEther("1.0"));

    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);

    await expect(DAO.connect(user1).vote(firstProposalId, false)).to.be.revertedWith("Proposal voting is not active");
  });

  it("Check that user can withdraw deposited tokens if not voted", async () => {
    const user1InitialBalance = await token.balanceOf(user1.address);
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    const balanceAfterDeposit = await token.balanceOf(user1.address);
    expect(balanceAfterDeposit.lt(user1InitialBalance)).to.be.true;
    const withdrawAmount = testUser1Amount.div(2);
    const withdrawTransaction = await DAO.connect(user1).withdraw(withdrawAmount);
    const rc = await withdrawTransaction.wait();
    const withdrawedEvent = rc.events.find((e: { event: string }) => e.event == "Withdraw");
    const [user, amount] = withdrawedEvent.args;
    expect(user).to.equal(user1.address);
    expect(amount).to.equal(withdrawAmount);
    expect((await token.balanceOf(user1.address)).eq(balanceAfterDeposit.add(withdrawAmount))).to.be.true;
  });

  it("Check that user can't withdraw more tokens than he has", async () => {
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await expect(DAO.connect(user1).withdraw(testUser1Amount.add(1))).to.be.revertedWith("Too few tokens on balance");
  });

  it("Check that user can't withdraw tokens if he has active votings", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await expect(DAO.connect(user1).withdraw(testUser1Amount)).to.be.revertedWith("You have an active voting");
  });

  it("Check that user can withdraw tokens if all his votings are ended", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);

    const withdrawTransaction = await DAO.connect(user1).withdraw(testUser1Amount);
    const rc = await withdrawTransaction.wait();
    const withdrawedEvent = rc.events.find((e: { event: string }) => e.event == "Withdraw");
    const [user, amount] = withdrawedEvent.args;
    expect(user).to.equal(user1.address);
    expect(amount).to.equal(testUser1Amount);
  });

  it("Check that user can't withdraw if one voting is ended, but another is still active", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration / 2]);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(user1).vote(secondProposalId, false);
    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration / 2 + 1]);

    await expect(DAO.connect(user1).withdraw(testUser1Amount)).to.be.revertedWith("You have an active voting");
  });

  it("Check that user can withdraw if all his votings are finished", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);
    await DAO.connect(user1).vote(secondProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user2).finishProposal(firstProposalId);
    await DAO.connect(user2).finishProposal(secondProposalId);

    const withdrawTransaction = await DAO.connect(user1).withdraw(testUser1Amount);
    const rc = await withdrawTransaction.wait();
    const withdrawedEvent = rc.events.find((e: { event: string }) => e.event == "Withdraw");
    const [user, amount] = withdrawedEvent.args;
    expect(user).to.equal(user1.address);
    expect(amount).to.equal(testUser1Amount);
  });

  it("Check that user can't finish a proposal twice", async () => {
    await DAO.connect(chairPerson).addProposal(testCallData, testRecepient, testDescription);

    await token.connect(user1).approve(DAO.address, testUser1Amount);
    await DAO.connect(user1).deposit(testUser1Amount);
    await DAO.connect(user1).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user2).finishProposal(firstProposalId);
    await expect(DAO.connect(user2).finishProposal(firstProposalId)).to.be.revertedWith("Proposal voting is not active");
  });

  it("Check that user can't set new chairperson without voting ", async () => {
    await expect(DAO.connect(chairPerson).setChairPerson(user3.address)).to.be.revertedWith("You can't to that");
  });

  it("Check that user can't set new minimum quorum without voting ", async () => {
    await expect(DAO.connect(chairPerson).setMinimumQuorum(0)).to.be.revertedWith("You can't to that");
  });

  it("Check that user can't set new debating period without voting ", async () => {
    await expect(DAO.connect(chairPerson).setDebatingPeriodDuration(0)).to.be.revertedWith("You can't to that");
  });

  it("Test new chairperson choosing", async () => {
    await DAO.connect(chairPerson).addProposal(genSetChairPersonCallData(user3.address), DAO.address, "Choose new chairperson");

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.chairPerson()).to.equal(user3.address);
  });

  it("Test new minimum quorum choosing", async () => {
    const newMinimumQuorum = testMinimumQuorum.mul(2);
    await DAO.connect(chairPerson).addProposal(genSetMinimumQuorumCallData(newMinimumQuorum), DAO.address, "Choose new minimum quorum");

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.minimumQuorum()).to.equal(newMinimumQuorum);
  });

  it("Test new minimum quorum choosing", async () => {
    const newMinimumQuorum = testMinimumQuorum.mul(2);
    await DAO.connect(chairPerson).addProposal(genSetMinimumQuorumCallData(newMinimumQuorum), DAO.address, "Choose new minimum quorum");

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.minimumQuorum()).to.equal(newMinimumQuorum);
  });

  it("Test new debating period duration choosing", async () => {
    const newDebatingPeriodDuration = testDebatingPeriodDuration * 2;
    await DAO.connect(chairPerson).addProposal(genSetDebatingPeriodDurationCallData(newDebatingPeriodDuration), DAO.address, "Choose new debating period");

    await token.connect(user2).approve(DAO.address, testUser2Amount);
    await DAO.connect(user2).deposit(testUser2Amount);
    await DAO.connect(user2).vote(firstProposalId, false);

    await network.provider.send("evm_increaseTime", [testDebatingPeriodDuration + 1]);
    await DAO.connect(user1).finishProposal(firstProposalId);
    expect(await DAO.debatingPeriodDuration()).to.equal(newDebatingPeriodDuration);
  });
});
