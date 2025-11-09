const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("LeaderboardManager", function () {
    // Game modes enum
    const GameMode = {
        Classic: 0,
        Arcade: 1
    };

    async function deployLeaderboardManagerFixture() {
        const [owner, player1, player2, player3, gameContract, unauthorizedUser] = await ethers.getSigners();

        const LeaderboardManager = await ethers.getContractFactory("LeaderboardManager");
        const leaderboardManager = await upgrades.deployProxy(
            LeaderboardManager,
            [owner.address],
            { initializer: "initialize" }
        );

        // Authorize the game contract to submit scores
        await leaderboardManager.setAuthorizedSubmitter(gameContract.address, true);

        return {
            leaderboardManager,
            owner,
            player1,
            player2,
            player3,
            gameContract,
            unauthorizedUser
        };
    }

    describe("Deployment and Initialization", function () {
        it("Should deploy and initialize correctly", async function () {
            const { leaderboardManager, owner } = await loadFixture(deployLeaderboardManagerFixture);

            expect(await leaderboardManager.owner()).to.equal(owner.address);
            expect(await leaderboardManager.globalGameCounter()).to.equal(1);
            expect(await leaderboardManager.version()).to.equal("1.0.0");
        });

        it("Should set authorized submitter correctly", async function () {
            const { leaderboardManager, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            expect(await leaderboardManager.authorizedSubmitters(gameContract.address)).to.be.true;
        });
    });

    describe("Score Submission", function () {
        it("Should submit score successfully from authorized submitter", async function () {
            const { leaderboardManager, player1, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            await expect(
                leaderboardManager.connect(gameContract).submitScore(
                    player1.address,
                    GameMode.Classic,
                    1000,
                    5,
                    50
                )
            ).to.emit(leaderboardManager, "ScoreSubmitted")
                .withArgs(player1.address, GameMode.Classic, 1000, 5, 50, 1, true);

            // Check player stats
            const stats = await leaderboardManager.getPlayerModeStats(player1.address, GameMode.Classic);
            expect(stats.highScore).to.equal(1000);
            expect(stats.totalGames).to.equal(1);
            expect(stats.totalScore).to.equal(1000);
            expect(stats.averageScore).to.equal(1000);
            expect(stats.bestRound).to.equal(5);
        });

        it("Should reject score submission from unauthorized submitter", async function () {
            const { leaderboardManager, player1, unauthorizedUser } = await loadFixture(deployLeaderboardManagerFixture);

            await expect(
                leaderboardManager.connect(unauthorizedUser).submitScore(
                    player1.address,
                    GameMode.Classic,
                    1000,
                    5,
                    50
                )
            ).to.be.revertedWith("Not authorized to submit scores");
        });

        it("Should reject invalid parameters", async function () {
            const { leaderboardManager, player1, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Invalid player address
            await expect(
                leaderboardManager.connect(gameContract).submitScore(
                    ethers.constants.AddressZero,
                    GameMode.Classic,
                    1000,
                    5,
                    50
                )
            ).to.be.revertedWith("Invalid player address");

            // Invalid score
            await expect(
                leaderboardManager.connect(gameContract).submitScore(
                    player1.address,
                    GameMode.Classic,
                    0,
                    5,
                    50
                )
            ).to.be.revertedWith("Score must be greater than 0");

            // Invalid round
            await expect(
                leaderboardManager.connect(gameContract).submitScore(
                    player1.address,
                    GameMode.Classic,
                    1000,
                    0,
                    50
                )
            ).to.be.revertedWith("Round must be greater than 0");

            // Invalid game mode
            await expect(
                leaderboardManager.connect(gameContract).submitScore(
                    player1.address,
                    2, // Invalid game mode
                    1000,
                    5,
                    50
                )
            ).to.be.revertedWith("Invalid game mode");
        });

        it("Should update player stats correctly with multiple games", async function () {
            const { leaderboardManager, player1, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // First game
            await leaderboardManager.connect(gameContract).submitScore(
                player1.address,
                GameMode.Classic,
                1000,
                5,
                50
            );

            // Second game with higher score
            await leaderboardManager.connect(gameContract).submitScore(
                player1.address,
                GameMode.Classic,
                1500,
                7,
                75
            );

            // Third game with lower score
            await leaderboardManager.connect(gameContract).submitScore(
                player1.address,
                GameMode.Classic,
                800,
                4,
                40
            );

            const stats = await leaderboardManager.getPlayerModeStats(player1.address, GameMode.Classic);
            expect(stats.highScore).to.equal(1500); // Highest score
            expect(stats.totalGames).to.equal(3);
            expect(stats.totalScore).to.equal(3300); // 1000 + 1500 + 800
            expect(stats.averageScore).to.equal(1100); // 3300 / 3
            expect(stats.bestRound).to.equal(7); // Highest round
        });

        it("Should track separate stats for different game modes", async function () {
            const { leaderboardManager, player1, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Classic mode game
            await leaderboardManager.connect(gameContract).submitScore(
                player1.address,
                GameMode.Classic,
                1000,
                5,
                50
            );

            // Arcade mode game
            await leaderboardManager.connect(gameContract).submitScore(
                player1.address,
                GameMode.Arcade,
                2000,
                10,
                100
            );

            const classicStats = await leaderboardManager.getPlayerModeStats(player1.address, GameMode.Classic);
            const arcadeStats = await leaderboardManager.getPlayerModeStats(player1.address, GameMode.Arcade);

            expect(classicStats.highScore).to.equal(1000);
            expect(classicStats.totalGames).to.equal(1);
            expect(arcadeStats.highScore).to.equal(2000);
            expect(arcadeStats.totalGames).to.equal(1);
        });
    });

    describe("Leaderboard Management", function () {
        it("Should maintain leaderboard in correct order", async function () {
            const { leaderboardManager, player1, player2, player3, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Submit scores in random order
            await leaderboardManager.connect(gameContract).submitScore(player2.address, GameMode.Classic, 1500, 7, 75);
            await leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Classic, 2000, 10, 100);
            await leaderboardManager.connect(gameContract).submitScore(player3.address, GameMode.Classic, 1000, 5, 50);

            const topScores = await leaderboardManager.getTopScores(GameMode.Classic, 3);

            expect(topScores[0].player).to.equal(player1.address);
            expect(topScores[0].score).to.equal(2000);
            expect(topScores[1].player).to.equal(player2.address);
            expect(topScores[1].score).to.equal(1500);
            expect(topScores[2].player).to.equal(player3.address);
            expect(topScores[2].score).to.equal(1000);
        });

        it("Should update player position when they achieve new high score", async function () {
            const { leaderboardManager, player1, player2, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Initial scores
            await leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Classic, 1000, 5, 50);
            await leaderboardManager.connect(gameContract).submitScore(player2.address, GameMode.Classic, 1500, 7, 75);

            let topScores = await leaderboardManager.getTopScores(GameMode.Classic, 2);
            expect(topScores[0].player).to.equal(player2.address);
            expect(topScores[1].player).to.equal(player1.address);

            // Player1 achieves new high score
            await expect(
                leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Classic, 2000, 10, 100)
            ).to.emit(leaderboardManager, "LeaderboardUpdated")
                .withArgs(GameMode.Classic, player1.address, 1, 2000);

            topScores = await leaderboardManager.getTopScores(GameMode.Classic, 2);
            expect(topScores[0].player).to.equal(player1.address);
            expect(topScores[0].score).to.equal(2000);
            expect(topScores[1].player).to.equal(player2.address);
        });

        it("Should limit leaderboard size to MAX_LEADERBOARD_SIZE", async function () {
            const { leaderboardManager, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Create many players and submit scores
            const players = [];
            for (let i = 0; i < 105; i++) {
                const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
                players.push(wallet);
                
                await leaderboardManager.connect(gameContract).submitScore(
                    wallet.address,
                    GameMode.Classic,
                    1000 + i, // Increasing scores
                    5,
                    50
                );
            }

            const topScores = await leaderboardManager.getTopScores(GameMode.Classic, 50);
            expect(topScores.length).to.equal(50);

            // Check that we can't get more than the max leaderboard size
            const stats = await leaderboardManager.getLeaderboardStats(GameMode.Classic);
            expect(stats.leaderboardSize).to.be.at.most(100); // MAX_LEADERBOARD_SIZE
        });
    });

    describe("Query Functions", function () {
        beforeEach(async function () {
            const { leaderboardManager, player1, player2, player3, gameContract } = await loadFixture(deployLeaderboardManagerFixture);
            
            // Setup test data
            await leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Classic, 2000, 10, 100);
            await leaderboardManager.connect(gameContract).submitScore(player2.address, GameMode.Classic, 1500, 7, 75);
            await leaderboardManager.connect(gameContract).submitScore(player3.address, GameMode.Classic, 1000, 5, 50);
            await leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Arcade, 3000, 15, 150);
            
            this.leaderboardManager = leaderboardManager;
            this.player1 = player1;
            this.player2 = player2;
            this.player3 = player3;
        });

        it("Should return correct top scores", async function () {
            const topScores = await this.leaderboardManager.getTopScores(GameMode.Classic, 2);
            
            expect(topScores.length).to.equal(2);
            expect(topScores[0].score).to.equal(2000);
            expect(topScores[1].score).to.equal(1500);
        });

        it("Should return paginated leaderboard correctly", async function () {
            const page1 = await this.leaderboardManager.getLeaderboardPaginated(GameMode.Classic, 0, 2);
            const page2 = await this.leaderboardManager.getLeaderboardPaginated(GameMode.Classic, 2, 2);
            
            expect(page1.length).to.equal(2);
            expect(page1[0].score).to.equal(2000);
            expect(page1[1].score).to.equal(1500);
            
            expect(page2.length).to.equal(1);
            expect(page2[0].score).to.equal(1000);
        });

        it("Should return combined leaderboard", async function () {
            const [classicEntries, arcadeEntries] = await this.leaderboardManager.getCombinedLeaderboard(5);
            
            expect(classicEntries.length).to.equal(3);
            expect(arcadeEntries.length).to.equal(1);
            expect(classicEntries[0].score).to.equal(2000);
            expect(arcadeEntries[0].score).to.equal(3000);
        });

        it("Should return complete player stats", async function () {
            const stats = await this.leaderboardManager.getPlayerStats(this.player1.address);
            
            expect(stats.classicStats.highScore).to.equal(2000);
            expect(stats.classicStats.totalGames).to.equal(1);
            expect(stats.arcadeStats.highScore).to.equal(3000);
            expect(stats.arcadeStats.totalGames).to.equal(1);
        });

        it("Should return batch player stats", async function () {
            const players = [this.player1.address, this.player2.address, this.player3.address];
            const batchStats = await this.leaderboardManager.getBatchPlayerStats(players, GameMode.Classic);
            
            expect(batchStats.length).to.equal(3);
            expect(batchStats[0].highScore).to.equal(2000);
            expect(batchStats[1].highScore).to.equal(1500);
            expect(batchStats[2].highScore).to.equal(1000);
        });

        it("Should return leaderboard statistics", async function () {
            const stats = await this.leaderboardManager.getLeaderboardStats(GameMode.Classic);
            
            expect(stats.totalGames).to.equal(3);
            expect(stats.totalPlayers).to.equal(3);
            expect(stats.leaderboardSize).to.equal(3);
            expect(stats.highestScore).to.equal(2000);
            expect(stats.topPlayer).to.equal(this.player1.address);
        });

        it("Should return correct player rank", async function () {
            const rank1 = await this.leaderboardManager.getPlayerRank(this.player1.address, GameMode.Classic);
            const rank2 = await this.leaderboardManager.getPlayerRank(this.player2.address, GameMode.Classic);
            const rank3 = await this.leaderboardManager.getPlayerRank(this.player3.address, GameMode.Classic);
            
            expect(rank1).to.equal(1);
            expect(rank2).to.equal(2);
            expect(rank3).to.equal(3);
        });

        it("Should enforce query limits for gas efficiency", async function () {
            await expect(
                this.leaderboardManager.getTopScores(GameMode.Classic, 51)
            ).to.be.revertedWith("Cannot return more than 50 entries at once");

            await expect(
                this.leaderboardManager.getLeaderboardPaginated(GameMode.Classic, 0, 51)
            ).to.be.revertedWith("Limit too high for gas efficiency");

            await expect(
                this.leaderboardManager.getCombinedLeaderboard(26)
            ).to.be.revertedWith("Cannot return more than 25 entries per mode");
        });
    });

    describe("Seeding and Admin Functions", function () {
        it("Should seed leaderboard correctly", async function () {
            const { leaderboardManager, owner, player1, player2 } = await loadFixture(deployLeaderboardManagerFixture);

            const seedEntries = [
                {
                    player: player1.address,
                    score: 2000,
                    timestamp: Math.floor(Date.now() / 1000),
                    round: 10,
                    tokensEarned: 100,
                    gameId: 1,
                    gameMode: GameMode.Classic
                },
                {
                    player: player2.address,
                    score: 1500,
                    timestamp: Math.floor(Date.now() / 1000),
                    round: 7,
                    tokensEarned: 75,
                    gameId: 2,
                    gameMode: GameMode.Classic
                }
            ];

            await expect(
                leaderboardManager.connect(owner).seedLeaderboard(GameMode.Classic, seedEntries)
            ).to.emit(leaderboardManager, "LeaderboardSeeded")
                .withArgs(GameMode.Classic, 2);

            const topScores = await leaderboardManager.getTopScores(GameMode.Classic, 2);
            expect(topScores[0].score).to.equal(2000);
            expect(topScores[1].score).to.equal(1500);
        });

        it("Should reject seeding from non-owner", async function () {
            const { leaderboardManager, player1, unauthorizedUser } = await loadFixture(deployLeaderboardManagerFixture);

            const seedEntries = [{
                player: player1.address,
                score: 1000,
                timestamp: Math.floor(Date.now() / 1000),
                round: 5,
                tokensEarned: 50,
                gameId: 1,
                gameMode: GameMode.Classic
            }];

            await expect(
                leaderboardManager.connect(unauthorizedUser).seedLeaderboard(GameMode.Classic, seedEntries)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should clear leaderboard", async function () {
            const { leaderboardManager, owner, player1, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Add some scores
            await leaderboardManager.connect(gameContract).submitScore(player1.address, GameMode.Classic, 1000, 5, 50);

            let stats = await leaderboardManager.getLeaderboardStats(GameMode.Classic);
            expect(stats.totalGames).to.equal(1);

            // Clear leaderboard
            await leaderboardManager.connect(owner).clearLeaderboard(GameMode.Classic);

            stats = await leaderboardManager.getLeaderboardStats(GameMode.Classic);
            expect(stats.totalGames).to.equal(0);
            expect(stats.totalPlayers).to.equal(0);
            expect(stats.leaderboardSize).to.equal(0);
        });

        it("Should manage authorized submitters", async function () {
            const { leaderboardManager, owner, unauthorizedUser } = await loadFixture(deployLeaderboardManagerFixture);

            // Initially not authorized
            expect(await leaderboardManager.authorizedSubmitters(unauthorizedUser.address)).to.be.false;

            // Authorize
            await expect(
                leaderboardManager.connect(owner).setAuthorizedSubmitter(unauthorizedUser.address, true)
            ).to.emit(leaderboardManager, "AuthorizedSubmitterUpdated")
                .withArgs(unauthorizedUser.address, true);

            expect(await leaderboardManager.authorizedSubmitters(unauthorizedUser.address)).to.be.true;

            // Deauthorize
            await leaderboardManager.connect(owner).setAuthorizedSubmitter(unauthorizedUser.address, false);
            expect(await leaderboardManager.authorizedSubmitters(unauthorizedUser.address)).to.be.false;
        });
    });

    describe("Upgradeability", function () {
        it("Should be upgradeable by owner", async function () {
            const { leaderboardManager, owner } = await loadFixture(deployLeaderboardManagerFixture);

            // Deploy new implementation
            const LeaderboardManagerV2 = await ethers.getContractFactory("LeaderboardManager");
            
            // This should not revert
            await expect(
                upgrades.upgradeProxy(leaderboardManager.address, LeaderboardManagerV2, { call: { fn: "version", args: [] } })
            ).to.not.be.reverted;
        });

        it("Should reject upgrade from non-owner", async function () {
            const { leaderboardManager, unauthorizedUser } = await loadFixture(deployLeaderboardManagerFixture);

            const LeaderboardManagerV2 = await ethers.getContractFactory("LeaderboardManager");
            const newImplementation = await LeaderboardManagerV2.deploy();

            await expect(
                leaderboardManager.connect(unauthorizedUser).upgradeTo(newImplementation.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Gas Optimization Tests", function () {
        it("Should handle batch operations efficiently", async function () {
            const { leaderboardManager, gameContract } = await loadFixture(deployLeaderboardManagerFixture);

            // Create multiple players
            const players = [];
            for (let i = 0; i < 20; i++) {
                const wallet = ethers.Wallet.createRandom();
                players.push(wallet.address);
                
                await leaderboardManager.connect(gameContract).submitScore(
                    wallet.address,
                    GameMode.Classic,
                    1000 + i,
                    5,
                    50
                );
            }

            // Test batch query
            const batchStats = await leaderboardManager.getBatchPlayerStats(players, GameMode.Classic);
            expect(batchStats.length).to.equal(20);

            // Test pagination
            const page1 = await leaderboardManager.getLeaderboardPaginated(GameMode.Classic, 0, 10);
            const page2 = await leaderboardManager.getLeaderboardPaginated(GameMode.Classic, 10, 10);
            
            expect(page1.length).to.equal(10);
            expect(page2.length).to.equal(10);
        });

        it("Should enforce batch size limits", async function () {
            const { leaderboardManager } = await loadFixture(deployLeaderboardManagerFixture);

            const tooManyPlayers = new Array(21).fill(ethers.constants.AddressZero);
            
            await expect(
                leaderboardManager.getBatchPlayerStats(tooManyPlayers, GameMode.Classic)
            ).to.be.revertedWith("Too many players for batch operation");
        });
    });
});