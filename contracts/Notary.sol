// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error CallerNotBridge();
error NotEnoughStake();
error AlreadyBlacklisted();
error AlreadyExecuted();
error Locked();

contract Notary {
    using SafeERC20 for IERC20;

    uint256 public constant LOCK_PERIOD = 60;
    uint256 public constant MINIMUM_STAKE_BASIS_POINTS = 100; // 100 = 1% de 1 token = 0.01
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    uint256 public constant BRIDGE_FEE_PERCENTAGE = 5;
    uint256 public constant HUNDRED = 100;

    uint256 public lastDepositID;

    mapping(address => uint256) public totalStaked;
    mapping(address => mapping(address => uint256)) public stakes;
    mapping(address => mapping(address => uint256)) public blacklistVotes;
    mapping(address => uint256) public lockedUntil;

    // Proteção contra colisão de IDs de redes diferentes
    mapping(bytes32 => bool) public executedDeposits;

    event Deposit(
        uint256 indexed depositID,
        address indexed token,
        address indexed sender,
        string destinationChain,
        address receiver,
        uint256 amount
    );

    event ExecuteBridge(
        uint256 indexed originChainId,
        uint256 indexed originChainDepositID,
        address token,
        address indexed node,
        address receiver,
        uint256 amount
    );

    event Stake(address indexed token, address indexed sender, uint256 amount);
    event Unstake(address indexed token, address indexed sender, uint256 amount);
    event VoteToBlacklistNode(address indexed token, address indexed voter, address indexed node);

    modifier onlyBridgeNode(address token) {
        if (stakes[token][msg.sender] == 0) revert CallerNotBridge();
        _;
    }

    constructor() {}

    function minimumStakeFor(address token) public view returns (uint256) {
        return (10 ** IERC20Metadata(token).decimals() * MINIMUM_STAKE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
    }

    function deposit(address token, uint256 amount, string memory destinationChain, address receiver) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        lastDepositID++;

        emit Deposit(lastDepositID, token, msg.sender, destinationChain, receiver, amount);
    }

    function executeBridge(
        uint256 originChainId,
        uint256 originChainDepositID,
        address token,
        address receiver,
        uint256 amount
    ) external onlyBridgeNode(token) {
        bytes32 depositKey = keccak256(abi.encodePacked(originChainId, originChainDepositID));

        if (executedDeposits[depositKey]) revert AlreadyExecuted();
        if (lockedUntil[msg.sender] > block.timestamp) revert Locked();

        if (amount > stakes[token][msg.sender] / 10) revert NotEnoughStake();

        uint256 fee = (amount * BRIDGE_FEE_PERCENTAGE) / HUNDRED;
        uint256 amountAfterFee = amount - fee;

        executedDeposits[depositKey] = true;
        lockedUntil[msg.sender] = block.timestamp + LOCK_PERIOD;

        IERC20(token).safeTransfer(receiver, amountAfterFee);
        IERC20(token).safeTransfer(msg.sender, fee);

        emit ExecuteBridge(originChainId, originChainDepositID, token, msg.sender, receiver, amount);
    }

    function stake(address token, uint256 amount) external {
        if (amount < minimumStakeFor(token)) revert NotEnoughStake();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        stakes[token][msg.sender] += amount;
        totalStaked[token] += amount;

        emit Stake(token, msg.sender, amount);
    }

    function unstake(address token, uint256 amount) external {
        if (amount > stakes[token][msg.sender]) revert NotEnoughStake();
        if (lockedUntil[msg.sender] > block.timestamp) revert Locked();

        stakes[token][msg.sender] -= amount;
        totalStaked[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Unstake(token, msg.sender, amount);
    }

    function voteToBlacklistNode(address token, address node) external onlyBridgeNode(token) {
        if (stakes[token][node] == 0) revert AlreadyBlacklisted();

        blacklistVotes[token][node] += stakes[token][msg.sender];

        if (blacklistVotes[token][node] > totalStaked[token] / 2) {
            totalStaked[token] -= stakes[token][node];
            stakes[token][node] = 0;
        }

        emit VoteToBlacklistNode(token, msg.sender, node);
    }
}