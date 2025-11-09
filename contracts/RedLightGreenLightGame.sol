// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RedLightGreenLightGame
 * @dev A game contract that manages turns, payments, scores, and reward tokens
 */
contract RedLightGreenLightGame is ERC20, Ownable, ReentrancyGuard {
    // Game token (RLGL tokens - 0.1 per point)
    uint256 public constant TOKENS_PER_POINT = 1e17; // 0.1 tokens (18 decimals)
    
    // Turn system
    uint256 public constant FREE_TURNS_PER_DAY = 3;
    uint256 public constant PAID_TURNS_COUNT = 3;
    uint256 public constant TURN_RESET_PERIOD = 24 hours;
    
    // Payment settings
    uint256 public additionalTurnsCost = 5e17; // 0.5 WLD (18 decimals) - now adjustable
    uint256 public constant MIN_TURN_COST = 1e17; // 0.1 WLD minimum
    uint256 public constant MAX_TURN_COST = 5e18; // 5 WLD maximum
    IERC20 public immutable wldToken;
    
    // Player data
    struct Player {
        uint256 lastResetTime;
        uint256 freeTurnsUsed;
        uint256 totalGamesPlayed;
        uint256 highScore;
        uint256 totalPointsEarned;
    }
    
    struct GameResult {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
    }
    
    mapping(address => Player) public players;
    GameResult[] public gameHistory;
    mapping(address => uint256[]) public playerGameIds;
    
    // Events
    event GameCompleted(
        address indexed player, 
        uint256 score, 
        uint256 tokensEarned, 
        uint256 gameId
    );
    event TurnsPurchased(address indexed player, uint256 cost);
    event HighScoreUpdated(address indexed player, uint256 newHighScore);
    event TurnCostUpdated(uint256 oldCost, uint256 newCost);
    
    constructor(address _wldToken) ERC20("Red Light Green Light Token", "RLGL") Ownable(msg.sender) {
        wldToken = IERC20(_wldToken);
    }
    
    /**
     * @dev Check how many turns a player has available
     */
    function getAvailableTurns(address player) public view returns (uint256) {
        Player memory playerData = players[player];
        
        // Check if reset period has passed
        if (block.timestamp >= playerData.lastResetTime + TURN_RESET_PERIOD) {
            return FREE_TURNS_PER_DAY; // Full turns available after reset
        }
        
        // Return remaining free turns
        if (playerData.freeTurnsUsed >= FREE_TURNS_PER_DAY) {
            return 0;
        }
        
        return FREE_TURNS_PER_DAY - playerData.freeTurnsUsed;
    }
    
    /**
     * @dev Get time until next turn reset
     */
    function getTimeUntilReset(address player) public view returns (uint256) {
        Player memory playerData = players[player];
        
        if (block.timestamp >= playerData.lastResetTime + TURN_RESET_PERIOD) {
            return 0; // Reset available now
        }
        
        return (playerData.lastResetTime + TURN_RESET_PERIOD) - block.timestamp;
    }
    
    /**
     * @dev Purchase additional turns with WLD
     */
    function purchaseAdditionalTurns() external nonReentrant {
        require(getAvailableTurns(msg.sender) == 0, "Still have free turns available");
        
        // Transfer WLD from player
        require(
            wldToken.transferFrom(msg.sender, address(this), additionalTurnsCost),
            "WLD transfer failed"
        );
        
        // Reset the player's turn system to give them 3 more turns
        players[msg.sender].freeTurnsUsed = 0;
        players[msg.sender].lastResetTime = block.timestamp;
        
        emit TurnsPurchased(msg.sender, additionalTurnsCost);
    }
    
    /**
     * @dev Start a game (consume a turn)
     */
    function startGame() external {
        require(getAvailableTurns(msg.sender) > 0, "No turns available");
        
        Player storage player = players[msg.sender];
        
        // Check if reset period has passed
        if (block.timestamp >= player.lastResetTime + TURN_RESET_PERIOD) {
            player.lastResetTime = block.timestamp;
            player.freeTurnsUsed = 0;
        }
        
        // Consume a turn
        player.freeTurnsUsed++;
    }
    
    /**
     * @dev Submit game score and mint reward tokens
     */
    function submitScore(uint256 score, uint256 round) external {
        require(score > 0, "Score must be greater than 0");
        
        Player storage player = players[msg.sender];
        
        // Update player stats
        player.totalGamesPlayed++;
        player.totalPointsEarned += score;
        
        // Check for new high score
        if (score > player.highScore) {
            player.highScore = score;
            emit HighScoreUpdated(msg.sender, score);
        }
        
        // Record game in history
        uint256 gameId = gameHistory.length;
        gameHistory.push(GameResult({
            player: msg.sender,
            score: score,
            timestamp: block.timestamp,
            round: round
        }));
        
        playerGameIds[msg.sender].push(gameId);
        
        // Calculate and mint reward tokens (0.1 token per point)
        uint256 tokensToMint = score * TOKENS_PER_POINT;
        _mint(msg.sender, tokensToMint);
        
        emit GameCompleted(msg.sender, score, tokensToMint, gameId);
    }
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view returns (
        uint256 freeTurnsUsed,
        uint256 lastResetTime,
        uint256 totalGamesPlayed,
        uint256 highScore,
        uint256 totalPointsEarned,
        uint256 tokenBalance,
        uint256 availableTurns,
        uint256 timeUntilReset
    ) {
        Player memory playerData = players[player];
        
        return (
            playerData.freeTurnsUsed,
            playerData.lastResetTime,
            playerData.totalGamesPlayed,
            playerData.highScore,
            playerData.totalPointsEarned,
            balanceOf(player),
            getAvailableTurns(player),
            getTimeUntilReset(player)
        );
    }
    
    /**
     * @dev Get leaderboard (top 10 scores)
     */
    function getLeaderboard() external view returns (GameResult[] memory) {
        uint256 length = gameHistory.length;
        if (length == 0) {
            return new GameResult[](0);
        }
        
        // Create a copy of gameHistory for sorting
        GameResult[] memory sortedGames = new GameResult[](length);
        for (uint256 i = 0; i < length; i++) {
            sortedGames[i] = gameHistory[i];
        }
        
        // Simple bubble sort (not efficient for large datasets, but fine for game)
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (sortedGames[j].score < sortedGames[j + 1].score) {
                    GameResult memory temp = sortedGames[j];
                    sortedGames[j] = sortedGames[j + 1];
                    sortedGames[j + 1] = temp;
                }
            }
        }
        
        // Return top 10
        uint256 returnLength = length > 10 ? 10 : length;
        GameResult[] memory leaderboard = new GameResult[](returnLength);
        for (uint256 i = 0; i < returnLength; i++) {
            leaderboard[i] = sortedGames[i];
        }
        
        return leaderboard;
    }
    
    /**
     * @dev Get player's game history
     */
    function getPlayerGameHistory(address player) external view returns (GameResult[] memory) {
        uint256[] memory gameIds = playerGameIds[player];
        GameResult[] memory playerGames = new GameResult[](gameIds.length);
        
        for (uint256 i = 0; i < gameIds.length; i++) {
            playerGames[i] = gameHistory[gameIds[i]];
        }
        
        return playerGames;
    }
    
    /**
     * @dev Get total number of games played
     */
    function getTotalGamesPlayed() external view returns (uint256) {
        return gameHistory.length;
    }
    
    /**
     * @dev Owner can withdraw collected WLD
     */
    function withdrawWLD() external onlyOwner {
        uint256 balance = wldToken.balanceOf(address(this));
        require(balance > 0, "No WLD to withdraw");
        require(wldToken.transfer(owner(), balance), "WLD transfer failed");
    }
    
    /**
     * @dev Update the cost for additional turns (owner only)
     * @param newCost New cost in WLD (18 decimals)
     */
    function updateTurnCost(uint256 newCost) external onlyOwner {
        require(newCost >= MIN_TURN_COST, "Cost too low");
        require(newCost <= MAX_TURN_COST, "Cost too high");
        require(newCost != additionalTurnsCost, "Same as current cost");
        
        uint256 oldCost = additionalTurnsCost;
        additionalTurnsCost = newCost;
        
        emit TurnCostUpdated(oldCost, newCost);
    }
    
    /**
     * @dev Get current turn cost
     */
    function getCurrentTurnCost() external view returns (uint256) {
        return additionalTurnsCost;
    }
} 