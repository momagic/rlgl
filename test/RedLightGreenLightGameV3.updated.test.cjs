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
    v3Game = await V3.deploy(wldAddr, owner.address)
    await v3Game.setAuthorizedSubmitter(authorizedSubmitter.address, true)
    await v3Game.connect(authorizedSubmitter).setUserVerification(player.address, LEVELS.Document, true)
    await wldToken.mint(player.address, ethers.parseEther("100"))
  })

  it("starts with 100 turns and consumes on start", async function () {
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(100)
    await v3Game.connect(player).startGame()
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(99)
  })

  it("mints 1 token per round with multiplier", async function () {
    const initial = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const final = await v3Game.balanceOf(player.address)
    expect(final - initial).to.equal(ethers.parseEther("1"))

    await v3Game.connect(authorizedSubmitter).setUserVerification(player.address, LEVELS.OrbPlus, true)
    const i2 = await v3Game.balanceOf(player.address)
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const f2 = await v3Game.balanceOf(player.address)
    expect(f2 - i2).to.equal(ethers.parseEther("1.4"))
  })

  it("updates leaderboard per mode", async function () {
    await v3Game.connect(player).submitScore(30, 1, GAME_MODES.Classic)
    const classic = await v3Game.getTopScores(GAME_MODES.Classic, 10)
    expect(classic.length).to.equal(1)
    expect(classic[0].score).to.equal(30)
  })

  it("purchases 3 extra turns on-chain", async function () {
    // Exhaust
    for (let i = 0; i < 100; i++) {
      await v3Game.connect(player).startGame()
    }
    expect(await v3Game.getAvailableTurns(player.address)).to.equal(0)

    const gameAddr = await v3Game.getAddress()
    await wldToken.connect(player).approve(gameAddr, ethers.parseEther("1"))
    await v3Game.connect(player).purchaseAdditionalTurns()
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
})
