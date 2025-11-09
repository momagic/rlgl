// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RedLightGreenLightGameV2
 * @dev Optimized version with efficient leaderboard storage, reduced RPC calls, and weekly pass system
 * 
 * Key Features:
 * 1. Maintains sorted top 10 leaderboard on-chain (reduced from 50 for gas efficiency)
 * 2. Stores all game data in single struct to reduce RPC calls
 * 3. Uses efficient insertion sort for leaderboard updates
 * 4. Weekly pass system (5 WLD for unlimited turns for 7 days)
 * 5. Adjustable pricing for both turn purchases and weekly passes
 * 6. Owner seeding function for importing historic top 10 scores
 */
contract RedLightGreenLightGameV2 is ERC20, Ownable, ReentrancyGuard {
    // Game token (RLGL tokens - 0.1 per point)
    uint256 public constant TOKENS_PER_POINT = 1e17; // 0.1 tokens (18 decimals)
    
    // Turn system
    uint256 public constant FREE_TURNS_PER_DAY = 3;
    uint256 public constant PAID_TURNS_COUNT = 3;
    uint256 public constant TURN_RESET_PERIOD = 24 hours;
    
    // Weekly pass system
    uint256 public constant WEEKLY_PASS_DURATION = 7 days;
    uint256 public weeklyPassCost = 5e18; // 5.0 WLD (18 decimals)
    uint256 public constant MIN_WEEKLY_PASS_COST = 1e18; // 1.0 WLD minimum
    uint256 public constant MAX_WEEKLY_PASS_COST = 20e18; // 20.0 WLD maximum
    
    // Leaderboard settings (reduced to top 10 for gas efficiency)
    uint256 public constant MAX_LEADERBOARD_SIZE = 10;
    
    // Payment settings
    uint256 public additionalTurnsCost = 5e17; // 0.5 WLD (18 decimals)
    uint256 public constant MIN_TURN_COST = 1e17; // 0.1 WLD minimum
    uint256 public constant MAX_TURN_COST = 5e18; // 5 WLD maximum  
    IERC20 public immutable wldToken;
    
    // Player data with weekly pass support
    struct Player {
        uint256 lastResetTime;
        uint256 freeTurnsUsed;
        uint256 totalGamesPlayed;
        uint256 highScore;
        uint256 totalPointsEarned;
        uint256 weeklyPassExpiry; // 0 means no active pass
    }
    
    // Optimized game result with all data in one struct
    struct GameResult {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
        uint256 tokensEarned;
        uint256 gameId;
    }
    
    // Efficient leaderboard entry
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
        uint256 tokensEarned;
        uint256 gameId;
    }
    
    // Storage
    mapping(address => Player) public players;
    GameResult[] public gameHistory;
    mapping(address => uint256[]) public playerGameIds;
    
    // Efficient leaderboard storage - sorted by score descending
    LeaderboardEntry[] public leaderboard;
    mapping(uint256 => uint256) public gameIdToLeaderboardIndex; // gameId => leaderboard index (0 means not in leaderboard)
    
    // Player high score tracking for quick lookups
    mapping(address => uint256) public playerHighScores;
    mapping(address => uint256) public playerHighScoreGameIds;
    
    // Events
    event GameCompleted(
        address indexed player, 
        uint256 score, 
        uint256 tokensEarned, 
        uint256 gameId,
        uint256 round,
        uint256 timestamp
    );
    event LeaderboardUpdated(uint256 indexed gameId, address indexed player, uint256 score, uint256 newRank);
    event TurnsPurchased(address indexed player, uint256 cost);
    event WeeklyPassPurchased(address indexed player, uint256 cost, uint256 expiryTime);
    event HighScoreUpdated(address indexed player, uint256 newHighScore);
    event TurnCostUpdated(uint256 oldCost, uint256 newCost);
    event WeeklyPassCostUpdated(uint256 oldCost, uint256 newCost);
    event LeaderboardSeeded(uint256 entriesAdded);
    
    constructor(address _wldToken) ERC20("Red Light Green Light Token", "RLGL") Ownable(msg.sender) {
        wldToken = IERC20(_wldToken);
    }
    
    /**
     * @dev Check if player has an active weekly pass
     */
    function hasActiveWeeklyPass(address player) public view returns (bool) {
        return players[player].weeklyPassExpiry > block.timestamp;
    }
    
    /**
     * @dev Get weekly pass expiry time for a player
     */
    function getWeeklyPassExpiry(address player) public view returns (uint256) {
        return players[player].weeklyPassExpiry;
    }
    
    /**
     * @dev Check how many turns a player has available (considers weekly pass)
     */
    function getAvailableTurns(address player) public view returns (uint256) {
        // Weekly pass holders have unlimited turns
        if (hasActiveWeeklyPass(player)) {
            return type(uint256).max; // Unlimited turns
        }
        
        Player memory playerData = players[player];
        
        if (block.timestamp >= playerData.lastResetTime + TURN_RESET_PERIOD) {
            return FREE_TURNS_PER_DAY;
        }
        
        if (playerData.freeTurnsUsed >= FREE_TURNS_PER_DAY) {
            return 0;
        }
        
        return FREE_TURNS_PER_DAY - playerData.freeTurnsUsed;
    }
    
    /**
     * @dev Get time until next turn reset (not relevant for weekly pass holders)
     */
    function getTimeUntilReset(address player) public view returns (uint256) {
        if (hasActiveWeeklyPass(player)) {
            return 0; // No reset needed for weekly pass holders
        }
        
        Player memory playerData = players[player];
        
        if (block.timestamp >= playerData.lastResetTime + TURN_RESET_PERIOD) {
            return 0;
        }
        
        return (playerData.lastResetTime + TURN_RESET_PERIOD) - block.timestamp;
    }
    
    /**
     * @dev Purchase a weekly pass for unlimited turns
     */
    function purchaseWeeklyPass() external nonReentrant {
        require(!hasActiveWeeklyPass(msg.sender), "Weekly pass already active");
        
        require(
            wldToken.transferFrom(msg.sender, address(this), weeklyPassCost),
            "WLD transfer failed"
        );
        
        uint256 expiryTime = block.timestamp + WEEKLY_PASS_DURATION;
        players[msg.sender].weeklyPassExpiry = expiryTime;
        
        emit WeeklyPassPurchased(msg.sender, weeklyPassCost, expiryTime);
    }
    
    /**
     * @dev Purchase additional turns with WLD (only for non-weekly pass holders)
     */
    function purchaseAdditionalTurns() external nonReentrant {
        require(!hasActiveWeeklyPass(msg.sender), "Weekly pass holders have unlimited turns");
        require(getAvailableTurns(msg.sender) == 0, "Still have free turns available");
        
        require(
            wldToken.transferFrom(msg.sender, address(this), additionalTurnsCost),
            "WLD transfer failed"
        );
        
        players[msg.sender].freeTurnsUsed = 0;
        players[msg.sender].lastResetTime = block.timestamp;
        
        emit TurnsPurchased(msg.sender, additionalTurnsCost);
    }
    
    /**
     * @dev Start a game (consume a turn, unless weekly pass holder)
     */
    function startGame() external {
        require(getAvailableTurns(msg.sender) > 0, "No turns available");
        
        // Weekly pass holders don't consume turns
        if (hasActiveWeeklyPass(msg.sender)) {
            return;
        }
        
        Player storage player = players[msg.sender];
        
        if (block.timestamp >= player.lastResetTime + TURN_RESET_PERIOD) {
            player.lastResetTime = block.timestamp;
            player.freeTurnsUsed = 0;
        }
        
        player.freeTurnsUsed++;
    }
    
    /**
     * @dev Calculate maximum theoretical score based on game mechanics
     * Assumes perfect play with optimal streak bonuses and power-up usage
     */
    function calculateMaxTheoreticalScore(uint256 rounds) public pure returns (uint256) {
        if (rounds == 0) return 0;
        
        uint256 totalScore = 0;
        uint256 pointsPerRound = 10; // Base points per round
        uint256 bonusThreshold = 5;  // Streak threshold for bonus
        
        for (uint256 i = 1; i <= rounds; i++) {
            uint256 basePoints = pointsPerRound;
            uint256 bonusPoints = 0;
            uint256 powerUpBonus = 0;
            
            // Calculate streak bonus (starts after 5 consecutive correct taps)
            if (i >= bonusThreshold) {
                bonusPoints = i / 2; // Floor division for bonus calculation
            }
            
            // Power-up bonus calculations (assuming optimal power-up usage)
            // Multiple power-ups bonus (50% of base points)
            if (i >= 10) { // Assume power-ups become available after round 10
                powerUpBonus += basePoints / 2; // 50% bonus for multiple active power-ups
            }
            
            // High streak with power-ups bonus (30% of base points)
            if (i >= 15) {
                powerUpBonus += (basePoints * 3) / 10; // 30% bonus for high streak with power-ups
            }
            
            // Rarity bonus (assume mix of power-up rarities, average ~5 points per round)
            if (i >= 10) {
                powerUpBonus += 5; // Average rarity bonus
            }
            
            // Apply score multiplier (assume 2x multiplier active ~30% of the time)
            uint256 subtotalPoints = basePoints + bonusPoints + powerUpBonus;
            uint256 multipliedPoints = (i % 3 == 0) ? subtotalPoints * 2 : subtotalPoints; // 2x every 3rd round
            
            totalScore += multipliedPoints;
        }
        
        return totalScore;
    }
    
    /**
     * @dev Submit game score with proper validation
     */
    function submitScore(uint256 score, uint256 round) external {
        require(score > 0, "Score must be greater than 0");
        
        // Validate score against theoretical maximum
        uint256 maxPossibleScore = calculateMaxTheoreticalScore(round);
        require(score <= maxPossibleScore, "Score exceeds theoretical maximum");
        
        // Additional sanity checks
        require(round > 0, "Round must be greater than 0");
        require(round <= 1000, "Round exceeds reasonable maximum"); // Prevent extremely long games
        require(score <= round * 50, "Score too high for given rounds"); // Basic ratio check
        
        Player storage player = players[msg.sender];
        uint256 gameId = gameHistory.length;
        uint256 timestamp = block.timestamp;
        uint256 tokensToMint = score * TOKENS_PER_POINT;
        
        // Update player stats
        player.totalGamesPlayed++;
        player.totalPointsEarned += score;
        
        // Check for new personal high score
        bool isNewHighScore = false;
        if (score > player.highScore) {
            player.highScore = score;
            playerHighScores[msg.sender] = score;
            playerHighScoreGameIds[msg.sender] = gameId;
            isNewHighScore = true;
            emit HighScoreUpdated(msg.sender, score);
        }
        
        // Create game result with all data
        GameResult memory gameResult = GameResult({
            player: msg.sender,
            score: score,
            timestamp: timestamp,
            round: round,
            tokensEarned: tokensToMint,
            gameId: gameId
        });
        
        // Store in history
        gameHistory.push(gameResult);
        playerGameIds[msg.sender].push(gameId);
        
        // Update leaderboard efficiently
        _updateLeaderboard(gameResult);
        
        // Mint reward tokens
        _mint(msg.sender, tokensToMint);
        
        emit GameCompleted(msg.sender, score, tokensToMint, gameId, round, timestamp);
    }
    
    /**
     * @dev Efficiently update leaderboard with new score
     */
    function _updateLeaderboard(GameResult memory gameResult) internal {
        // Check if score qualifies for leaderboard
        if (leaderboard.length < MAX_LEADERBOARD_SIZE || gameResult.score > leaderboard[leaderboard.length - 1].score) {
            
            LeaderboardEntry memory newEntry = LeaderboardEntry({
                player: gameResult.player,
                score: gameResult.score,
                timestamp: gameResult.timestamp,
                round: gameResult.round,
                tokensEarned: gameResult.tokensEarned,
                gameId: gameResult.gameId
            });
            
            // Find insertion position using binary search
            uint256 insertPos = _findInsertPosition(gameResult.score);
            
            // If leaderboard is full, remove last entry
            if (leaderboard.length >= MAX_LEADERBOARD_SIZE) {
                uint256 removedGameId = leaderboard[leaderboard.length - 1].gameId;
                delete gameIdToLeaderboardIndex[removedGameId];
                leaderboard.pop();
            }
            
            // Insert new entry at correct position
            leaderboard.push(); // Add space
            
            // Shift entries down
            for (uint256 i = leaderboard.length - 1; i > insertPos; i--) {
                leaderboard[i] = leaderboard[i - 1];
                gameIdToLeaderboardIndex[leaderboard[i].gameId] = i + 1; // 1-based indexing
            }
            
            // Insert new entry
            leaderboard[insertPos] = newEntry;
            gameIdToLeaderboardIndex[gameResult.gameId] = insertPos + 1; // 1-based indexing
            
            emit LeaderboardUpdated(gameResult.gameId, gameResult.player, gameResult.score, insertPos + 1);
        }
    }
    
    /**
     * @dev Find correct insertion position for score (binary search)
     */
    function _findInsertPosition(uint256 score) internal view returns (uint256) {
        if (leaderboard.length == 0) {
            return 0;
        }
        
        uint256 left = 0;
        uint256 right = leaderboard.length;
        
        while (left < right) {
            uint256 mid = (left + right) / 2;
            if (leaderboard[mid].score > score) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        return left;
    }
    
    /**
     * @dev Get current leaderboard (already sorted!) - SINGLE RPC CALL
     */
    function getLeaderboard() external view returns (LeaderboardEntry[] memory) {
        return leaderboard;
    }
    
    /**
     * @dev Get leaderboard with pagination
     */
    function getLeaderboardPaginated(uint256 offset, uint256 limit) external view returns (LeaderboardEntry[] memory) {
        require(offset < leaderboard.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > leaderboard.length) {
            end = leaderboard.length;
        }
        
        LeaderboardEntry[] memory result = new LeaderboardEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = leaderboard[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get top N scores (more efficient than full leaderboard)
     */
    function getTopScores(uint256 n) external view returns (LeaderboardEntry[] memory) {
        uint256 length = n > leaderboard.length ? leaderboard.length : n;
        LeaderboardEntry[] memory topScores = new LeaderboardEntry[](length);
        
        for (uint256 i = 0; i < length; i++) {
            topScores[i] = leaderboard[i];
        }
        
        return topScores;
    }
    
    /**
     * @dev Batch get player statistics - REDUCES RPC CALLS
     */
    function getBatchPlayerStats(address[] calldata playerAddresses) external view returns (
        Player[] memory playersData,
        uint256[] memory tokenBalances,
        uint256[] memory availableTurns,
        uint256[] memory timeUntilReset
    ) {
        uint256 length = playerAddresses.length;
        playersData = new Player[](length);
        tokenBalances = new uint256[](length);
        availableTurns = new uint256[](length);
        timeUntilReset = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            address player = playerAddresses[i];
            playersData[i] = players[player];
            tokenBalances[i] = balanceOf(player);
            availableTurns[i] = getAvailableTurns(player);
            timeUntilReset[i] = getTimeUntilReset(player);
        }
    }
    
    /**
     * @dev Get player statistics with single call
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
     * @dev Get player's game history with pagination
     */
    function getPlayerGameHistory(address player, uint256 offset, uint256 limit) external view returns (GameResult[] memory) {
        uint256[] memory gameIds = playerGameIds[player];
        require(offset < gameIds.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > gameIds.length) {
            end = gameIds.length;
        }
        
        GameResult[] memory playerGames = new GameResult[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            playerGames[i - offset] = gameHistory[gameIds[i]];
        }
        
        return playerGames;
    }
    
    /**
     * @dev Get leaderboard statistics
     */
    function getLeaderboardStats() external view returns (
        uint256 totalGames,
        uint256 totalPlayers,
        uint256 leaderboardSize,
        uint256 highestScore,
        address topPlayer
    ) {
        totalGames = gameHistory.length;
        
        // Count unique players (this is less efficient but only for stats)
        // In production, you might want to track this separately
        totalPlayers = 0; // Could implement a counter
        
        leaderboardSize = leaderboard.length;
        
        if (leaderboard.length > 0) {
            highestScore = leaderboard[0].score;
            topPlayer = leaderboard[0].player;
        }
    }
    
    /**
     * @dev Get game data by ID (single RPC call for all data)
     */
    function getGameById(uint256 gameId) external view returns (GameResult memory) {
        require(gameId < gameHistory.length, "Game ID out of bounds");
        return gameHistory[gameId];
    }
    
    /**
     * @dev Owner function to update turn cost
     */
    function updateAdditionalTurnsCost(uint256 newCost) external onlyOwner {
        require(newCost >= MIN_TURN_COST && newCost <= MAX_TURN_COST, "Cost out of allowed range");
        uint256 oldCost = additionalTurnsCost;
        additionalTurnsCost = newCost;
        emit TurnCostUpdated(oldCost, newCost);
    }

    /**
     * @dev Owner function to update weekly pass cost
     */
    function updateWeeklyPassCost(uint256 newCost) external onlyOwner {
        require(newCost >= MIN_WEEKLY_PASS_COST && newCost <= MAX_WEEKLY_PASS_COST, "Cost out of allowed range");
        uint256 oldCost = weeklyPassCost;
        weeklyPassCost = newCost;
        emit WeeklyPassCostUpdated(oldCost, newCost);
    }

    /**
     * @dev Owner function to seed leaderboard with historic top 10 scores
     * @param entries Array of leaderboard entries to seed (must be sorted by score descending)
     */
    function seedLeaderboard(LeaderboardEntry[] calldata entries) external onlyOwner {
        require(leaderboard.length == 0, "Leaderboard already has entries");
        require(entries.length <= MAX_LEADERBOARD_SIZE, "Too many entries");
        
        // Validate entries are sorted by score descending
        for (uint256 i = 1; i < entries.length; i++) {
            require(entries[i-1].score >= entries[i].score, "Entries must be sorted by score descending");
        }
        
        // Add entries to leaderboard
        for (uint256 i = 0; i < entries.length; i++) {
            leaderboard.push(entries[i]);
            
            // Update player high scores if this is their highest
            address player = entries[i].player;
            if (entries[i].score > playerHighScores[player]) {
                playerHighScores[player] = entries[i].score;
                playerHighScoreGameIds[player] = entries[i].gameId;
            }
            
            // Map gameId to leaderboard position (1-based)
            gameIdToLeaderboardIndex[entries[i].gameId] = i + 1;
        }
        
        emit LeaderboardSeeded(entries.length);
    }

    /**
     * @dev Get current costs for frontend
     */
    function getCosts() external view returns (uint256 turnCost, uint256 passeCost) {
        return (additionalTurnsCost, weeklyPassCost);
    }

    /**
     * @dev Migration function to mint tokens for V1 holders (owner only)
     * This function is used for migrating V1 RLGL balances to V2
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
    }

    /**
     * @dev Batch mint function for efficient migration (owner only)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            require(amounts[i] > 0, "Amount must be greater than 0");
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Emergency function to withdraw accumulated WLD fees
     */
    function withdrawFees(address to) external onlyOwner {
        uint256 balance = wldToken.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        require(wldToken.transfer(to, balance), "Transfer failed");
    }
}