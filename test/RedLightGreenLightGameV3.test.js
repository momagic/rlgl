const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedLightGreenLightGameV3", function () {
    let RedLightGreenLightGameV3;
    let MockWLDToken;
    let MockRLGLTokenV1;
    let MockRLGLTokenV2;
    
    let v3Game;
    let wldToken;
    let rlglTokenV1;
    let rlglTokenV2;
    let owner;
    let player1;
    let player2;
    let player3;
    let authorizedSubmitter;
    let addrs;

    const GAME_MODES = {
        Classic: 0,
        Arcade: 1
    };

    const VERIFICATION_LEVELS = {
        None: 0,
        Device: 1,
        Document: 2,
        SecureDocument: 3,
        Orb: 4,
        OrbPlus: 5
    };

    beforeEach(async function () {
        // Get signers
        [owner, player1, player2, player3, authorizedSubmitter, ...addrs] = await ethers.getSigners();

        // Deploy mock tokens
        MockWLDToken = await ethers.getContractFactory("MockERC20");
        MockRLGLTokenV1 = await ethers.getContractFactory("MockERC20");
        MockRLGLTokenV2 = await ethers.getContractFactory("MockERC20");

        wldToken = await MockWLDToken.deploy("Worldcoin", "WLD");
        rlglTokenV1 = await MockRLGLTokenV1.deploy("RLGL V1", "RLGL");
        rlglTokenV2 = await MockRLGLTokenV2.deploy("RLGL V2", "RLGL");

        // Deploy V3 game contract
        RedLightGreenLightGameV3 = await ethers.getContractFactory("RedLightGreenLightGameV3");
        v3Game = await RedLightGreenLightGameV3.deploy(
            wldToken.address,
            rlglTokenV1.address,
            rlglTokenV2.address,
            owner.address // Developer wallet (using owner for testing)
        );

        // Set up authorized submitter
        await v3Game.setAuthorizedSubmitter(authorizedSubmitter.address, true);

        // Set verification for test players (Document level - minimum required)
        await v3Game.connect(authorizedSubmitter).setUserVerification(player1.address, VERIFICATION_LEVELS.Document, true);
        await v3Game.connect(authorizedSubmitter).setUserVerification(player2.address, VERIFICATION_LEVELS.SecureDocument, true);
        await v3Game.connect(authorizedSubmitter).setUserVerification(player3.address, VERIFICATION_LEVELS.Orb, true);

        // Mint some WLD tokens to players for testing
        await wldToken.mint(player1.address, ethers.parseEther("100"));
        await wldToken.mint(player2.address, ethers.parseEther("100"));
        await wldToken.mint(player3.address, ethers.parseEther("100"));

        // Mint some RLGL tokens to V1 and V2 contracts for migration testing
        await rlglTokenV1.mint(player1.address, ethers.parseEther("1000"));
        await rlglTokenV2.mint(player1.address, ethers.parseEther("500"));
    });

    describe("Deployment", function () {
        it("Should deploy with correct initial values", async function () {
            expect(await v3Game.name()).to.equal("Red Light Green Light Token V3");
            expect(await v3Game.symbol()).to.equal("RLGL");
            expect(await v3Game.owner()).to.equal(owner.address);
            expect(await v3Game.wldToken()).to.equal(wldToken.address);
            expect(await v3Game.rlglTokenV1()).to.equal(rlglTokenV1.address);
            expect(await v3Game.rlglTokenV2()).to.equal(rlglTokenV2.address);
        });

        it("Should have correct default pricing", async function () {
            const pricing = await v3Game.getCurrentPricing();
            expect(pricing.currentTokensPerPoint).to.equal(ethers.parseEther("0.1"));
            expect(pricing.turnCost).to.equal(ethers.parseEther("0.5"));
            expect(pricing.passCost).to.equal(ethers.parseEther("5"));
        });

        it("Should have correct verification multipliers", async function () {
            const multipliers = await v3Game.getVerificationMultipliers();
            expect(multipliers.currentOrbPlusMultiplier).to.equal(140);
            expect(multipliers.currentOrbMultiplier).to.equal(125);
            expect(multipliers.currentSecureDocumentMultiplier).to.equal(115);
            expect(multipliers.currentDocumentMultiplier).to.equal(100);
        });

        it("Should mint 1M tokens to developer wallet", async function () {
            const developerBalance = await v3Game.balanceOf(owner.address);
            expect(developerBalance).to.equal(ethers.parseEther("1000000")); // 1 million tokens
        });

        it("Should not deploy with zero developer wallet", async function () {
            const RedLightGreenLightGameV3 = await ethers.getContractFactory("RedLightGreenLightGameV3");
            
            await expect(
                RedLightGreenLightGameV3.deploy(
                    wldToken.address,
                    rlglTokenV1.address,
                    rlglTokenV2.address,
                    "0x0000000000000000000000000000000000000000"
                )
            ).to.be.revertedWith("Developer wallet cannot be zero address");
        });
    });

    describe("Game Mechanics", function () {
        it("Should start with 3 free turns", async function () {
            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(3);
        });

        it("Should not allow unverified users to start game", async function () {
            // Create a new unverified player
            const [unverifiedPlayer] = await ethers.getSigners();
            
            await expect(
                v3Game.connect(unverifiedPlayer).startGame()
            ).to.be.revertedWith("Document verification or higher required");
        });

        it("Should consume turns when starting game", async function () {
            await v3Game.connect(player1).startGame();
            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(2);
        });

        it("Should not allow starting game without turns", async function () {
            // Use all 3 turns
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();

            await expect(
                v3Game.connect(player1).startGame()
            ).to.be.revertedWith("No turns available");
        });

        it("Should reset turns after 24 hours", async function () {
            // Use all turns
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();

            // Fast forward 24 hours
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(3);
        });
    });

    describe("Score Submission", function () {
        beforeEach(async function () {
            await v3Game.connect(player1).startGame();
        });

        it("Should submit score and mint tokens", async function () {
            const initialBalance = await v3Game.balanceOf(player1.address);
            
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );

            const finalBalance = await v3Game.balanceOf(player1.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should apply verification multipliers", async function () {
            // Set player as Orb+ verified
            await v3Game.connect(authorizedSubmitter).setUserVerification(
                player1.address,
                VERIFICATION_LEVELS.OrbPlus,
                true
            );

            const initialBalance = await v3Game.balanceOf(player1.address);
            
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );

            const finalBalance = await v3Game.balanceOf(player1.address);
            const tokensEarned = finalBalance - initialBalance;
            
            // Should be 140% of base reward (100 * 0.1 * 1.4 = 14 tokens)
            expect(tokensEarned).to.equal(ethers.parseEther("14"));
        });

        it("Should update leaderboard", async function () {
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );

            const topScores = await v3Game.getTopScores(GAME_MODES.Classic, 10);
            expect(topScores.length).to.equal(1);
            expect(topScores[0].player).to.equal(player1.address);
            expect(topScores[0].score).to.equal(100);
        });

        it("Should not allow unauthorized score submission", async function () {
            await expect(
                v3Game.connect(player1).submitScore(
                    player1.address,
                    100,
                    1,
                    GAME_MODES.Classic
                )
            ).to.be.revertedWith("Not authorized to submit scores");
        });
    });

    describe("Verification System", function () {
        it("Should set user verification correctly", async function () {
            await v3Game.connect(authorizedSubmitter).setUserVerification(
                player1.address,
                VERIFICATION_LEVELS.OrbPlus,
                true
            );

            const status = await v3Game.getUserVerificationStatus(player1.address);
            expect(status.verificationLevel).to.equal(VERIFICATION_LEVELS.OrbPlus);
            expect(status.isVerified).to.be.true;
            expect(status.multiplier).to.equal(140);
        });

        it("Should apply correct multipliers for each verification level", async function () {
            const levels = [
                { level: VERIFICATION_LEVELS.OrbPlus, expected: 140 },
                { level: VERIFICATION_LEVELS.Orb, expected: 125 },
                { level: VERIFICATION_LEVELS.SecureDocument, expected: 115 },
                { level: VERIFICATION_LEVELS.Document, expected: 100 }
            ];

            for (const { level, expected } of levels) {
                await v3Game.connect(authorizedSubmitter).setUserVerification(
                    player1.address,
                    level,
                    true
                );

                const status = await v3Game.getUserVerificationStatus(player1.address);
                expect(status.multiplier).to.equal(expected);
            }
        });

        it("Should check verification levels correctly", async function () {
            await v3Game.connect(authorizedSubmitter).setUserVerification(
                player1.address,
                VERIFICATION_LEVELS.OrbPlus,
                true
            );

            expect(await v3Game.isUserOrbPlusVerified(player1.address)).to.be.true;
            expect(await v3Game.isUserOrbVerified(player1.address)).to.be.false;
            expect(await v3Game.isUserSecureDocumentVerified(player1.address)).to.be.false;
            expect(await v3Game.isUserDocumentVerified(player1.address)).to.be.false;
            expect(await v3Game.isUserDeviceVerified(player1.address)).to.be.false;
        });
    });

    describe("Token Migration", function () {
        beforeEach(async function () {
            // Approve V3 contract to spend V1 and V2 tokens
            await rlglTokenV1.connect(player1).approve(v3Game.address, ethers.parseEther("1000"));
            await rlglTokenV2.connect(player1).approve(v3Game.address, ethers.parseEther("500"));
        });

        it("Should migrate tokens from V1 and V2", async function () {
            const initialV3Balance = await v3Game.balanceOf(player1.address);
            
            await v3Game.connect(player1).migrateTokens();
            
            const finalV3Balance = await v3Game.balanceOf(player1.address);
            const migrated = finalV3Balance - initialV3Balance;
            
            expect(migrated).to.equal(ethers.parseEther("1500")); // 1000 + 500
        });

        it("Should not allow double migration", async function () {
            await v3Game.connect(player1).migrateTokens();
            
            await expect(
                v3Game.connect(player1).migrateTokens()
            ).to.be.revertedWith("Already migrated");
        });

        it("Should not allow migration with no tokens", async function () {
            await expect(
                v3Game.connect(player2).migrateTokens()
            ).to.be.revertedWith("No tokens to migrate");
        });
    });

    describe("Daily Claims", function () {
        it("Should claim daily reward", async function () {
            const initialBalance = await v3Game.balanceOf(player1.address);
            
            await v3Game.connect(player1).claimDailyReward();
            
            const finalBalance = await v3Game.balanceOf(player1.address);
            const claimed = finalBalance - initialBalance;
            
            expect(claimed).to.equal(ethers.parseEther("100")); // Base daily amount
        });

        it("Should apply streak bonus", async function () {
            // Claim first day
            await v3Game.connect(player1).claimDailyReward();
            
            // Fast forward 24 hours
            await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            // Claim second day (should get streak bonus)
            const initialBalance = await v3Game.balanceOf(player1.address);
            await v3Game.connect(player1).claimDailyReward();
            const finalBalance = await v3Game.balanceOf(player1.address);
            const claimed = finalBalance - initialBalance;
            
            // 100 base + 10 streak bonus = 110
            expect(claimed).to.equal(ethers.parseEther("110"));
        });

        it("Should not allow claiming before cooldown", async function () {
            await v3Game.connect(player1).claimDailyReward();
            
            await expect(
                v3Game.connect(player1).claimDailyReward()
            ).to.be.revertedWith("Daily claim cooldown not met");
        });

        it("Should get correct daily claim status", async function () {
            const status = await v3Game.getDailyClaimStatus(player1.address);
            expect(status.canClaim).to.be.true;
            expect(status.currentStreak).to.equal(0);
            expect(status.nextReward).to.equal(ethers.parseEther("100"));
        });
    });

    describe("Purchases", function () {
        beforeEach(async function () {
            // Use all free turns
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
        });

        it("Should purchase additional turns", async function () {
            await wldToken.connect(player1).approve(v3Game.address, ethers.parseEther("1"));
            
            await v3Game.connect(player1).purchaseAdditionalTurns();
            
            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(3);
        });

        it("Should purchase weekly pass", async function () {
            await wldToken.connect(player1).approve(v3Game.address, ethers.parseEther("10"));
            
            await v3Game.connect(player1).purchaseWeeklyPass();
            
            const hasPass = await v3Game.hasActiveWeeklyPass(player1.address);
            expect(hasPass).to.be.true;
            
            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(ethers.MaxUint256); // Unlimited turns
        });
    });

    describe("LocalStorage Compatibility", function () {
        it("Should set and get extra goes", async function () {
            await v3Game.connect(player1).setExtraGoes(5);
            
            const data = await v3Game.getLocalStorageData(player1.address);
            expect(data.extraGoes).to.equal(5);
        });

        it("Should set and get passes", async function () {
            await v3Game.connect(player1).setPasses(3);
            
            const data = await v3Game.getLocalStorageData(player1.address);
            expect(data.passes).to.equal(3);
        });

        it("Should use extra goes when free turns are exhausted", async function () {
            await v3Game.connect(player1).setExtraGoes(2);
            
            // Use all 3 free turns
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).startGame();
            
            // Should still have 2 extra goes available
            const turns = await v3Game.getAvailableTurns(player1.address);
            expect(turns).to.equal(2);
            
            // Use one extra go
            await v3Game.connect(player1).startGame();
            const remainingTurns = await v3Game.getAvailableTurns(player1.address);
            expect(remainingTurns).to.equal(1);
        });
    });

    describe("Leaderboard", function () {
        beforeEach(async function () {
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player2).startGame();
            await v3Game.connect(player3).startGame();
        });

        it("Should maintain top 100 scores", async function () {
            // Submit scores for multiple players
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
            await v3Game.connect(authorizedSubmitter).submitScore(
                player2.address,
                200,
                1,
                GAME_MODES.Classic
            );
            await v3Game.connect(authorizedSubmitter).submitScore(
                player3.address,
                150,
                1,
                GAME_MODES.Classic
            );

            const topScores = await v3Game.getTopScores(GAME_MODES.Classic, 10);
            expect(topScores.length).to.equal(3);
            
            // Should be sorted by score (highest first)
            expect(topScores[0].player).to.equal(player2.address);
            expect(topScores[0].score).to.equal(200);
            expect(topScores[1].player).to.equal(player3.address);
            expect(topScores[1].score).to.equal(150);
            expect(topScores[2].player).to.equal(player1.address);
            expect(topScores[2].score).to.equal(100);
        });

        it("Should get player rank", async function () {
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
            await v3Game.connect(authorizedSubmitter).submitScore(
                player2.address,
                200,
                1,
                GAME_MODES.Classic
            );

            const rank1 = await v3Game.getPlayerRank(player1.address, GAME_MODES.Classic);
            const rank2 = await v3Game.getPlayerRank(player2.address, GAME_MODES.Classic);
            
            expect(rank1).to.equal(2); // Second place
            expect(rank2).to.equal(1); // First place
        });

        it("Should handle separate leaderboards for different game modes", async function () {
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                200,
                1,
                GAME_MODES.Arcade
            );

            const classicScores = await v3Game.getTopScores(GAME_MODES.Classic, 10);
            const arcadeScores = await v3Game.getTopScores(GAME_MODES.Arcade, 10);
            
            expect(classicScores.length).to.equal(1);
            expect(classicScores[0].score).to.equal(100);
            expect(arcadeScores.length).to.equal(1);
            expect(arcadeScores[0].score).to.equal(200);
        });
    });

    describe("Admin Functions", function () {
        it("Should update pricing", async function () {
            await v3Game.updatePricing(
                ethers.parseEther("0.2"), // tokens per point
                ethers.parseEther("1"),   // turn cost
                ethers.parseEther("10")   // pass cost
            );

            const pricing = await v3Game.getCurrentPricing();
            expect(pricing.currentTokensPerPoint).to.equal(ethers.parseEther("0.2"));
            expect(pricing.turnCost).to.equal(ethers.parseEther("1"));
            expect(pricing.passCost).to.equal(ethers.parseEther("10"));
        });

        it("Should update verification multipliers", async function () {
            await v3Game.updateVerificationMultipliers(
                180, // Orb+
                160, // Orb
                140, // Secure Document
                120  // Document
            );

            const multipliers = await v3Game.getVerificationMultipliers();
            expect(multipliers.currentOrbPlusMultiplier).to.equal(180);
            expect(multipliers.currentOrbMultiplier).to.equal(160);
            expect(multipliers.currentSecureDocumentMultiplier).to.equal(140);
            expect(multipliers.currentDocumentMultiplier).to.equal(120);
        });

        it("Should enforce multiplier hierarchy", async function () {
            await expect(
                v3Game.updateVerificationMultipliers(
                    100, // Orb+ (lower than Orb)
                    160, // Orb
                    140, // Secure Document
                    120  // Document
                )
            ).to.be.revertedWith("Orb+ multiplier must be >= Orb multiplier");
        });

        it("Should set authorized submitters", async function () {
            await v3Game.setAuthorizedSubmitter(player1.address, true);
            
            // Should now be able to submit scores
            await v3Game.connect(player1).startGame();
            await v3Game.connect(player1).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
        });

        it("Should pause and unpause contract", async function () {
            await v3Game.setPaused(true);
            expect(await v3Game.paused()).to.be.true;

            await v3Game.setPaused(false);
            expect(await v3Game.paused()).to.be.false;
        });

        it("Should not allow non-owner to call admin functions", async function () {
            await expect(
                v3Game.connect(player1).updatePricing(
                    ethers.parseEther("0.2"),
                    ethers.parseEther("1"),
                    ethers.parseEther("10")
                )
            ).to.be.revertedWithCustomError(v3Game, "OwnableUnauthorizedAccount");
        });
    });

    describe("Player Statistics", function () {
        beforeEach(async function () {
            await v3Game.connect(player1).startGame();
            await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
        });

        it("Should return correct player stats", async function () {
            const stats = await v3Game.getPlayerStats(player1.address);
            
            expect(stats.freeTurnsUsed).to.equal(1);
            expect(stats.playerTotalGamesPlayed).to.equal(1);
            expect(stats.highScore).to.equal(100);
            expect(stats.totalPointsEarned).to.equal(100);
            expect(stats.verificationLevel).to.equal(VERIFICATION_LEVELS.Document);
            expect(stats.isVerified).to.be.true;
            expect(stats.verificationMultiplier).to.equal(100);
        });

        it("Should track game history", async function () {
            const history = await v3Game.getPlayerGameHistory(player1.address);
            expect(history.length).to.equal(1);
        });
    });

    describe("Contract Statistics", function () {
        it("Should return correct contract stats", async function () {
            const stats = await v3Game.getContractStats();
            
            expect(stats.currentTotalSupply).to.equal(ethers.parseEther("1000000")); // 1M initial allocation
            expect(stats.maxSupply).to.equal(ethers.parseEther("1000000000")); // 1 billion
            expect(stats.totalGames).to.equal(0);
            expect(stats.totalPlayers).to.equal(0);
            expect(stats.isPaused).to.be.false;
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle maximum supply limit", async function () {
            // This would require a very large score to test, but the logic is there
            await v3Game.connect(player1).startGame();
            
            // Try to submit a score that would exceed max supply
            const maxScore = ethers.parseEther("1000000000") / ethers.parseEther("0.1") + 1n;
            
            await expect(
                v3Game.connect(authorizedSubmitter).submitScore(
                    player1.address,
                    maxScore,
                    1,
                    GAME_MODES.Classic
                )
            ).to.be.revertedWith("Would exceed max supply");
        });

        it("Should handle invalid game mode", async function () {
            await v3Game.connect(player1).startGame();
            
            await expect(
                v3Game.connect(authorizedSubmitter).submitScore(
                    player1.address,
                    100,
                    1,
                    2 // Invalid game mode
                )
            ).to.be.revertedWith("Invalid game mode");
        });

        it("Should handle invalid verification level", async function () {
            await expect(
                v3Game.connect(authorizedSubmitter).setUserVerification(
                    player1.address,
                    6, // Invalid verification level
                    true
                )
            ).to.be.revertedWith("Invalid verification level");
        });

        it("Should handle zero score submission", async function () {
            await v3Game.connect(player1).startGame();
            
            await expect(
                v3Game.connect(authorizedSubmitter).submitScore(
                    player1.address,
                    0,
                    1,
                    GAME_MODES.Classic
                )
            ).to.be.revertedWith("Score must be greater than 0");
        });
    });

    describe("Gas Optimization", function () {
        it("Should efficiently handle multiple operations", async function () {
            // Test gas usage for common operations
            const tx1 = await v3Game.connect(player1).startGame();
            const tx2 = await v3Game.connect(authorizedSubmitter).submitScore(
                player1.address,
                100,
                1,
                GAME_MODES.Classic
            );
            
            // Gas usage should be reasonable
            expect(tx1.gasLimit).to.be.lt(200000);
            expect(tx2.gasLimit).to.be.lt(300000);
        });
    });
});
