# DAO, an ancap court implementation

This project contains implementation of decentralized autonomous organization, tests with 100% coverage, deploy script and usefull tasks 

## Operating principle

User can deposit tokens and get corresponding suffrage power. Chairman can suggest a proposal to call a specific function on a specific contract. Users vote for or against the proposal. If more than minimum quorum voted and suffrage power for more than suffrage power against, proposal will be executed

## Contract addresses on Ropsten
- Token `0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941` 
- DAO `0xb205922E34F8B28ad22e41D363916Cd98ca648Ec`

## DAO verification
https://ropsten.etherscan.io/address/0xb205922E34F8B28ad22e41D363916Cd98ca648Ec#code

## How to deploy
`npx hardhat run scripts/deploy.ts --network ropsten`

## How to verify 
`npx hardhat verify 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec 0x2836eC28C32E232280F984d3980BA4e05d6BF68f 0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941 150000000000000000000 86400 --network ropsten`

## How to add proposal
`npx hardhat addProposal --contract-addr 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --call-data 0xa9059cbb00000000000000000000000015d34aaf54267db7d7c367839aaf71a00a2c6a650000000000000000000000000000000000000000000000000de0b6b3a7640000 --recipient 0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941 --description test --network ropsten`

## How to deposit
`npx hardhat deposit --contract-addr 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --token-addr 0x9dBdFcdf8D713011B4E1C17900EA9F1bcf46B941 --amount 10.0 --network ropsten`

## How to vote
`npx hardhat vote --contract-addr 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --proposal-id 0 --against false --network ropsten`

## How to finish proposal
`npx hardhat finishProposal --contract-addr 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --proposal-id 0 --network ropsten`

## How to withdraw
`npx hardhat withdraw --contract-addr 0xb205922E34F8B28ad22e41D363916Cd98ca648Ec --amount 10.0 --network ropsten`

![telegram-cloud-photo-size-2-5472151363375971344-y](https://user-images.githubusercontent.com/25568730/168560657-8ca51b0c-9466-453a-9ed3-a8cdd5791a97.jpg)
