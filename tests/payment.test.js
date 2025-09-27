const PaymentExecutor = require('../src/payment-executor');

async function testPaymentExecutor() {
    try {
        console.log('Testing Payment Executor...\n');
        const sepoliaUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
        const executor = new PaymentExecutor(sepoliaUSDC);
        
        console.log('Getting balance summary...');
        const balances = await executor.getBalanceSummary();
        console.log(`   Wallet: ${balances.wallet}`);
        console.log(`   ETH: ${balances.eth.balance} (Sufficient: ${balances.eth.sufficient})`);
        console.log(`   USDC: ${balances.usdc.balance} ${balances.usdc.symbol}`);
        
        // Test 2: Pre-flight checks with dummy address (proper checksum)
        const testAddress = '0x742c65d61a6a2b1e3ea6c9c5c0b6c7f8d9e1a0b2';
        const testAmount = 1;
        
        console.log(`\n Pre-flight checks for ${testAmount} USDC to ${testAddress}:`);
        const checks = await executor.preFlightChecks(testAddress, testAmount);
        
        if (checks.passed) {
            console.log(' All pre-flight checks passed');
            console.log(' Ready to execute real transfers!');
        } else {
            console.log('  Pre-flight checks failed:');
            checks.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (checks.warnings.length > 0) {
            console.log('   Warnings:');
            checks.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        // Test 3: Test with invalid scenarios
        console.log('\n  Testing error scenarios:');
        
        // Invalid address
        const invalidAddressCheck = await executor.preFlightChecks('invalid-address', 1);
        console.log(`  Invalid address: ${invalidAddressCheck.errors.join(', ')}`);
        
        // Amount too large
        const tooLargeCheck = await executor.preFlightChecks(testAddress, 999999);
        console.log(`  Amount too large: ${tooLargeCheck.errors.join(', ')}`);
        
        // Test 4: Show what's ready for real execution
        if (checks.passed && parseFloat(balances.usdc.balance) >= testAmount) {
            console.log(`\n  READY FOR REAL PAYMENTS!`);
            console.log(`  To test actual execution, run:`);
            console.log(`   const result = await executor.executeTransfer('0x742C...', 1);`);
            console.log(`  This will send REAL testnet USDC!`);
        } else {
            console.log(`\n To enable real payments:`);
            if (!balances.eth.sufficient) {
                console.log('   - Get more Sepolia ETH: https://sepoliafaucet.com/');
            }
            if (parseFloat(balances.usdc.balance) < testAmount) {
                console.log('   - Get more Sepolia USDC: https://faucet.circle.com/');
            }
        }
        
        console.log('\n Payment executor tests completed!');
        
    } catch (error) {
        console.error('Payment executor test failed:', error.message);
    }
}

async function exampleRealTransfer() {
    console.log(' REAL TRANSFER EXAMPLE (commented for safety)');
    console.log('Uncomment below to send actual testnet USDC:');
}

if (require.main === module) {
    testPaymentExecutor();
}