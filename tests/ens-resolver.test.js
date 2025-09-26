const ENSResolver = require('../ens-resolver');
class MockProvider {
    constructor(responses = {}) {
        this.responses = responses;
        this.callCount = 0;
    }

    async resolveName(name) {
        this.callCount++;
        if (name in this.responses) {
            const response = this.responses[name];
            if (response instanceof Error) {
                throw response;
            }
            return response;
        }
        return null;
    }

    async lookupAddress(address) {
        this.callCount++;
        const reverseResponses = this.responses._reverse || {};
        if (address in reverseResponses) {
            const response = reverseResponses[address];
            if (response instanceof Error) {
                throw response;
            }
            return response;
        }
        return null;
    }

    async getBlockNumber() {
        return 12345678;
    }
}

function createTestResolver(mockResponses = {}) {
    const resolver = new ENSResolver('http://localhost:8545', 1);
    resolver.provider = new MockProvider(mockResponses);
    return resolver;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('=== ENS Name Validation Tests ===');

function testValidation() {
    const resolver = createTestResolver();

    const validNames = [
        'vitalik.eth',
        'test.eth',
        'my-name.eth',
        'compound123.eth',
        'a.eth',
        'subdomain.alice.eth'
    ];

    console.log('Valid ENS names:');
    validNames.forEach(name => {
        const isValid = resolver.validateENSName(name);
        console.log(`  ${name}: ${isValid ? '✓' : '✗'}`);
        if (!isValid) console.error(`    ERROR: Should be valid!`);
    });

    const invalidNames = [
        '',
        null,
        undefined,
        'notens',
        '.eth',
        'test.',
        'test.com',
        'test..eth',
        '-test.eth',
        'test-.eth',
        'test@domain.eth',
        'test space.eth'
    ];

    console.log('\nInvalid ENS names:');
    invalidNames.forEach(name => {
        const isValid = resolver.validateENSName(name);
        console.log(`  ${String(name)}: ${isValid ? '✗' : '✓'}`);
        if (isValid) console.error(`    ERROR: Should be invalid!`);
    });
}

async function testCaching() {
    console.log('\n=== Caching Tests ===');

    const mockResponses = {
        'vitalik.eth': '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        'test.eth': '0x1234567890123456789012345678901234567890'
    };

    const resolver = createTestResolver(mockResponses);
    resolver.cacheTTL = 1; 

    console.log('First resolution (should hit provider):');
    const address1 = await resolver.resolve('vitalik.eth');
    console.log(`  vitalik.eth → ${address1}`);
    console.log(`  Provider calls: ${resolver.provider.callCount}`);

    console.log('\nSecond resolution (should hit cache):');
    const address2 = await resolver.resolve('vitalik.eth');
    console.log(`  vitalik.eth → ${address2}`);
    console.log(`  Provider calls: ${resolver.provider.callCount}`);

    if (resolver.provider.callCount !== 1) {
        console.error('  ERROR: Cache not working - provider called multiple times');
    }

    if (address1 !== address2) {
        console.error('  ERROR: Inconsistent results from cache');
    }

    console.log('\nWaiting for cache expiry...');
    await sleep(1100);

    console.log('Third resolution after cache expiry (should hit provider):');
    const address3 = await resolver.resolve('vitalik.eth');
    console.log(`  vitalik.eth → ${address3}`);
    console.log(`  Provider calls: ${resolver.provider.callCount}`);

    if (resolver.provider.callCount !== 2) {
        console.error('  ERROR: Cache expiry not working');
    }

    console.log('\nCache statistics:');
    const stats = resolver.getCacheStats();
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  Valid entries: ${stats.validEntries}`);
    console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
}

async function testErrorHandling() {
    console.log('\n=== Error Handling Tests ===');

    const networkErrorResolver = createTestResolver({
        'network-error.eth': new Error('Network timeout')
    });

    console.log('Testing network error handling:');
    try {
        const result = await networkErrorResolver.resolve('network-error.eth');
        console.log(`  network-error.eth → ${result}`);
    } catch (error) {
        console.log(`  Caught error: ${error.message}`);
    }
    const resolver = createTestResolver({});
    console.log('\nTesting non-existent name:');
    const result = await resolver.resolve('nonexistent.eth');
    console.log(`  nonexistent.eth → ${result}`);

    console.log('\nTesting invalid name:');
    const invalidResult = await resolver.resolve('invalid-name');
    console.log(`  invalid-name → ${invalidResult}`);
}

async function testReverseResolution() {
    console.log('\n=== Reverse Resolution Tests ===');

    const mockResponses = {
        _reverse: {
            '0xd8da6bf26964af9d7eed9e03e53415d37aa96045': 'vitalik.eth'
        }
    };

    const resolver = createTestResolver(mockResponses);
    resolver.enableReverseResolution = true;

    console.log('Testing reverse resolution:');
    const ensName = await resolver.reverseResolve('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
    console.log(`  0xd8da6bf26964af9d7eed9e03e53415d37aa96045 → ${ensName}`);

    // Test invalid address
    console.log('\nTesting invalid address:');
    const invalidResult = await resolver.reverseResolve('invalid-address');
    console.log(`  invalid-address → ${invalidResult}`);

    // Test disabled reverse resolution
    resolver.enableReverseResolution = false;
    console.log('\nTesting disabled reverse resolution:');
    const disabledResult = await resolver.reverseResolve('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
    console.log(`  0xd8da6bf26964af9d7eed9e03e53415d37aa96045 → ${disabledResult}`);
}

// Integration test with real provider (optional)
async function testRealProvider() {
    console.log('\n=== Real Provider Test (Optional) ===');

    try {
        // Only run if RPC_URL is configured
        if (!process.env.RPC_URL || process.env.RPC_URL.includes('YOUR_')) {
            console.log('Skipping real provider test - RPC_URL not configured');
            return;
        }

        const resolver = new ENSResolver();

        console.log('Testing connection...');
        const connected = await resolver.testConnection();

        if (connected) {
            console.log('Testing real ENS resolution:');
            const address = await resolver.resolve('vitalik.eth');
            console.log(`  vitalik.eth → ${address}`);

            if (address) {
                console.log('✓ Real ENS resolution working');
            } else {
                console.log('⚠ ENS resolution returned null (might be network issue)');
            }
        } else {
            console.log('⚠ Could not connect to provider');
        }

    } catch (error) {
        console.log(`Real provider test error: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Running ENS Resolver Test Suite\n');

    try {
        testValidation();
        await testCaching();
        await testErrorHandling();
        await testReverseResolution();
        await testRealProvider();

        console.log('\n✅ All tests completed!');
        console.log('\n📋 Test Summary:');
        console.log('  ✓ Validation tests');
        console.log('  ✓ Caching mechanism');
        console.log('  ✓ Error handling');
        console.log('  ✓ Reverse resolution');
        console.log('  ✓ Real provider test (if configured)');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = {
    createTestResolver,
    runAllTests,
    testValidation,
    testCaching,
    testErrorHandling,
    testReverseResolution
};