//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ItPubToken is ERC20 {
    address private owner;

    constructor() ERC20("ItPubToken", "ITP"){
        owner = msg.sender;
        _mint(msg.sender, 1_0000 * 10 ** 18);
    }

}