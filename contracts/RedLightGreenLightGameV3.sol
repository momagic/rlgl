// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
// Removed Counters import - using simple uint256 instead

/**
 * @title RedLightGreenLightGameV3
 * @dev Advanced game contract with full configurability, migration support, and daily rewards
 * @notice Features: Dynamic pricing, token migration, localStorage compatibility, daily claims, enhanced leaderboards
 */
contract RedLightGreenLightGameV3 is ERC20, Ownable, ReentrancyGuard, Pausable {
    // Using simple uint256 counter instead of Counters library

    // ============ CONSTANTS ============
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant DAILY_CLAIM_AMOUNT = 100 * 10**18; // 100 RLGL tokens
    uint256 public constant MAX_DAILY_CLAIM_STREAK = 30; // Max streak bonus days
    uint256 public constant STREAK_BONUS_MULTIPLIER = 10 * 10**18; // 10 tokens per streak day
    uint256 public constant FREE_TURNS_PER_DAY = 3;
    uint256 public constant TURN_RESET_PERIOD = 24 hours;
    uint256 public constant WEEKLY_PASS_DURATION = 7 days;
    uint256 public constant DAILY_CLAIM_COOLDOWN = 24 hours;
    
    // ============ STATE VARIABLES ============
    IERC20 public immutable wldToken;
    IERC20 public immutable rlglTokenV1;
    IERC20 public immutable rlglTokenV2;
    
    // Dynamic pricing (owner configurable)
    uint256 public tokensPerPoint = 1e17; // 0.1 tokens per point (default)
    uint256 public additionalTurnsCost = 5e17; // 0.5 WLD (default)
    uint256 public weeklyPassCost = 5e18; // 5 WLD (default)
    
    // Verification-based pricing multipliers (Document verification and above required)
    uint256 public orbPlusMultiplier = 140; // 140% (40% bonus for Orb+ verified)
    uint256 public orbMultiplier = 125; // 125% (25% bonus for Orb verified)
    uint256 public secureDocumentMultiplier = 115; // 115% (15% bonus for Secure Document verified)
    uint256 public documentMultiplier = 100; // 100% (baseline for Document verified - minimum required)
    
    // Price bounds
    uint256 public constant MIN_TOKENS_PER_POINT = 1e16; // 0.01 tokens
    uint256 public constant MAX_TOKENS_PER_POINT = 1e18; // 1 token
    uint256 public constant MIN_TURN_COST = 1e17; // 0.1 WLD
    uint256 public constant MAX_TURN_COST = 5e18; // 5 WLD
    uint256 public constant MIN_WEEKLY_PASS_COST = 1e18; // 1 WLD
    uint256 public constant MAX_WEEKLY_PASS_COST = 20e18; // 20 WLD
    
    // Game modes
    enum GameMode { Classic, Arcade }
    
    // Verification levels
    enum VerificationLevel { None, Device, Document, SecureDocument, Orb, OrbPlus }
    
    // Player data structure
    struct Player {
        uint256 lastResetTime;
        uint256 freeTurnsUsed;
        uint256 totalGamesPlayed;
        uint256 highScore;
        uint256 totalPointsEarned;
        uint256 weeklyPassExpiry;
        uint256 lastDailyClaim;
        uint256 dailyClaimStreak;
        bool hasMigratedTokens;
        uint256 extraGoes; // localStorage compatibility
        uint256 passes; // localStorage compatibility
        VerificationLevel verificationLevel; // User verification level
        bool isVerified; // Whether user has completed verification
    }
    
    // Game result structure
    struct GameResult {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
        GameMode gameMode;
        uint256 tokensEarned;
        uint256 gameId;
    }
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        uint256 round;
        GameMode gameMode;
        uint256 gameId;
    }
    
    // ============ STORAGE ============
    mapping(address => Player) public players;
    mapping(GameMode => LeaderboardEntry[]) public leaderboards;
    mapping(GameMode => mapping(address => uint256)) public playerHighScores;
    mapping(address => uint256[]) public playerGameIds;
    mapping(address => bool) public authorizedSubmitters;
    
    uint256 private _gameIdCounter;
    uint256 public totalGamesPlayed;
    uint256 public totalPlayersCount;
    
    // Migration tracking
    mapping(address => bool) public hasMigratedFromV1;
    mapping(address => bool) public hasMigratedFromV2;
    
    // Verification tracking
    mapping(address => VerificationLevel) public userVerificationLevels;
    
    // ============ EVENTS ============
    event GameCompleted(
        address indexed player,
        GameMode indexed gameMode,
        uint256 score,
        uint256 tokensEarned,
        uint256 gameId,
        bool isNewHighScore
    );
    
    event TurnsPurchased(
        address indexed player,
        uint256 cost,
        uint256 turnsGranted
    );
    
    event WeeklyPassPurchased(
        address indexed player,
        uint256 cost,
        uint256 expiryTime
    );
    
    event DailyClaimed(
        address indexed player,
        uint256 amount,
        uint256 streak,
        uint256 bonus
    );
    
    event TokensMigrated(
        address indexed player,
        uint256 v1Amount,
        uint256 v2Amount,
        uint256 totalMigrated
    );
    
    event HighScoreUpdated(
        address indexed player,
        GameMode indexed gameMode,
        uint256 newHighScore
    );
    
    event PricingUpdated(
        uint256 oldTokensPerPoint,
        uint256 newTokensPerPoint,
        uint256 oldTurnCost,
        uint256 newTurnCost,
        uint256 oldPassCost,
        uint256 newPassCost
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
    
    event UserVerified(
        address indexed user,
        VerificationLevel verificationLevel,
        bool isVerified
    );
    
    event VerificationMultipliersUpdated(
        uint256 orbPlusMultiplier,
        uint256 orbMultiplier,
        uint256 secureDocumentMultiplier,
        uint256 documentMultiplier,
        uint256 deviceMultiplier,
        uint256 unverifiedMultiplier
    );
    
    // ============ MODIFIERS ============
    modifier onlyAuthorizedSubmitter() {
        require(
            authorizedSubmitters[msg.sender] || msg.sender == owner(),
            "Not authorized to submit scores"
        );
        _;
    }
    
    modifier validGameMode(GameMode gameMode) {
        require(uint8(gameMode) <= 1, "Invalid game mode");
        _;
    }
    
    modifier validVerificationLevel(VerificationLevel level) {
        require(uint8(level) <= 5, "Invalid verification level");
        _;
    }
    
    // Using built-in whenNotPaused modifier from Pausable
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _wldToken,
        address _rlglTokenV1,
        address _rlglTokenV2,
        address _developerWallet
    ) ERC20("Red Light Green Light Token V3", "RLGL") Ownable(msg.sender) {
        require(_developerWallet != address(0), "Developer wallet cannot be zero address");
        
        wldToken = IERC20(_wldToken);
        rlglTokenV1 = IERC20(_rlglTokenV1);
        rlglTokenV2 = IERC20(_rlglTokenV2);
        _gameIdCounter = 1; // Start from 1
        
        // Mint 1 million tokens to developer wallet for promotions and liquidity
        uint256 developerAllocation = 1_000_000 * 10**18; // 1 million tokens
        require(developerAllocation <= MAX_SUPPLY, "Developer allocation exceeds max supply");
        _mint(_developerWallet, developerAllocation);
    }
    
    // ============ CORE GAME FUNCTIONS ============
    
    /**
     * @dev Check how many turns a player has available
     */
    function getAvailableTurns(address player) public view returns (uint256) {
        Player memory playerData = players[player];
        
        // Check if weekly pass is active
        if (block.timestamp < playerData.weeklyPassExpiry) {
            return type(uint256).max; // Unlimited turns
        }
        
        // Check if reset period has passed
        if (block.timestamp >= playerData.lastResetTime + TURN_RESET_PERIOD) {
            return FREE_TURNS_PER_DAY + playerData.extraGoes; // Free turns + localStorage extra goes
        }
        
        // Return remaining free turns + localStorage extra goes
        if (playerData.freeTurnsUsed >= FREE_TURNS_PER_DAY) {
            return playerData.extraGoes;
        }
        
        return (FREE_TURNS_PER_DAY - playerData.freeTurnsUsed) + playerData.extraGoes;
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
    function purchaseAdditionalTurns() external nonReentrant whenNotPaused {
        require(getAvailableTurns(msg.sender) == 0, "Still have turns available");
        
        // Transfer WLD from player
        require(
            wldToken.transferFrom(msg.sender, address(this), additionalTurnsCost),
            "WLD transfer failed"
        );
        
        // Reset the player's turn system to give them 3 more turns
        players[msg.sender].freeTurnsUsed = 0;
        players[msg.sender].lastResetTime = block.timestamp;
        
        emit TurnsPurchased(msg.sender, additionalTurnsCost, FREE_TURNS_PER_DAY);
    }
    
    /**
     * @dev Purchase weekly pass for unlimited turns
     */
    function purchaseWeeklyPass() external nonReentrant whenNotPaused {
        require(
            wldToken.transferFrom(msg.sender, address(this), weeklyPassCost),
            "WLD transfer failed"
        );
        
        Player storage player = players[msg.sender];
        player.weeklyPassExpiry = block.timestamp + WEEKLY_PASS_DURATION;
        
        emit WeeklyPassPurchased(msg.sender, weeklyPassCost, player.weeklyPassExpiry);
    }
    
    /**
     * @dev Start a game (consume a turn)
     */
    function startGame() external whenNotPaused {
        require(getAvailableTurns(msg.sender) > 0, "No turns available");
        require(_hasRequiredVerification(msg.sender), "Document verification or higher required");
        
        Player storage player = players[msg.sender];
        
        // Check if reset period has passed
        if (block.timestamp >= player.lastResetTime + TURN_RESET_PERIOD) {
            player.lastResetTime = block.timestamp;
            player.freeTurnsUsed = 0;
        }
        
        // Consume a turn (prioritize free turns over extra goes)
        if (player.freeTurnsUsed < FREE_TURNS_PER_DAY) {
            player.freeTurnsUsed++;
        } else {
            require(player.extraGoes > 0, "No extra goes available");
            player.extraGoes--;
        }
    }
    
    /**
     * @dev Submit game score and mint reward tokens
     */
    function submitScore(
        address playerAddress,
        uint256 score,
        uint256 round,
        GameMode gameMode
    ) external onlyAuthorizedSubmitter validGameMode(gameMode) whenNotPaused {
        require(score > 0, "Score must be greater than 0");
        require(round > 0, "Round must be greater than 0");
        require(_hasRequiredVerification(playerAddress), "Document verification or higher required");
        
        Player storage player = players[playerAddress];
        
        // Update player stats
        if (player.totalGamesPlayed == 0) {
            totalPlayersCount++;
        }
        
        player.totalGamesPlayed++;
        player.totalPointsEarned += score;
        totalGamesPlayed++;
        
        // Check for new high score
        bool isNewHighScore = false;
        if (score > playerHighScores[gameMode][playerAddress]) {
            playerHighScores[gameMode][playerAddress] = score;
            player.highScore = score > player.highScore ? score : player.highScore;
            isNewHighScore = true;
            emit HighScoreUpdated(playerAddress, gameMode, score);
        }
        
        // Record game
        uint256 gameId = _gameIdCounter;
        _gameIdCounter++;
        
        playerGameIds[playerAddress].push(gameId);
        
        // Calculate base reward tokens
        uint256 baseTokens = score * tokensPerPoint;
        
        // Apply verification multiplier
        uint256 multiplier = _getVerificationMultiplier(playerAddress);
        uint256 tokensToMint = (baseTokens * multiplier) / 100;
        
        require(totalSupply() + tokensToMint <= MAX_SUPPLY, "Would exceed max supply");
        _mint(playerAddress, tokensToMint);
        
        // Update leaderboard
        _updateLeaderboard(gameMode, playerAddress, score, round, gameId);
        
        emit GameCompleted(
            playerAddress,
            gameMode,
            score,
            tokensToMint,
            gameId,
            isNewHighScore
        );
    }
    
    // ============ DAILY CLAIM SYSTEM ============
    
    /**
     * @dev Claim daily reward (100 RLGL tokens + streak bonus)
     */
    function claimDailyReward() external nonReentrant whenNotPaused {
        Player storage player = players[msg.sender];
        
        require(
            block.timestamp >= player.lastDailyClaim + DAILY_CLAIM_COOLDOWN,
            "Daily claim cooldown not met"
        );
        
        uint256 baseAmount = DAILY_CLAIM_AMOUNT;
        uint256 streakBonus = 0;
        
        // Calculate streak bonus
        if (player.dailyClaimStreak > 0 && player.dailyClaimStreak < MAX_DAILY_CLAIM_STREAK) {
            streakBonus = player.dailyClaimStreak * STREAK_BONUS_MULTIPLIER;
        }
        
        uint256 totalAmount = baseAmount + streakBonus;
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Would exceed max supply");
        
        // Update player data
        player.lastDailyClaim = block.timestamp;
        player.dailyClaimStreak++;
        
        // Mint tokens
        _mint(msg.sender, totalAmount);
        
        emit DailyClaimed(msg.sender, baseAmount, player.dailyClaimStreak, streakBonus);
    }
    
    /**
     * @dev Get daily claim status for a player
     */
    function getDailyClaimStatus(address player) external view returns (
        bool canClaim,
        uint256 timeUntilNextClaim,
        uint256 currentStreak,
        uint256 nextReward
    ) {
        Player memory playerData = players[player];
        
        canClaim = block.timestamp >= playerData.lastDailyClaim + DAILY_CLAIM_COOLDOWN;
        
        if (canClaim) {
            timeUntilNextClaim = 0;
        } else {
            timeUntilNextClaim = (playerData.lastDailyClaim + DAILY_CLAIM_COOLDOWN) - block.timestamp;
        }
        
        currentStreak = playerData.dailyClaimStreak;
        nextReward = DAILY_CLAIM_AMOUNT + (currentStreak * STREAK_BONUS_MULTIPLIER);
    }
    
    // ============ VERIFICATION SYSTEM ============
    
    /**
     * @dev Set user verification status (called by authorized verifier)
     */
    function setUserVerification(
        address user,
        VerificationLevel verificationLevel,
        bool isVerified
    ) external onlyAuthorizedSubmitter validVerificationLevel(verificationLevel) {
        Player storage player = players[user];
        
        // Update verification status
        player.verificationLevel = verificationLevel;
        player.isVerified = isVerified;
        
        // Update verification tracking
        userVerificationLevels[user] = verificationLevel;
        
        emit UserVerified(user, verificationLevel, isVerified);
    }
    
    /**
     * @dev Get verification multiplier for a user
     */
    function _getVerificationMultiplier(address user) internal view returns (uint256) {
        Player memory player = players[user];
        
        // Only verified users with Document level or higher can play
        if (!player.isVerified || player.verificationLevel < VerificationLevel.Document) {
            revert("Document verification or higher required");
        }
        
        if (player.verificationLevel == VerificationLevel.OrbPlus) {
            return orbPlusMultiplier;
        } else if (player.verificationLevel == VerificationLevel.Orb) {
            return orbMultiplier;
        } else if (player.verificationLevel == VerificationLevel.SecureDocument) {
            return secureDocumentMultiplier;
        } else if (player.verificationLevel == VerificationLevel.Document) {
            return documentMultiplier;
        }
        
        // This should never be reached due to the check above
        revert("Invalid verification level");
    }
    
    /**
     * @dev Check if user has required verification level (Document or higher)
     */
    function _hasRequiredVerification(address user) internal view returns (bool) {
        Player memory player = players[user];
        
        // Require at least Document verification (level 2) or higher
        return player.isVerified && 
               player.verificationLevel >= VerificationLevel.Document;
    }
    
    /**
     * @dev Get user verification status
     */
    function getUserVerificationStatus(address user) external view returns (
        VerificationLevel verificationLevel,
        bool isVerified,
        uint256 multiplier
    ) {
        Player memory player = players[user];
        return (
            player.verificationLevel,
            player.isVerified,
            _getVerificationMultiplier(user)
        );
    }
    
    /**
     * @dev Check if user has Orb+ verification
     */
    function isUserOrbPlusVerified(address user) external view returns (bool) {
        return userVerificationLevels[user] == VerificationLevel.OrbPlus;
    }
    
    /**
     * @dev Check if user has Orb verification
     */
    function isUserOrbVerified(address user) external view returns (bool) {
        return userVerificationLevels[user] == VerificationLevel.Orb;
    }
    
    /**
     * @dev Check if user has Secure Document verification
     */
    function isUserSecureDocumentVerified(address user) external view returns (bool) {
        return userVerificationLevels[user] == VerificationLevel.SecureDocument;
    }
    
    /**
     * @dev Check if user has Document verification
     */
    function isUserDocumentVerified(address user) external view returns (bool) {
        return userVerificationLevels[user] == VerificationLevel.Document;
    }
    
    /**
     * @dev Check if user has Device verification
     */
    function isUserDeviceVerified(address user) external view returns (bool) {
        return userVerificationLevels[user] == VerificationLevel.Device;
    }
    
    // ============ TOKEN MIGRATION ============
    
    /**
     * @dev Migrate tokens from V1 and V2 contracts
     */
    function migrateTokens() external nonReentrant {
        require(!players[msg.sender].hasMigratedTokens, "Already migrated");
        
        uint256 v1Balance = rlglTokenV1.balanceOf(msg.sender);
        uint256 v2Balance = rlglTokenV2.balanceOf(msg.sender);
        
        require(v1Balance > 0 || v2Balance > 0, "No tokens to migrate");
        
        uint256 totalToMigrate = v1Balance + v2Balance;
        
        // Transfer tokens from V1 and V2 contracts
        if (v1Balance > 0) {
            require(
                rlglTokenV1.transferFrom(msg.sender, address(this), v1Balance),
                "V1 transfer failed"
            );
            hasMigratedFromV1[msg.sender] = true;
        }
        
        if (v2Balance > 0) {
            require(
                rlglTokenV2.transferFrom(msg.sender, address(this), v2Balance),
                "V2 transfer failed"
            );
            hasMigratedFromV2[msg.sender] = true;
        }
        
        // Mint equivalent tokens in V3
        require(totalSupply() + totalToMigrate <= MAX_SUPPLY, "Would exceed max supply");
        _mint(msg.sender, totalToMigrate);
        
        players[msg.sender].hasMigratedTokens = true;
        
        emit TokensMigrated(msg.sender, v1Balance, v2Balance, totalToMigrate);
    }
    
    // ============ LOCALSTORAGE COMPATIBILITY ============
    
    /**
     * @dev Set extra goes from localStorage (for compatibility)
     */
    function setExtraGoes(uint256 extraGoes) external {
        players[msg.sender].extraGoes = extraGoes;
    }
    
    /**
     * @dev Set passes from localStorage (for compatibility)
     */
    function setPasses(uint256 passes) external {
        players[msg.sender].passes = passes;
    }
    
    /**
     * @dev Get localStorage data for a player
     */
    function getLocalStorageData(address player) external view returns (
        uint256 extraGoes,
        uint256 passes
    ) {
        Player memory playerData = players[player];
        return (playerData.extraGoes, playerData.passes);
    }
    
    // ============ LEADERBOARD FUNCTIONS ============
    
    /**
     * @dev Update leaderboard with new score
     */
    function _updateLeaderboard(
        GameMode gameMode,
        address player,
        uint256 score,
        uint256 round,
        uint256 gameId
    ) internal {
        LeaderboardEntry[] storage leaderboard = leaderboards[gameMode];
        
        // Find if player already exists in leaderboard
        int256 existingIndex = -1;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                existingIndex = int256(i);
                break;
            }
        }
        
        // Remove existing entry if found
        if (existingIndex >= 0) {
            _removeLeaderboardEntry(gameMode, uint256(existingIndex));
        }
        
        // Create new entry
        LeaderboardEntry memory newEntry = LeaderboardEntry({
            player: player,
            score: score,
            timestamp: block.timestamp,
            round: round,
            gameMode: gameMode,
            gameId: gameId
        });
        
        // Insert in correct position
        uint256 insertPosition = _findInsertPosition(gameMode, score);
        
        if (insertPosition < 100) { // Keep top 100
            _insertLeaderboardEntry(gameMode, newEntry, insertPosition);
            
            emit LeaderboardUpdated(
                gameMode,
                player,
                insertPosition + 1,
                score
            );
        }
    }
    
    /**
     * @dev Find correct position to insert new score
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
        if (leaderboard.length < 100) {
            leaderboard.push(entry);
        }
        
        // Shift entries to make room
        for (uint256 i = leaderboard.length - 1; i > position; i--) {
            leaderboard[i] = leaderboard[i - 1];
        }
        
        leaderboard[position] = entry;
        
        // Remove last entry if over limit
        if (leaderboard.length > 100) {
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
     * @dev Get top N scores for a game mode
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
     * @dev Get player's rank in a game mode
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
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Update all pricing parameters
     */
    function updatePricing(
        uint256 newTokensPerPoint,
        uint256 newTurnCost,
        uint256 newPassCost
    ) external onlyOwner {
        require(
            newTokensPerPoint >= MIN_TOKENS_PER_POINT && 
            newTokensPerPoint <= MAX_TOKENS_PER_POINT,
            "Tokens per point out of bounds"
        );
        require(
            newTurnCost >= MIN_TURN_COST && 
            newTurnCost <= MAX_TURN_COST,
            "Turn cost out of bounds"
        );
        require(
            newPassCost >= MIN_WEEKLY_PASS_COST && 
            newPassCost <= MAX_WEEKLY_PASS_COST,
            "Pass cost out of bounds"
        );
        
        uint256 oldTokensPerPoint = tokensPerPoint;
        uint256 oldTurnCost = additionalTurnsCost;
        uint256 oldPassCost = weeklyPassCost;
        
        tokensPerPoint = newTokensPerPoint;
        additionalTurnsCost = newTurnCost;
        weeklyPassCost = newPassCost;
        
        emit PricingUpdated(
            oldTokensPerPoint,
            newTokensPerPoint,
            oldTurnCost,
            newTurnCost,
            oldPassCost,
            newPassCost
        );
    }
    
    /**
     * @dev Add or remove authorized score submitter
     */
    function setAuthorizedSubmitter(address submitter, bool authorized) external onlyOwner {
        require(submitter != address(0), "Invalid submitter address");
        authorizedSubmitters[submitter] = authorized;
        
        emit AuthorizedSubmitterUpdated(submitter, authorized);
    }
    
    /**
     * @dev Update verification multipliers
     */
    function updateVerificationMultipliers(
        uint256 newOrbPlusMultiplier,
        uint256 newOrbMultiplier,
        uint256 newSecureDocumentMultiplier,
        uint256 newDocumentMultiplier
    ) external onlyOwner {
        require(newOrbPlusMultiplier >= 100 && newOrbPlusMultiplier <= 200, "Orb+ multiplier out of bounds");
        require(newOrbMultiplier >= 100 && newOrbMultiplier <= 180, "Orb multiplier out of bounds");
        require(newSecureDocumentMultiplier >= 100 && newSecureDocumentMultiplier <= 150, "Secure Document multiplier out of bounds");
        require(newDocumentMultiplier >= 100 && newDocumentMultiplier <= 120, "Document multiplier out of bounds");
        
        // Ensure hierarchy: Orb+ >= Orb >= Secure Document >= Document (Document is baseline)
        require(newOrbPlusMultiplier >= newOrbMultiplier, "Orb+ multiplier must be >= Orb multiplier");
        require(newOrbMultiplier >= newSecureDocumentMultiplier, "Orb multiplier must be >= Secure Document multiplier");
        require(newSecureDocumentMultiplier >= newDocumentMultiplier, "Secure Document multiplier must be >= Document multiplier");
        
        orbPlusMultiplier = newOrbPlusMultiplier;
        orbMultiplier = newOrbMultiplier;
        secureDocumentMultiplier = newSecureDocumentMultiplier;
        documentMultiplier = newDocumentMultiplier;
        
        emit VerificationMultipliersUpdated(
            newOrbPlusMultiplier,
            newOrbMultiplier,
            newSecureDocumentMultiplier,
            newDocumentMultiplier,
            0, // Device multiplier no longer used
            0  // Unverified multiplier no longer used
        );
    }
    
    /**
     * @dev Pause/unpause the contract
     */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @dev Withdraw collected WLD fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = wldToken.balanceOf(address(this));
        require(balance > 0, "No WLD to withdraw");
        require(wldToken.transfer(owner(), balance), "WLD transfer failed");
    }
    
    /**
     * @dev Emergency function to clear a game mode's leaderboard
     */
    function clearLeaderboard(GameMode gameMode) 
        external 
        onlyOwner 
        validGameMode(gameMode) 
    {
        delete leaderboards[gameMode];
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get player statistics
     */
    function getPlayerStats(address player) external view returns (
        uint256 freeTurnsUsed,
        uint256 lastResetTime,
        uint256 playerTotalGamesPlayed,
        uint256 highScore,
        uint256 totalPointsEarned,
        uint256 tokenBalance,
        uint256 availableTurns,
        uint256 timeUntilReset,
        uint256 weeklyPassExpiry,
        uint256 lastDailyClaim,
        uint256 dailyClaimStreak,
        bool hasMigratedTokens,
        uint256 extraGoes,
        uint256 passes,
        VerificationLevel verificationLevel,
        bool isVerified,
        uint256 verificationMultiplier
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
            getTimeUntilReset(player),
            playerData.weeklyPassExpiry,
            playerData.lastDailyClaim,
            playerData.dailyClaimStreak,
            playerData.hasMigratedTokens,
            playerData.extraGoes,
            playerData.passes,
            playerData.verificationLevel,
            playerData.isVerified,
            _getVerificationMultiplier(player)
        );
    }
    
    /**
     * @dev Get current pricing
     */
    function getCurrentPricing() external view returns (
        uint256 currentTokensPerPoint,
        uint256 turnCost,
        uint256 passCost
    ) {
        return (tokensPerPoint, additionalTurnsCost, weeklyPassCost);
    }
    
    /**
     * @dev Get current verification multipliers
     */
    function getVerificationMultipliers() external view returns (
        uint256 currentOrbPlusMultiplier,
        uint256 currentOrbMultiplier,
        uint256 currentSecureDocumentMultiplier,
        uint256 currentDocumentMultiplier
    ) {
        return (
            orbPlusMultiplier,
            orbMultiplier,
            secureDocumentMultiplier,
            documentMultiplier
        );
    }
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 currentTotalSupply,
        uint256 maxSupply,
        uint256 totalGames,
        uint256 totalPlayers,
        bool isPaused
    ) {
        return (
            totalSupply(),
            MAX_SUPPLY,
            totalGamesPlayed,
            totalPlayersCount,
            paused()
        );
    }
    
    /**
     * @dev Get player's game history
     */
    function getPlayerGameHistory(address player) external view returns (uint256[] memory) {
        return playerGameIds[player];
    }
    
    /**
     * @dev Check if player has active weekly pass
     */
    function hasActiveWeeklyPass(address player) external view returns (bool) {
        return block.timestamp < players[player].weeklyPassExpiry;
    }
    
    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "3.0.0";
    }
}
