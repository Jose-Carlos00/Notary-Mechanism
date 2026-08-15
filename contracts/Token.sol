// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint256 public constant MINT_AMOUNT_PER_USER = 1000000;

    constructor(
        string memory name,
        string memory symbol,
        address[] memory holders
    ) ERC20(name, symbol) {
        for (uint256 i = 0; i < holders.length; i++) {
            // Utilizando decimals() nativo do padrão OpenZeppelin
            _mint(holders[i], MINT_AMOUNT_PER_USER * 10 ** decimals());
        }
    }
}