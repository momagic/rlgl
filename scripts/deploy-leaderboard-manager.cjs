const { ethers, upgrades } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Configuration for different networks
const NETWORK_CONFIG = {
    worldchain: {
        chainId: 480,
        name: "World Chain",
        rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public"
    },
    worldchainSepolia: {
        chainId: 4801,
        name: "World Chain Sepolia",
        rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public"
    },
    localhost: {
        chainId: 31337,
        name: "Localhost",
        rpcUrl: "http://127.0.0.1:8545"
    }
};

async function main() {
    console.log("🚀 Starting LeaderboardManager deployment...");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    const chainId = network.chainId;
    
    console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.warn("⚠️  Warning: Low balance, deployment might fail");
    }
    
    try {
        // Deploy the LeaderboardManager contract as upgradeable proxy
        console.log("\n📦 Deploying LeaderboardManager contract...");
        
        const LeaderboardManager = await ethers.getContractFactory("LeaderboardManager");
        
        console.log("⏳ Deploying proxy contract...");
        const leaderboardManager = await upgrades.deployProxy(
            LeaderboardManager,
            [deployer.address], // Initialize with deployer as owner
            {
                initializer: "initialize",
                kind: "uups"
            }
        );
        
        await leaderboardManager.waitForDeployment();
        
        const contractAddress = await leaderboardManager.getAddress();
        console.log(`✅ LeaderboardManager deployed to: ${contractAddress}`);
        console.log(`🔧 Implementation deployed to: ${await upgrades.erc1967.getImplementationAddress(contractAddress)}`);
        console.log(`🛡️  Admin (ProxyAdmin) deployed to: ${await upgrades.erc1967.getAdminAddress(contractAddress)}`);
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        const owner = await leaderboardManager.owner();
        const version = await leaderboardManager.version();
        const globalGameCounter = await leaderboardManager.globalGameCounter();
        
        console.log(`👑 Owner: ${owner}`);
        console.log(`📋 Version: ${version}`);
        console.log(`🎮 Global Game Counter: ${globalGameCounter}`);
        
        // Save deployment info
        const deploymentInfo = {
            network: {
                name: networkName,
                chainId: chainId.toString(),
                rpcUrl: NETWORK_CONFIG[networkName]?.rpcUrl || "unknown"
            },
            contracts: {
                LeaderboardManager: {
                    proxy: contractAddress,
                    implementation: await upgrades.erc1967.getImplementationAddress(contractAddress),
                    admin: await upgrades.erc1967.getAdminAddress(contractAddress)
                }
            },
            deployer: {
                address: deployer.address,
                balance: ethers.formatEther(balance)
            },
            deployment: {
                timestamp: new Date().toISOString(),
                blockNumber: (await ethers.provider.getBlockNumber()).toString(),
                gasUsed: "TBD" // Will be updated after transaction receipt
            },
            verification: {
                owner: owner,
                version: version,
                globalGameCounter: globalGameCounter.toString()
            }
        };
        
        // Create deployments directory if it doesn't exist
        const deploymentsDir = path.join(__dirname, '..', 'deployments');
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }
        
        // Save deployment info to file
        const deploymentFile = path.join(deploymentsDir, `leaderboard-manager-${networkName}-${chainId}.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
        
        // Generate ABI file for frontend integration
        const abiFile = path.join(deploymentsDir, 'LeaderboardManager.json');
        const artifact = await ethers.getContractFactory("LeaderboardManager");
        const abiData = {
            contractName: "LeaderboardManager",
            abi: artifact.interface.format('json'),
            networks: {
                [chainId]: {
                    address: contractAddress,
                    implementation: await upgrades.erc1967.getImplementationAddress(contractAddress)
                }
            }
        };
        
        fs.writeFileSync(abiFile, JSON.stringify(abiData, null, 2));
        console.log(`📄 ABI saved to: ${abiFile}`);
        
        // Setup initial configuration
        console.log("\n⚙️  Setting up initial configuration...");
        
        // If we have the existing game contract address, authorize it
        const existingGameContractAddress = process.env.EXISTING_GAME_CONTRACT_ADDRESS;
        if (existingGameContractAddress && ethers.isAddress(existingGameContractAddress)) {
            console.log(`🔐 Authorizing existing game contract: ${existingGameContractAddress}`);
            const tx = await leaderboardManager.setAuthorizedSubmitter(existingGameContractAddress, true);
            await tx.wait();
            console.log(`✅ Game contract authorized`);
        } else {
            console.log(`⚠️  No existing game contract address provided. Set EXISTING_GAME_CONTRACT_ADDRESS environment variable to authorize it.`);
        }
        
        // Print summary
        console.log("\n🎉 Deployment Summary:");
        console.log("=".repeat(50));
        console.log(`Network: ${networkName} (${chainId})`);
        console.log(`LeaderboardManager Proxy: ${contractAddress}`);
        console.log(`Implementation: ${await upgrades.erc1967.getImplementationAddress(contractAddress)}`);
        console.log(`Owner: ${owner}`);
        console.log(`Version: ${version}`);
        console.log("=".repeat(50));
        
        // Print next steps
        console.log("\n📋 Next Steps:");
        console.log("1. Verify the contract on block explorer (if on mainnet/testnet)");
        console.log("2. Update frontend configuration with new contract address");
        console.log("3. Authorize the existing game contract to submit scores");
        console.log("4. Test score submission from the game contract");
        console.log("5. Migrate existing leaderboard data (optional)");
        
        if (chainId === 480 || chainId === 4801) {
            console.log("\n🔍 Verification Command:");
            console.log(`npx hardhat verify --network ${networkName} ${await upgrades.erc1967.getImplementationAddress(contractAddress)}`);
        }
        
        return {
            leaderboardManager: contractAddress,
            implementation: await upgrades.erc1967.getImplementationAddress(contractAddress),
            admin: await upgrades.erc1967.getAdminAddress(contractAddress)
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Solution: Add more ETH to the deployer account");
        } else if (error.code === 'NETWORK_ERROR') {
            console.log("💡 Solution: Check network connection and RPC endpoint");
        } else if (error.message.includes('gas')) {
            console.log("💡 Solution: Increase gas limit or gas price");
        }
        
        throw error;
    }
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => {
            console.log("\n✅ Deployment completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = main;