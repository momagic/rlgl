const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Script to fetch all V1 RLGL token holders and their balances
 * This will be used for migrating balances to V2
 */
async function fetchV1Balances() {
    console.log('🔍 Fetching V1 RLGL token holders and balances...');
    
    const network = hre.network.name;
    console.log(`Network: ${network}`);
    
    // V1 contract address (from v1-leaderboard-data.json)
    const V1_CONTRACT_ADDRESS = '0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1';
    
    try {
        // Get the V1 contract instance
        const V1Contract = await ethers.getContractAt('RedLightGreenLightGame', V1_CONTRACT_ADDRESS);
        
        console.log('📊 Getting V1 contract info...');
        const totalSupply = await V1Contract.totalSupply();
        console.log(`Total V1 RLGL Supply: ${ethers.formatEther(totalSupply)} RLGL`);
        
        // Get all Transfer events to find token holders (in batches to avoid RPC limits)
        console.log('🔎 Scanning for Transfer events...');
        const transferFilter = V1Contract.filters.Transfer();
        
        // Get current block number
        const currentBlock = await ethers.provider.getBlockNumber();
        console.log(`Current block: ${currentBlock}`);
        
        // Fetch events in chunks to avoid RPC limits
        const BLOCK_CHUNK_SIZE = 10000; // 10K block range limit
        const START_BLOCK = 16493056; // V1 contract deployment block
        const allTransferEvents = [];
        
        console.log(`Starting scan from deployment block: ${START_BLOCK}`);
        
        for (let fromBlock = START_BLOCK; fromBlock < currentBlock; fromBlock += BLOCK_CHUNK_SIZE) {
            const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE - 1, currentBlock);
            console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);
            
            try {
                const events = await V1Contract.queryFilter(transferFilter, fromBlock, toBlock);
                allTransferEvents.push(...events);
                console.log(`Found ${events.length} events in this chunk`);
            } catch (error) {
                console.log(`⚠️  Error fetching events for blocks ${fromBlock}-${toBlock}: ${error.message}`);
                // Continue with next chunk
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Found ${allTransferEvents.length} Transfer events total`);
        
        // Track unique addresses that have received tokens
        const uniqueAddresses = new Set();
        
        // Add all 'to' addresses (recipients)
        allTransferEvents.forEach(event => {
            if (event.args.to !== ethers.ZeroAddress) {
                uniqueAddresses.add(event.args.to);
            }
        });
        
        console.log(`Found ${uniqueAddresses.size} unique addresses`);
        
        // Fetch current balances for all unique addresses
        console.log('💰 Fetching current balances...');
        const balances = [];
        let totalBalance = 0n;
        
        for (const address of uniqueAddresses) {
            try {
                const balance = await V1Contract.balanceOf(address);
                if (balance > 0n) {
                    balances.push({
                        address: address,
                        balance: balance.toString(),
                        balanceFormatted: ethers.formatEther(balance)
                    });
                    totalBalance += balance;
                    console.log(`${address}: ${ethers.formatEther(balance)} RLGL`);
                }
            } catch (error) {
                console.warn(`Failed to get balance for ${address}:`, error.message);
            }
        }
        
        // Sort by balance (highest first)
        balances.sort((a, b) => {
            const balanceA = BigInt(a.balance);
            const balanceB = BigInt(b.balance);
            if (balanceA > balanceB) return -1;
            if (balanceA < balanceB) return 1;
            return 0;
        });
        
        console.log('\n📈 Summary:');
        console.log(`Total holders with balance > 0: ${balances.length}`);
        console.log(`Total balance sum: ${ethers.formatEther(totalBalance)} RLGL`);
        console.log(`Contract total supply: ${ethers.formatEther(totalSupply)} RLGL`);
        
        // Verify totals match
        if (totalBalance === totalSupply) {
            console.log('✅ Balance verification: PASSED');
        } else {
            console.log('❌ Balance verification: FAILED - totals do not match');
            console.log(`Difference: ${ethers.formatEther(totalSupply - totalBalance)} RLGL`);
        }
        
        // Save to file
        const migrationData = {
            network: network,
            v1ContractAddress: V1_CONTRACT_ADDRESS,
            totalSupply: totalSupply.toString(),
            totalSupplyFormatted: ethers.formatEther(totalSupply),
            totalHolders: balances.length,
            totalBalanceSum: totalBalance.toString(),
            totalBalanceSumFormatted: ethers.formatEther(totalBalance),
            balancesMatch: totalBalance === totalSupply,
            timestamp: new Date().toISOString(),
            balances: balances
        };
        
        const outputFile = path.join(__dirname, '..', `v1-balances-${network}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(migrationData, null, 2));
        
        console.log(`\n💾 Migration data saved to: ${outputFile}`);
        console.log('\n🎯 Next steps:');
        console.log('1. Review the balance data');
        console.log('2. Run migration script to mint V2 tokens');
        console.log('3. Verify migration success');
        
        return migrationData;
        
    } catch (error) {
        console.error('❌ Error fetching V1 balances:', error);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    fetchV1Balances()
        .then(() => {
            console.log('✅ V1 balance fetch completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ V1 balance fetch failed:', error);
            process.exit(1);
        });
}

module.exports = { fetchV1Balances };