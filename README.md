# DAO, an ancap court implementation

This project contains implementation of decentralized autonomous organization, tests with 100% coverage, deploy script and usefull tasks 

Operating principle

User can deposit tokens and get corresponding suffrage power. Chairman can suggest a proposal to call a specific function on a specific contract. If users voted with enough suffrage power for a proposal, proposal will be executed

Contract addresses on Rinkeby
- Token `0x108df121d7Ea8B2C4Ca4AD54b4fAe15535bE80a6` 
- DAO `0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8`

DAO verification: https://rinkeby.etherscan.io/address/0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8#code

How to deploy
`npx hardhat run scripts/deploy.ts --network rinkeby`

How to verify 
`npx hardhat verify 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 0x2836eC28C32E232280F984d3980BA4e05d6BF68f 0x108df121d7Ea8B2C4Ca4AD54b4fAe15535bE80a6 150000000000000000000 86400 --network rinkeby`

How to add proposal
`npx hardhat addProposal --contract-addr 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 --call-data 0xa9059cbb00000000000000000000000015d34aaf54267db7d7c367839aaf71a00a2c6a650000000000000000000000000000000000000000000000000de0b6b3a7640000 --recipient 0x108df121d7Ea8B2C4Ca4AD54b4fAe15535bE80a6 --description test --network rinkeby`

How to deposit
`npx hardhat deposit --contract-addr 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 --token-addr 0x108df121d7Ea8B2C4Ca4AD54b4fAe15535bE80a6 --amount 10.0 --network rinkeby`

How to vote
`npx hardhat vote --contract-addr 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 --proposal-id 0 --network rinkeby`

How to finish proposal
`npx hardhat finishProposal --contract-addr 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 --proposal-id 0 --network rinkeby`

How to withdraw
`npx hardhat withdraw --contract-addr 0x1022dEfF53B9f21F57969EB0409FA810Da8B6AD8 --amount 10.0 --network rinkeby`