const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Script to migrate V1 RLGL token balances to V2
 * Reads balance data and mints equivalent V2 tokens
 */
async function migrateV1ToV2() {
    console.log('🚀 Starting V1 to V2 token migration...');
    
    const network = hre.network.name;
    console.log(`Network: ${network}`);
    
    // Load balance data
    const balanceFile = path.join(__dirname, '..', `v1-balances-${network}.json`);
    if (!fs.existsSync(balanceFile)) {
        throw new Error(`Balance file not found: ${balanceFile}. Run fetch-v1-balances.cjs first.`);
    }
    
    const migrationData = JSON.parse(fs.readFileSync(balanceFile, 'utf8'));
    console.log(`📊 Loaded migration data for ${migrationData.totalHolders} holders`);
    console.log(`Total V1 supply to migrate: ${migrationData.totalSupplyFormatted} RLGL`);
    
    if (!migrationData.balancesMatch) {
        console.warn('⚠️  WARNING: V1 balance verification failed. Proceeding anyway...');
    }
    
    // Get V2 contract address from deployment
    let v2ContractAddress;
    const deploymentFile = path.join(__dirname, '..', 'deployments', `${network}-v2.json`);
    
    if (fs.existsSync(deploymentFile)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        v2ContractAddress = deployment.contractAddress;
    } else {
        throw new Error(`V2 deployment file not found: ${deploymentFile}`);
    }
    
    console.log(`V2 Contract Address: ${v2ContractAddress}`);
    
    try {
        // Get the V2 contract instance
        const [deployer] = await ethers.getSigners();
        console.log(`Deployer address: ${deployer.address}`);
        
        const V2Contract = await ethers.getContractAt('RedLightGreenLightGameV2', v2ContractAddress);
        
        // Verify deployer is owner
        const owner = await V2Contract.owner();
        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            throw new Error(`Deployer ${deployer.address} is not the contract owner ${owner}`);
        }
        
        console.log('✅ Deployer verified as contract owner');
        
        // Check current V2 total supply
        const currentV2Supply = await V2Contract.totalSupply();
        console.log(`Current V2 total supply: ${ethers.formatEther(currentV2Supply)} RLGL`);
        
        if (currentV2Supply > 0n) {
            console.log('⚠️  V2 contract already has tokens. Migration may create duplicates.');
            console.log('Continue? (This will add to existing supply)');
        }
        
        // Prepare migration batches (using batch mint for efficiency)
        const BATCH_SIZE = 20; // Smaller batches for batchMint to avoid gas limits
        const batches = [];
        
        for (let i = 0; i < migrationData.balances.length; i += BATCH_SIZE) {
            batches.push(migrationData.balances.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`\n📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} addresses each`);
        
        let totalMigrated = 0n;
        let successfulMigrations = 0;
        const migrationResults = [];
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} addresses)`);
            
            try {
                // Prepare batch data
                const addresses = batch.map(holder => holder.address);
                const amounts = batch.map(holder => BigInt(holder.balance));
                
                console.log(`Batch minting for ${batch.length} addresses...`);
                
                // Estimate gas first
                const gasEstimate = await V2Contract.batchMint.estimateGas(addresses, amounts);
                console.log(`Estimated gas: ${gasEstimate.toString()}`);
                
                // Execute batch mint with extra gas
                const tx = await V2Contract.batchMint(addresses, amounts, {
                    gasLimit: gasEstimate + 100000n // Add buffer for batch operation
                });
                
                console.log(`Transaction hash: ${tx.hash}`);
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    // Mark all in batch as successful
                    for (const holder of batch) {
                        const balance = BigInt(holder.balance);
                        totalMigrated += balance;
                        successfulMigrations++;
                        migrationResults.push({
                            address: holder.address,
                            balance: holder.balance,
                            balanceFormatted: holder.balanceFormatted,
                            txHash: tx.hash,
                            status: 'success'
                        });
                        console.log(`✅ Success: ${holder.address} - ${holder.balanceFormatted} RLGL`);
                    }
                } else {
                    throw new Error('Batch transaction failed');
                }
                
            } catch (error) {
                console.error(`❌ Failed to migrate batch ${batchIndex + 1}:`, error.message);
                
                // Mark all in batch as failed
                for (const holder of batch) {
                    migrationResults.push({
                        address: holder.address,
                        balance: holder.balance,
                        balanceFormatted: holder.balanceFormatted,
                        error: error.message,
                        status: 'failed'
                    });
                }
            }
            
            // Small delay between batch transactions
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Final verification
        const finalV2Supply = await V2Contract.totalSupply();
        const expectedSupply = currentV2Supply + totalMigrated;
        
        console.log('\n📊 Migration Summary:');
        console.log(`Successful migrations: ${successfulMigrations}/${migrationData.totalHolders}`);
        console.log(`Total migrated: ${ethers.formatEther(totalMigrated)} RLGL`);
        console.log(`V2 supply before: ${ethers.formatEther(currentV2Supply)} RLGL`);
        console.log(`V2 supply after: ${ethers.formatEther(finalV2Supply)} RLGL`);
        console.log(`Expected supply: ${ethers.formatEther(expectedSupply)} RLGL`);
        
        if (finalV2Supply === expectedSupply) {
            console.log('✅ Supply verification: PASSED');
        } else {
            console.log('❌ Supply verification: FAILED');
        }
        
        // Save migration results
        const migrationReport = {
            network: network,
            v1ContractAddress: migrationData.v1ContractAddress,
            v2ContractAddress: v2ContractAddress,
            migrationTimestamp: new Date().toISOString(),
            totalHolders: migrationData.totalHolders,
            successfulMigrations: successfulMigrations,
            failedMigrations: migrationData.totalHolders - successfulMigrations,
            totalMigrated: totalMigrated.toString(),
            totalMigratedFormatted: ethers.formatEther(totalMigrated),
            v2SupplyBefore: currentV2Supply.toString(),
            v2SupplyAfter: finalV2Supply.toString(),
            supplyVerificationPassed: finalV2Supply === expectedSupply,
            results: migrationResults
        };
        
        const reportFile = path.join(__dirname, '..', `migration-report-${network}-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(migrationReport, null, 2));
        
        console.log(`\n💾 Migration report saved to: ${reportFile}`);
        
        if (successfulMigrations === migrationData.totalHolders) {
            console.log('\n🎉 Migration completed successfully!');
        } else {
            console.log(`\n⚠️  Migration completed with ${migrationData.totalHolders - successfulMigrations} failures`);
        }
        
        return migrationReport;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    migrateV1ToV2()
        .then(() => {
            console.log('✅ Migration process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateV1ToV2 };