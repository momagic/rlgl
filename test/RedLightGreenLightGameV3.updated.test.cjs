const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RedLightGreenLightGameV3 (updated spec)", function () {
  let v3Game, wldToken, owner, player, authorizedSubmitter

  const GAME_MODES = { Classic: 0, Arcade: 1, WhackLight: 2 }
  const LEVELS = { None: 0, Device: 1, Document: 2, SecureDocument: 3, Orb: 4, OrbPlus: 5 }

  beforeEach(async function () {
    [owner, player, authorizedSubmitter] = await ethers.getSigners()
    const MockERC20 = await ethers.getContractFactory("MockERC20")
    wldToken = await MockERC20.deploy("Worldcoin", "WLD")
    const V3 = await ethers.getContractFactory("RedLightGreenLightGameV3")
    const wldAddr = await wldToken.getAddress()
    const { upgrades } = require("hardhat")
    v3Game = await upgrades.deployProxy(V3, [wldAddr, owner.address, owner.address], { initializer: 'initialize' })
    await v3Game.setAuthorizedSubmitter(authorizedSubmitter.address, true)
    await v3Game.connect(authorizedSubmitter).setUserVerification(player.address, LEVELS.Document, true)
    await wldToken.mint(player.address, ethers.parseEther("100"))
  })

  it("starts with 3 daily turns and consumes on start", async function () {
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(3)
    await v3Game.connect(player).startGame()
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(2)
  })

  it("requires active session for direct submission and mints score-based tokens", async function () {
    await expect(v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)).to.be.revertedWith("No active game session")
    await v3Game.connect(player).startGame()
    const initial = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const final = await v3Game.balanceOf(player.address)
    expect(final - initial).to.equal(ethers.parseEther("3"))

    await v3Game.connect(authorizedSubmitter).setUserVerification(player.address, LEVELS.OrbPlus, true)
    await v3Game.connect(player).startGame()
    const i2 = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const f2 = await v3Game.balanceOf(player.address)
    expect(f2 - i2).to.equal(ethers.parseEther("4.2"))
  })

  it("updates leaderboard per mode", async function () {
    await v3Game.connect(player).startGame()
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const classic = await v3Game.getTopScores(GAME_MODES.Classic, 10)
    expect(classic.length).to.equal(1)
    expect(classic[0].score).to.equal(30)
  })

  it("purchases 3 extra turns on-chain", async function () {
    for (let i = 0; i < 3; i++) {
      await v3Game.connect(player).startGame()
    }
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(0)

    const gameAddr = await v3Game.getAddress()
    await wldToken.connect(player).transfer(gameAddr, ethers.parseEther("0.2"))
    await v3Game.connect(player).purchaseAdditionalTurnsDirect()
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(3)
  })

  it("daily claim is 10 base and +1 streak", async function () {
    const i1 = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).claimDailyReward()
    const f1 = await v3Game.balanceOf(player.address)
    expect(f1 - i1).to.equal(ethers.parseEther("10"))

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60])
    await ethers.provider.send("evm_mine")
    const i2 = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).claimDailyReward()
    const f2 = await v3Game.balanceOf(player.address)
    expect(f2 - i2).to.equal(ethers.parseEther("11"))
  })

  it("submits score with EIP-712 permit", async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId
    const domain = { name: 'Red Light Green Light V3', version: '1', chainId, verifyingContract: await v3Game.getAddress() }
    const types = { ScorePermit: [
      { name: 'player', type: 'address' },
      { name: 'score', type: 'uint256' },
      { name: 'round', type: 'uint256' },
      { name: 'gameMode', type: 'uint8' },
      { name: 'sessionId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]}
    const sessionId = ethers.id('sess')
    const value = { player: player.address, score: 30, round: 1, gameMode: GAME_MODES.Classic, sessionId, nonce: 1, deadline: Math.floor(Date.now()/1000) + 900 }
    const signature = await owner.signTypedData(domain, types, value)
    const initial = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).submitScoreWithPermit(value.score, value.round, value.gameMode, value.sessionId, value.nonce, value.deadline, signature)
    const final = await v3Game.balanceOf(player.address)
    expect(final - initial).to.equal(ethers.parseEther("3"))

    await expect(
      v3Game.connect(player).submitScoreWithPermit(value.score, value.round, value.gameMode, value.sessionId, value.nonce, value.deadline, signature)
    ).to.be.revertedWith("Permit already used")
  })

  it("restricts localStorage setters to owner", async function () {
    await expect(v3Game.connect(player).setExtraGoes(5)).to.be.reverted
    await expect(v3Game.connect(player).setPasses(3)).to.be.reverted
    await v3Game.connect(owner).setExtraGoes(5)
    await v3Game.connect(owner).setPasses(3)
    const data = await v3Game.getLocalStorageData(owner.address)
    expect(Number(data.extraGoes)).to.equal(5)
    expect(Number(data.passes)).to.equal(3)
  })
})
