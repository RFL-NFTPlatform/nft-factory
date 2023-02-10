// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract MockERC20 is ERC20PresetMinterPauser("MockToken", "MTC") {
    constructor() {
        super.mint(msg.sender, 10**25);
    }
}
