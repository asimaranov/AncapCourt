//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DAO {
    struct Proposal {
        uint256 proposalId;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        address recipient;
        bool isActive;
        bytes callData;
        string description;
    }

    enum FinishedProposalStatus {
        Rejected,
        RejectedTooFewQuorum,
        ConfirmedCallSucceeded,
        ConfirmedCallFailded
    }

    address public chairPerson;
    IERC20 public voteToken;
    uint256 public minimumQuorum;
    uint256 public debatingPeriodDuration;
    uint256 private proposalsNum;
    mapping(address => uint256) private balances;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => uint256)) private userVotes;
    mapping(address => uint256) private lockCooldowns;
    
    event Deposited(address user, uint256 amount);
    event Proposed(Proposal proposal);
    event Voted(Proposal proposal);
    event ProposalFinished(FinishedProposalStatus status, Proposal proposal);
    event Withdraw(address user, uint256 amount);

    modifier onlyByChoice {
        require(msg.sender == address(this), "You can't to that");
        _;
    }

    constructor(
        address _chairPerson,
        address _voteToken,
        uint256 _minimumQuorum,
        uint256 _debatingPeriodDuration
    ) {
        chairPerson = _chairPerson;
        voteToken = IERC20(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    function deposit(uint256 amount) public {
        voteToken.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function addProposal(bytes memory callData, address recipient, string memory description) public returns (uint256 proposalId) {
        require(msg.sender == chairPerson, "Only chairperson can do that");
        proposalId = proposalsNum;
        proposals[proposalId] = Proposal(proposalId, 0, 0, block.timestamp + debatingPeriodDuration, recipient, true, callData, description);
        proposalsNum++;
        emit Proposed(proposals[proposalId]);
    }

    function vote(uint256 proposalId, bool against) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.isActive, "Proposal voting is not active");
        require(proposal.deadline >= block.timestamp, "Proposal voting ended");

        uint256 userBalance = balances[msg.sender];
        uint256 madeVotes = userVotes[proposalId][msg.sender];

        uint256 suffrage = userBalance - madeVotes;

        require(suffrage > 0, "No suffrage");

        if(madeVotes == 0) 
            lockCooldowns[msg.sender] = max(proposal.deadline, lockCooldowns[msg.sender]);

        userVotes[proposalId][msg.sender] = userBalance;

        if(against)
            proposal.votesAgainst += suffrage;
        else
            proposal.votesFor += suffrage;
        emit Voted(proposal);
    }

    function finishProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.isActive, "Proposal voting is not active");
        require(proposal.deadline < block.timestamp, "Proposal voting is not ended");

        proposal.isActive = false;

        if(proposal.votesFor + proposal.votesAgainst < minimumQuorum) {
            emit ProposalFinished(FinishedProposalStatus.RejectedTooFewQuorum, proposal);
        } 
        else if(proposal.votesFor <= proposal.votesAgainst) {
            emit ProposalFinished(FinishedProposalStatus.Rejected, proposal);
        } else {
            (bool success, ) = proposal.recipient.call(proposal.callData);
            emit ProposalFinished(success ? FinishedProposalStatus.ConfirmedCallSucceeded : FinishedProposalStatus.ConfirmedCallFailded, proposal);
        }
    }

    function withdraw(uint256 amount) public {
        uint256 userBalance = balances[msg.sender];
        require(userBalance >= amount, "Too few tokens on balance");
        require(lockCooldowns[msg.sender] < block.timestamp, "You have an active voting");
        
        balances[msg.sender] -= amount;
        voteToken.transfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    function setChairPerson(address newChairPerson) public onlyByChoice {
        chairPerson = newChairPerson;
    }

    function setMinimumQuorum(uint256 newMinimumQuorum) public onlyByChoice {
        minimumQuorum = newMinimumQuorum;
    }

    function setDebatingPeriodDuration(uint256 newDebatingPeriodDuration) public onlyByChoice {
        debatingPeriodDuration = newDebatingPeriodDuration;
    }

    function max(uint256 a, uint256 b) private pure returns (uint256) {
        return a >= b ? a : b;
    }
}
