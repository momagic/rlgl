// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title LeaderboardManager
 * @dev Separate upgradeable contract for managing leaderboards across different game modes
 * @notice This contract tracks high scores for Classic and Arcade game modes efficiently
 */
contract LeaderboardManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    // Game modes enum
    enum GameMode { Classic, Arcade }
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
        uint256 tokensEarned;
        uint256 gameId;
        GameMode gameMode;
    }
    
    // Player statistics per game mode
    struct PlayerModeStats {
        uint256 highScore;
        uint256 totalGames;
        uint256 totalScore;
        uint256 averageScore;
        uint256 bestRound;
        uint256 lastGameTimestamp;
    }
    
    // Combined player statistics
    struct PlayerStats {
        PlayerModeStats classicStats;
        PlayerModeStats arcadeStats;
    }
    
    // Constants for optimization
    uint256 public constant MAX_LEADERBOARD_SIZE = 100; // Top 100 per mode
    uint256 public constant MAX_BATCH_SIZE = 50; // Max entries per batch operation
    
    // Storage mappings
    mapping(GameMode => LeaderboardEntry[]) public leaderboards;
    mapping(GameMode => mapping(address => PlayerModeStats)) public playerStats;
    mapping(address => bool) public authorizedSubmitters; // Contracts that can submit scores
    mapping(GameMode => uint256) public totalGamesPlayed;
    mapping(GameMode => uint256) public totalPlayersCount;
    
    // Global game counter for unique IDs
    uint256 public globalGameCounter;
    
    // Events
    event ScoreSubmitted(
        address indexed player,
        GameMode indexed gameMode,
        uint256 score,
        uint256 round,
        uint256 tokensEarned,
        uint256 gameId,
        bool isNewHighScore
    );
    
    event LeaderboardUpdated(
        GameMode indexed gameMode,
        address indexed player,
        uint256 newPosition,
        uint256 score
    );
    
    event AuthorizedSubmitterUpdated(
        address indexed submitter,
        bool authorized
    );
    
    event LeaderboardSeeded(
        GameMode indexed gameMode,
        uint256 entriesCount
    );
    
    // Modifiers
    modifier onlyAuthorizedSubmitter() {
        require(authorizedSubmitters[msg.sender] || msg.sender == owner(), "Not authorized to submit scores");
        _;
    }
    
    modifier validGameMode(GameMode gameMode) {
        require(uint8(gameMode) <= 1, "Invalid game mode");
        _;
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (replaces constructor for upgradeable contracts)
     * @param initialOwner The initial owner of the contract
     */
    function initialize(address initialOwner) public initializer {
        __Ownable_init_unchained(initialOwner);
        __ReentrancyGuard_init_unchained();
        __UUPSUpgradeable_init_unchained();
        
        globalGameCounter = 1;
    }
    
    /**
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Submit a new score to the leaderboard
     * @param player The player's address
     * @param gameMode The game mode (Classic or Arcade)
     * @param score The achieved score
     * @param round The round reached
     * @param tokensEarned The tokens earned for this game
     */
    function submitScore(
        address player,
        GameMode gameMode,
        uint256 score,
        uint256 round,
        uint256 tokensEarned
    ) external onlyAuthorizedSubmitter validGameMode(gameMode) nonReentrant {
        require(player != address(0), "Invalid player address");
        require(score > 0, "Score must be greater than 0");
        require(round > 0, "Round must be greater than 0");
        
        uint256 gameId = globalGameCounter++;
        
        // Update player statistics
        PlayerModeStats storage stats = playerStats[gameMode][player];
        bool isNewHighScore = false;
        
        if (stats.totalGames == 0) {
            // First game for this player in this mode
            totalPlayersCount[gameMode]++;
        }
        
        stats.totalGames++;
        stats.totalScore += score;
        stats.averageScore = stats.totalScore / stats.totalGames;
        stats.lastGameTimestamp = block.timestamp;
        
        if (score > stats.highScore) {
            stats.highScore = score;
            isNewHighScore = true;
        }
        
        if (round > stats.bestRound) {
            stats.bestRound = round;
        }
        
        totalGamesPlayed[gameMode]++;
        
        // Create leaderboard entry
        LeaderboardEntry memory newEntry = LeaderboardEntry({
            player: player,
            score: score,
            timestamp: block.timestamp,
            round: round,
            tokensEarned: tokensEarned,
            gameId: gameId,
            gameMode: gameMode
        });
        
        // Update leaderboard if this is a high score
        if (isNewHighScore) {
            _updateLeaderboard(gameMode, newEntry);
        }
        
        emit ScoreSubmitted(
            player,
            gameMode,
            score,
            round,
            tokensEarned,
            gameId,
            isNewHighScore
        );
    }
    
    /**
     * @dev Internal function to update leaderboard with new high score
     */
    function _updateLeaderboard(GameMode gameMode, LeaderboardEntry memory newEntry) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        // Find if player already exists in leaderboard
        int256 existingIndex = -1;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == newEntry.player) {
                existingIndex = int256(i);
                break;
            }
        }
        
        // Remove existing entry if found
        if (existingIndex >= 0) {
            _removeLeaderboardEntry(gameMode, uint256(existingIndex));
        }
        
        // Insert new entry in correct position
        uint256 insertPosition = _findInsertPosition(gameMode, newEntry.score);
        
        if (insertPosition < MAX_LEADERBOARD_SIZE) {
            _insertLeaderboardEntry(gameMode, newEntry, insertPosition);
            
            emit LeaderboardUpdated(
                gameMode,
                newEntry.player,
                insertPosition + 1, // 1-based position
                newEntry.score
            );
        }
    }
    
    /**
     * @dev Find the correct position to insert a new score
     */
    function _findInsertPosition(GameMode gameMode, uint256 score) internal view returns (uint256) {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (score > leaderboard[i].score) {
                return i;
            }
        }
        
        return leaderboard.length;
    }
    
    /**
     * @dev Insert entry at specific position
     */
    function _insertLeaderboardEntry(
        GameMode gameMode,
        LeaderboardEntry memory entry,
        uint256 position
    ) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        // Add to end if within limit
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            leaderboard.push(entry);
        }
        
        // Shift entries to make room
        for (uint256 i = leaderboard.length - 1; i > position; i--) {
            leaderboard[i] = leaderboard[i - 1];
        }
        
        leaderboard[position] = entry;
        
        // Remove last entry if over limit
        if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
            leaderboard.pop();
        }
    }
    
    /**
     * @dev Remove entry at specific position
     */
    function _removeLeaderboardEntry(GameMode gameMode, uint256 index) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        require(index < leaderboard.length, "Index out of bounds");
        
        for (uint256 i = index; i < leaderboard.length - 1; i++) {
            leaderboard[i] = leaderboard[i + 1];
        }
        
        leaderboard.pop();
    }
    
    /**
     * @dev Get top N scores for a specific game mode
     * @param gameMode The game mode to query
     * @param n Number of top scores to return (max 50 for gas efficiency)
     */
    function getTopScores(GameMode gameMode, uint256 n) 
        external 
        view 
        validGameMode(gameMode) 
        returns (LeaderboardEntry[] memory) 
    {
        require(n <= 50, "Cannot return more than 50 entries at once");
        
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        uint256 returnLength = n > leaderboard.length ? leaderboard.length : n;
        
        LeaderboardEntry[] memory result = new LeaderboardEntry[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            result[i] = leaderboard[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get paginated leaderboard for a specific game mode
     * @param gameMode The game mode to query
     * @param offset Starting position (0-based)
     * @param limit Number of entries to return (max 50)
     */
    function getLeaderboardPaginated(
        GameMode gameMode,
        uint256 offset,
        uint256 limit
    ) external view validGameMode(gameMode) returns (LeaderboardEntry[] memory) {
        require(limit <= 50, "Limit too high for gas efficiency");
        
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        if (offset >= leaderboard.length) {
            return new LeaderboardEntry[](0);
        }
        
        uint256 end = offset + limit;
        if (end > leaderboard.length) {
            end = leaderboard.length;
        }
        
        uint256 resultLength = end - offset;
        LeaderboardEntry[] memory result = new LeaderboardEntry[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = leaderboard[offset + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get combined leaderboard (both modes) - top N from each
     * @param n Number of top scores per mode (max 25 each for gas efficiency)
     */
    function getCombinedLeaderboard(uint256 n) 
        external 
        view 
        returns (LeaderboardEntry[] memory classicEntries, LeaderboardEntry[] memory arcadeEntries) 
    {
        require(n <= 25, "Cannot return more than 25 entries per mode");
        
        classicEntries = this.getTopScores(GameMode.Classic, n);
        arcadeEntries = this.getTopScores(GameMode.Arcade, n);
    }
    
    /**
     * @dev Get player statistics for a specific game mode
     */
    function getPlayerModeStats(address player, GameMode gameMode) 
        external 
        view 
        validGameMode(gameMode) 
        returns (PlayerModeStats memory) 
    {
        return playerStats[gameMode][player];
    }
    
    /**
     * @dev Get complete player statistics (both modes)
     */
    function getPlayerStats(address player) 
        external 
        view 
        returns (PlayerStats memory) 
    {
        return PlayerStats({
            classicStats: playerStats[GameMode.Classic][player],
            arcadeStats: playerStats[GameMode.Arcade][player]
        });
    }
    
    /**
     * @dev Get batch player statistics for multiple players (gas optimized)
     * @param players Array of player addresses (max 20 for gas efficiency)
     * @param gameMode The game mode to query
     */
    function getBatchPlayerStats(address[] calldata players, GameMode gameMode) 
        external 
        view 
        validGameMode(gameMode) 
        returns (PlayerModeStats[] memory) 
    {
        require(players.length <= 20, "Too many players for batch operation");
        
        PlayerModeStats[] memory results = new PlayerModeStats[](players.length);
        
        for (uint256 i = 0; i < players.length; i++) {
            results[i] = playerStats[gameMode][players[i]];
        }
        
        return results;
    }
    
    /**
     * @dev Get leaderboard statistics for a game mode
     */
    function getLeaderboardStats(GameMode gameMode) 
        external 
        view 
        validGameMode(gameMode) 
        returns (
            uint256 totalGames,
            uint256 totalPlayers,
            uint256 leaderboardSize,
            uint256 highestScore,
            address topPlayer
        ) 
    {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        totalGames = totalGamesPlayed[gameMode];
        totalPlayers = totalPlayersCount[gameMode];
        leaderboardSize = leaderboard.length;
        
        if (leaderboard.length > 0) {
            highestScore = leaderboard[0].score;
            topPlayer = leaderboard[0].player;
        }
    }
    
    /**
     * @dev Get player's rank in a specific game mode (1-based, 0 if not ranked)
     */
    function getPlayerRank(address player, GameMode gameMode) 
        external 
        view 
        validGameMode(gameMode) 
        returns (uint256) 
    {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                return i + 1; // 1-based rank
            }
        }
        
        return 0; // Not ranked
    }
    
    /**
     * @dev Seed leaderboard with initial data (owner only)
     * @param gameMode The game mode to seed
     * @param entries Array of leaderboard entries to add
     */
    function seedLeaderboard(
        GameMode gameMode,
        LeaderboardEntry[] calldata entries
    ) external onlyOwner validGameMode(gameMode) {
        require(entries.length <= MAX_BATCH_SIZE, "Too many entries for single transaction");
        require(leaderboards[gameMode].length == 0, "Leaderboard already has entries");
        
        for (uint256 i = 0; i < entries.length; i++) {
            LeaderboardEntry memory entry = entries[i];
            require(entry.player != address(0), "Invalid player address");
            require(entry.score > 0, "Invalid score");
            
            // Update player stats
            PlayerModeStats storage stats = playerStats[gameMode][entry.player];
            if (stats.totalGames == 0) {
                totalPlayersCount[gameMode]++;
            }
            
            stats.totalGames++;
            stats.totalScore += entry.score;
            stats.averageScore = stats.totalScore / stats.totalGames;
            
            if (entry.score > stats.highScore) {
                stats.highScore = entry.score;
            }
            
            if (entry.round > stats.bestRound) {
                stats.bestRound = entry.round;
            }
            
            stats.lastGameTimestamp = entry.timestamp;
            totalGamesPlayed[gameMode]++;
            
            leaderboards[gameMode].push(entry);
        }
        
        // Sort the seeded leaderboard
        _sortLeaderboard(gameMode);
        
        emit LeaderboardSeeded(gameMode, entries.length);
    }
    
    /**
     * @dev Sort leaderboard by score (descending)
     */
    function _sortLeaderboard(GameMode gameMode) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        uint256 length = leaderboard.length;
        
        // Simple bubble sort (fine for initial seeding)
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (leaderboard[j].score < leaderboard[j + 1].score) {
                    LeaderboardEntry memory temp = leaderboard[j];
                    leaderboard[j] = leaderboard[j + 1];
                    leaderboard[j + 1] = temp;
                }
            }
        }
        
        // Trim to max size if needed
        while (leaderboard.length > MAX_LEADERBOARD_SIZE) {
            leaderboard.pop();
        }
    }
    
    /**
     * @dev Add or remove authorized score submitter (owner only)
     * @param submitter The address to authorize/deauthorize
     * @param authorized True to authorize, false to deauthorize
     */
    function setAuthorizedSubmitter(address submitter, bool authorized) 
        external 
        onlyOwner 
    {
        require(submitter != address(0), "Invalid submitter address");
        authorizedSubmitters[submitter] = authorized;
        
        emit AuthorizedSubmitterUpdated(submitter, authorized);
    }
    
    /**
     * @dev Emergency function to clear a game mode's leaderboard (owner only)
     * @param gameMode The game mode to clear
     */
    function clearLeaderboard(GameMode gameMode) 
        external 
        onlyOwner 
        validGameMode(gameMode) 
    {
        delete leaderboards[gameMode];
        totalGamesPlayed[gameMode] = 0;
        totalPlayersCount[gameMode] = 0;
    }
    
    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}