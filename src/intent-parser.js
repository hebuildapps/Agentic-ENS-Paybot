    class IntentParser {
    parsePaymentIntent(message) {
        const text = message.toLowerCase().trim();

        const patterns = [
        /pay\s+(\d+(?:\.\d+)?)\s+usdc\s+to\s+([a-zA-Z0-9-]+\.eth)/i,
        /send\s+(\d+(?:\.\d+)?)\s+usdc\s+to\s+([a-zA-Z0-9-]+\.eth)/i,
        /transfer\s+(\d+(?:\.\d+)?)\s+usdc\s+to\s+([a-zA-Z0-9-]+\.eth)/i,
        /([a-zA-Z0-9-]+\.eth)\s+(\d+(?:\.\d+)?)\s+usdc/i,
        ];

        for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = text.match(pattern);
        if (match) {
            let amount, recipient;
            // Check if this is the "domain.eth amount usdc" pattern (4th pattern, index 3)
            if (i === 3) {
            recipient = match[1];
            amount = parseFloat(match[2]);
            } else {
            amount = parseFloat(match[1]);
            recipient = match[2];
            }

            return {
            success: true,
            intent: "payment",
            amount: amount,
            token: "USDC",
            recipient: recipient.toLowerCase(),
            originalText: message,
            };
        }
        }

        return {
        success: false,
        error: "Could not parse payment command",
        originalText: message,
        };
    }

    validateAmount(amount) {
        const num = parseFloat(amount);

        if (isNaN(num)) {
            return false;
        }

        if (num <= 0) {
            return false;
        }

        if (num > 1000) {
            return false;
        }

        // Check for reasonable decimal precision (max 6 decimal places for USDC)
        const decimalPlaces = (num.toString().split('.')[1] || '').length;
        if (decimalPlaces > 6) {
            return false;
        }

        return true;
    }

    validateENSDomain(domain) {
        // Basic ENS domain validation
        if (!domain || typeof domain !== 'string') {
            return false;
        }

        // Must end with .eth
        if (!domain.endsWith('.eth')) {
            return false;
        }

        // Remove .eth suffix for validation
        const name = domain.slice(0, -4);

        // Must not be empty
        if (name.length === 0) {
            return false;
        }

        // Must be reasonable length (3-63 characters for the name part)
        if (name.length < 3 || name.length > 63) {
            return false;
        }

        // Basic character validation (alphanumeric and hyphens)
        const validPattern = /^[a-zA-Z0-9-]+$/;
        if (!validPattern.test(name)) {
            return false;
        }

        // Cannot start or end with hyphen
        if (name.startsWith('-') || name.endsWith('-')) {
            return false;
        }

        return true;
    }

    parseAndValidate(message) {
        const result = this.parsePaymentIntent(message);

        if (!result.success) {
        return result;
        }

        // Validate amount
        if (!this.validateAmount(result.amount)) {
        return {
            success: false,
            error: "Invalid amount. Must be between 0.000001 and 1000 USDC with max 6 decimal places.",
            originalText: message,
        };
        }

        // Validate ENS domain
        if (!this.validateENSDomain(result.recipient)) {
        return {
            success: false,
            error: "Invalid ENS domain. Must be a valid .eth domain (3-63 characters, alphanumeric and hyphens only).",
            originalText: message,
        };
        }

        return result;
    }
    }

module.exports = IntentParser;
