const WalletManager = require('../src/wallet-manager');
const USDCContract = require('../src/usdc-contract');

// USDC contract addresses for different networks
const USDC_ADDRESSES = {
    // Mainnet
    1: '0xA0b86a33E6441c8C929d05dCA4Cf85a94CA8e7ab', // Circle USDC on mainnet

    // Sepolia testnet
    11155111: [
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Circle USDC on Sepolia
        '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Alternative USDC
        '0xA2025B15a1757311bfD68cb14eaeFCc237AF5b43', // Another testnet USDC
    ],

    // Holesky testnet
    17000: [
        '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    ]
};

async function findCorrectUSDCContract(wallet) {
    console.log('🔍 Finding your USDC contract address...\n');

    // Get current network
    const network = await wallet.getNetworkInfo();
    const chainId = parseInt(network.chainId);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})\n`);

    // Get possible addresses for this network
    let possibleAddresses = USDC_ADDRESSES[chainId];

    if (!possibleAddresses) {
        console.log(`❌ No known USDC addresses for network ${network.name} (Chain ID: ${chainId})`);
        console.log('💡 Try switching to Sepolia testnet or mainnet');
        return null;
    }

    // If it's a single address (mainnet), convert to array
    if (typeof possibleAddresses === 'string') {
        possibleAddresses = [possibleAddresses];
    }

    console.log(`Testing ${possibleAddresses.length} possible USDC contracts...\n`);

    for (const address of possibleAddresses) {
        try {
            console.log(`Testing: ${address}`);
            const usdc = new USDCContract(wallet.wallet, address);
            
            const [contractInfo, balance] = await Promise.all([
                usdc.getContractInfo(),
                usdc.getBalance()
            ]);
            
            console.log(`   Contract: ${contractInfo.name} (${contractInfo.symbol})`);
            console.log(`   Your balance: ${balance.formatted} ${contractInfo.symbol}`);
            
            if (parseFloat(balance.formatted) > 0) {
                console.log(`✅ Found your USDC! Using: ${address}\n`);
                return address;
            } else {
                console.log(`   No balance at this contract\n`);
            }
        } catch (error) {
            console.log(`   Error: ${error.message}\n`);
        }
    }
    
    console.log(' Could not find USDC balance at any known contract addresses');
    return null;
}

async function testUSDCContract() {
    try {
        console.log(' Testing USDC Contract Integration...\n');
        
        const wallet = new WalletManager();
        
        // First try to auto-detect the correct USDC contract
        let usdcAddress = await findCorrectUSDCContract(wallet);

        // If auto-detection fails, try the env variable
        if (!usdcAddress && process.env.USDC_CONTRACT_ADDRESS) {
            console.log('🔄 Auto-detection failed, trying .env USDC_CONTRACT_ADDRESS...\n');
            usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
        }

        if (!usdcAddress) {
            console.log('❌ Could not find any valid USDC contract');
            console.log('\n💡 To fix this:');
            console.log('1. Switch to Sepolia testnet if on mainnet');
            console.log('2. Get testnet USDC from https://faucet.circle.com/');
            console.log('3. Or check your wallet on https://sepolia.etherscan.io/');
            return;
        }
        
        const usdc = new USDCContract(wallet.wallet, usdcAddress);
        
        const contractInfo = await usdc.getContractInfo();
        console.log(`Contract Info:`, contractInfo);
        
        const balance = await usdc.getBalance();
        console.log(`Your USDC Balance: ${balance.formatted} ${contractInfo.symbol}`);
        
        console.log('\n Testing amount validation:');
        const validationTests = [
            { amount: 1, expected: true, description: 'Normal amount' },
            { amount: 0, expected: false, description: 'Zero amount' },
            { amount: -1, expected: false, description: 'Negative amount' },
            { amount: parseFloat(balance.formatted) + 1, expected: false, description: 'More than balance' }
        ];
        
        for (const test of validationTests) {
            const validation = await usdc.validateTransferAmount(test.amount);
            const result = validation.isValid === test.expected ? '✅' : '❌';
            console.log(`${result} ${test.description} (${test.amount}): ${validation.isValid ? 'Valid' : validation.errors.join(', ')}`);
        }
        
        if (parseFloat(balance.formatted) > 0) {
            try {
                const testAmount = Math.min(1, parseFloat(balance.formatted));
                const gasEstimate = await usdc.estimateTransferGas(
                    '0x742c65d61a6a2b1e3ea6c9c5c0b6c7f8d9e1a0b2', // dummy address (lowercase)
                    testAmount
                );
                console.log(`Gas Estimate for ${testAmount} USDC: ${gasEstimate.estimated}`);
            } catch (error) {
                console.log(`Gas estimation failed: ${error.message}`);
            }
        }
        
        if (parseFloat(balance.formatted) === 0) {
            console.log('\n No USDC balance found. Get testnet USDC from:');
            console.log('   - https://faucet.circle.com/ (select Sepolia)');
            console.log('   - https://staging.aave.com/faucet/');
        }
        
        console.log('\n USDC contract tests completed!');
        console.log(` Add to your .env: USDC_CONTRACT_ADDRESS=${usdcAddress}`);
        
    } catch (error) {
        console.error(' USDC contract test failed:', error.message);
    }
}

if (require.main === module) {
    testUSDCContract();
}