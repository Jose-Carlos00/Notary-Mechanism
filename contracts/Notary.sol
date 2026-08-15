// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error CallerNotBridge();
error NotEnoughStake();
error AlreadyBlacklisted();
error AlreadyExecuted();
error Locked();

contract Notary {
    using SafeERC20 for IERC20;

    uint256 public constant LOCK_PERIOD = 60; // 60 seconds
    uint256 public constant MINIMUM_STAKE_AMOUNT = 10 ether; // Ajustável dependendo do token
    uint256 public constant BRIDGE_FEE_PERCENTAGE = 5;
    uint256 public constant HUNDRED = 100;

    uint256 public lastDepositID;
    
    // Mapeamentos atualizados para suportar múltiplos tokens: tokenAddress => ...
    mapping(address => uint256) public totalStaked;
    mapping(address => mapping(address => uint256)) public stakes;           // token => node => amount
    mapping(address => mapping(address => uint256)) public blacklistVotes;   // token => node => votes
    mapping(address => uint256) public lockedUntil;                          // node => timestamp
    mapping(uint256 => bool) public executedDeposits;                        // depositID => status

    event Deposit(
        uint256 indexed depositID,
        address indexed token,
        address indexed sender,
        address receiver,
        uint256 amount
    );
    
    event ExecuteBridge(
        uint256 indexed depositID,
        address indexed token,
        address indexed node,
        address receiver,
        uint256 amount
    );
    
    event Stake(address indexed token, address indexed sender, uint256 amount);
    event Unstake(address indexed token, address indexed sender, uint256 amount);
    event VoteToBlacklistNode(address indexed token, address indexed voter, address indexed node);

    // O construtor não recebe mais um token fixo. O contrato é agnóstico.
    constructor() {}

    function deposit(address token, uint256 amount, address receiver) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        lastDepositID++;
        
        emit Deposit(lastDepositID, token, msg.sender, receiver, amount);
    }

    function executeBridge(
        uint256 originChainDepositID,
        address token,
        address receiver,
        uint256 amount
    ) external {
        if (stakes[token][msg.sender] == 0) revert CallerNotBridge();
        if (executedDeposits[originChainDepositID]) revert AlreadyExecuted();
        if (lockedUntil[msg.sender] > block.timestamp) revert Locked();
        
        // Regra de segurança: o valor da ponte deve ser <= 10% do stake do nó naquele token específico
        if (amount > stakes[token][msg.sender] / 10) revert NotEnoughStake();

        uint256 fee = (amount * BRIDGE_FEE_PERCENTAGE) / HUNDRED;
        uint256 amountAfterFee = amount - fee;

        // Efeitos de Estado SEMPRE ANTES das transferências externas (Prevenção de Reentrância)
        executedDeposits[originChainDepositID] = true;
        lockedUntil[msg.sender] = block.timestamp + LOCK_PERIOD;

        // Interações
        IERC20(token).safeTransfer(receiver, amountAfterFee);
        IERC20(token).safeTransfer(msg.sender, fee);

        emit ExecuteBridge(originChainDepositID, token, msg.sender, receiver, amount);
    }

    function stake(address token, uint256 amount) external {
        if (amount < MINIMUM_STAKE_AMOUNT) revert NotEnoughStake();

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

    function voteToBlacklistNode(address token, address node) external {
        if (stakes[token][msg.sender] == 0) revert CallerNotBridge();
        if (stakes[token][node] == 0) revert AlreadyBlacklisted();

        blacklistVotes[token][node] += stakes[token][msg.sender];

        if (blacklistVotes[token][node] > totalStaked[token] / 2) {
            // Correção: Agora deduzimos o stake do nó do totalStaked para não quebrar cálculos futuros
            totalStaked[token] -= stakes[token][node];
            stakes[token][node] = 0;
        }

        emit VoteToBlacklistNode(token, msg.sender, node);
    }
}