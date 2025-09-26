const IntentParser = require('../src/intent-parser.js');

class TestRunner {
    constructor() {
        this.parser = new IntentParser();
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(description, testFn) {
        this.tests.push({ description, testFn });
    }

    assertEquals(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }

    assertTrue(condition, message) {
        if (!condition) {
            throw new Error(message || 'Expected true, got false');
        }
    }

    assertFalse(condition, message) {
        if (condition) {
            throw new Error(message || 'Expected false, got true');
        }
    }

    run() {
        console.log('🧪 Running Intent Parser Tests...\n');

        for (const { description, testFn } of this.tests) {
            try {
                testFn();
                console.log(`✅ ${description}`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${description}`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
            }
        }

        console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);

        if (this.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('💥 Some tests failed');
            process.exit(1);
        }
    }
}

// Initialize test runner
const runner = new TestRunner();

// Test various payment formats
runner.test('Parse basic "pay X usdc to domain.eth" format', () => {
    const result = runner.parser.parsePaymentIntent('pay 100 usdc to alice.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 100);
    runner.assertEquals(result.recipient, 'alice.eth');
    runner.assertEquals(result.token, 'USDC');
});

runner.test('Parse "send X usdc to domain.eth" format', () => {
    const result = runner.parser.parsePaymentIntent('send 50.5 usdc to bob.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 50.5);
    runner.assertEquals(result.recipient, 'bob.eth');
});

runner.test('Parse "transfer X usdc to domain.eth" format', () => {
    const result = runner.parser.parsePaymentIntent('transfer 25.75 usdc to charlie.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 25.75);
    runner.assertEquals(result.recipient, 'charlie.eth');
});

runner.test('Parse "domain.eth X usdc" format', () => {
    const result = runner.parser.parsePaymentIntent('alice.eth 200 usdc');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 200);
    runner.assertEquals(result.recipient, 'alice.eth');
});

// Test case variations
runner.test('Parse with mixed case', () => {
    const result = runner.parser.parsePaymentIntent('PAY 100 USDC TO Alice.ETH');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 100);
    runner.assertEquals(result.recipient, 'alice.eth');
});

runner.test('Parse with extra whitespace', () => {
    const result = runner.parser.parsePaymentIntent('  pay   100   usdc   to   alice.eth  ');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 100);
    runner.assertEquals(result.recipient, 'alice.eth');
});

// Test decimal amounts
runner.test('Parse decimal amounts with various precision', () => {
    const testCases = [
        { input: 'pay 0.1 usdc to alice.eth', expected: 0.1 },
        { input: 'pay 0.01 usdc to alice.eth', expected: 0.01 },
        { input: 'pay 0.001 usdc to alice.eth', expected: 0.001 },
        { input: 'pay 123.456789 usdc to alice.eth', expected: 123.456789 },
        { input: 'pay 1000.0 usdc to alice.eth', expected: 1000.0 }
    ];

    testCases.forEach(({ input, expected }) => {
        const result = runner.parser.parsePaymentIntent(input);
        runner.assertEquals(result.success, true);
        runner.assertEquals(result.amount, expected);
    });
});

// Test ENS domain variations
runner.test('Parse various ENS domain formats', () => {
    const testCases = [
        'alice.eth',
        'bob-test.eth',
        'charlie123.eth',
        'test-user-123.eth',
        'a.eth',
        'very-long-domain-name-here.eth'
    ];

    testCases.forEach(domain => {
        const result = runner.parser.parsePaymentIntent(`pay 100 usdc to ${domain}`);
        runner.assertEquals(result.success, true, `Failed for domain: ${domain}`);
        runner.assertEquals(result.recipient, domain.toLowerCase());
    });
});

// Test edge cases
runner.test('Reject invalid formats', () => {
    const invalidCases = [
        'pay 100 to alice.eth',  // missing token
        'send usdc to alice.eth',  // missing amount
        'pay 100 eth to alice.eth',  // wrong token
        'pay 100 usdc alice.eth',  // missing "to"
        'transfer 100 usdc from alice.eth',  // wrong preposition
        'pay abc usdc to alice.eth',  // non-numeric amount
        'pay 100 usdc to alice',  // missing .eth
        'pay 100 usdc to .eth',  // empty domain name
        'random text',  // completely unrelated
        '',  // empty string
        '   ',  // whitespace only
    ];

    invalidCases.forEach(testCase => {
        const result = runner.parser.parsePaymentIntent(testCase);
        runner.assertEquals(result.success, false, `Should have failed for: "${testCase}"`);
        runner.assertTrue(result.error, 'Should have error message');
    });
});

// Test amount validation
runner.test('Validate amounts within range', () => {
    const validAmounts = [0.01, 1, 50, 100, 500, 999.99, 1000];

    validAmounts.forEach(amount => {
        const result = runner.parser.parseAndValidate(`pay ${amount} usdc to alice.eth`);
        runner.assertEquals(result.success, true, `Should accept amount: ${amount}`);
    });
});

runner.test('Reject amounts outside range', () => {
    const invalidAmounts = [
        { amount: 0, shouldParseButFailValidation: true },
        { amount: -1, shouldParseButFailValidation: false }, // Negative numbers don't match regex
        { amount: -100, shouldParseButFailValidation: false },
        { amount: 1000.01, shouldParseButFailValidation: true },
        { amount: 1001, shouldParseButFailValidation: true },
        { amount: 9999, shouldParseButFailValidation: true }
    ];

    invalidAmounts.forEach(({ amount, shouldParseButFailValidation }) => {
        const result = runner.parser.parseAndValidate(`pay ${amount} usdc to alice.eth`);
        runner.assertEquals(result.success, false, `Should reject amount: ${amount}`);

        if (shouldParseButFailValidation) {
            runner.assertTrue(result.error.includes('Invalid amount'), 'Should have amount validation error');
        } else {
            runner.assertTrue(result.error.includes('Could not parse'), 'Should have parsing error');
        }
    });
});

// Test original text preservation
runner.test('Preserve original text in results', () => {
    const originalText = 'Pay 100 USDC to Alice.ETH';
    const result = runner.parser.parsePaymentIntent(originalText);
    runner.assertEquals(result.originalText, originalText);
});

// Test stress cases
runner.test('Handle very long ENS domains', () => {
    const longDomain = 'a'.repeat(50) + '.eth';
    const result = runner.parser.parsePaymentIntent(`pay 100 usdc to ${longDomain}`);
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.recipient, longDomain.toLowerCase());
});

runner.test('Handle very small decimal amounts', () => {
    const result = runner.parser.parsePaymentIntent('pay 0.000001 usdc to alice.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 0.000001);
});

// Test pattern matching edge cases
runner.test('Handle numbers in ENS domains', () => {
    const result = runner.parser.parsePaymentIntent('pay 100 usdc to user123.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.recipient, 'user123.eth');
});

runner.test('Handle hyphens in ENS domains', () => {
    const result = runner.parser.parsePaymentIntent('pay 100 usdc to test-user.eth');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.recipient, 'test-user.eth');
});

// Test realistic user input variations
runner.test('Handle natural language variations', () => {
    const variations = [
        'Pay 100 USDC to alice.eth',
        'send 100 usdc to alice.eth',
        'Transfer 100 USDC to alice.eth',
        'alice.eth 100 USDC',
        'alice.eth 100 usdc'
    ];

    variations.forEach(variation => {
        const result = runner.parser.parsePaymentIntent(variation);
        runner.assertEquals(result.success, true, `Failed for: "${variation}"`);
        runner.assertEquals(result.amount, 100);
        runner.assertEquals(result.recipient, 'alice.eth');
    });
});

// Test boundary conditions for amounts
runner.test('Test exact boundary amounts', () => {
    // Test exact boundaries
    const result1 = runner.parser.parseAndValidate('pay 1000 usdc to alice.eth');
    runner.assertEquals(result1.success, true, 'Should accept exactly 1000');

    const result2 = runner.parser.parseAndValidate('pay 1000.00 usdc to alice.eth');
    runner.assertEquals(result2.success, true, 'Should accept 1000.00');

    const result3 = runner.parser.parseAndValidate('pay 0.01 usdc to alice.eth');
    runner.assertEquals(result3.success, true, 'Should accept minimum valid amount');
});

// Test multiple patterns in one test to ensure no conflicts
runner.test('Test pattern precedence and conflicts', () => {
    // Test that the first matching pattern wins
    const result = runner.parser.parsePaymentIntent('pay 100 usdc to alice.eth and send more');
    runner.assertEquals(result.success, true);
    runner.assertEquals(result.amount, 100);
    runner.assertEquals(result.recipient, 'alice.eth');
});

// Test with special characters in context (but not in the actual command)
runner.test('Handle commands with surrounding text', () => {
    const contextualInputs = [
        'Hey, can you pay 100 usdc to alice.eth please?',
        'I need to send 50 usdc to bob.eth today',
        'transfer 25 usdc to charlie.eth for the invoice'
    ];

    // Note: Current parser doesn't handle surrounding text well
    // This documents current behavior
    contextualInputs.forEach(input => {
        const result = runner.parser.parsePaymentIntent(input);
        // Most will fail because the parser expects exact patterns
        // This is a limitation to potentially address in future improvements
    });
});

// Test enhanced validation
runner.test('Test enhanced amount validation', () => {
    // Test decimal precision limits
    const result1 = runner.parser.parseAndValidate('pay 1.1234567 usdc to alice.eth');
    runner.assertEquals(result1.success, false, 'Should reject amounts with > 6 decimal places');
    runner.assertTrue(result1.error.includes('decimal places'));

    // Test valid precision
    const result2 = runner.parser.parseAndValidate('pay 1.123456 usdc to alice.eth');
    runner.assertEquals(result2.success, true, 'Should accept 6 decimal places');
});

runner.test('Test enhanced ENS domain validation', () => {
    const invalidDomains = [
        'ab.eth', // Too short
        'a'.repeat(64) + '.eth', // Too long
        'test-.eth', // Ends with hyphen
        '-test.eth', // Starts with hyphen
        'test@.eth', // Invalid character
        'test..eth', // Invalid format
        '.eth', // Empty name
        'test.com', // Wrong TLD
        'test' // Missing .eth
    ];

    invalidDomains.forEach(domain => {
        const result = runner.parser.parseAndValidate(`pay 100 usdc to ${domain}`);
        if (result.success) {
            // If it parsed successfully, validation should catch it
            runner.assertEquals(result.success, false, `Should reject invalid domain: ${domain}`);
        }
        // If it didn't parse, that's also acceptable
    });

    // Test valid domains
    const validDomains = [
        'abc.eth',
        'test123.eth',
        'test-user.eth',
        'user-123-test.eth',
        'a1b2c3.eth'
    ];

    validDomains.forEach(domain => {
        const result = runner.parser.parseAndValidate(`pay 100 usdc to ${domain}`);
        runner.assertEquals(result.success, true, `Should accept valid domain: ${domain}`);
    });
});

// Run all tests
runner.run();