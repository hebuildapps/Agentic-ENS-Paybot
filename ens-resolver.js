const { ethers } = require('ethers');
require('dotenv').config();

class ENSResolver {
    constructor(rpcUrl = null, networkId = null) {
        this.rpcUrl = rpcUrl || process.env.RPC_URL;
        this.networkId = networkId || parseInt(process.env.NETWORK_ID) || 1;
        this.provider = null;
        this.cache = new Map();
        this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 300;
        this.enableReverseResolution = process.env.ENABLE_REVERSE_RESOLUTION === 'true';

        this._initializeProvider();
    }

    _initializeProvider() {
        try {
            if (!this.rpcUrl) {
                throw new Error('RPC_URL not configured. Please set RPC_URL in .env file');
            }

            this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
        } catch (error) {
            throw new Error(`Failed to initialize provider: ${error.message}`);
        }
    }

    validateENSName(ensName) {
        if (!ensName || typeof ensName !== 'string') {
            return false;
        }

        const ensRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.eth$/;
        return ensRegex.test(ensName.toLowerCase());
    }

    _isCacheValid(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = Date.now();
        return (now - entry.timestamp) < (this.cacheTTL * 1000);
    }

    _getCached(key) {
        if (this._isCacheValid(key)) {
            return this.cache.get(key).value;
        }

        this.cache.delete(key);
        return null;
    }

    _setCache(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    async resolve(ensName) {
        try {
            if (!this.validateENSName(ensName)) {
                console.warn(`Invalid ENS name format: ${ensName}`);
                return null;
            }

            const normalizedName = ensName.toLowerCase();

            const cacheKey = `ens:${normalizedName}`;
            const cached = this._getCached(cacheKey);
            if (cached !== null) {
                return cached;
            }

            const address = await this.provider.resolveName(normalizedName);

            this._setCache(cacheKey, address);

            return address;

        } catch (error) {
            console.error(`ENS resolution failed for ${ensName}: ${error.message}`);

            if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
                throw error;
            }

            return null;
        }
    }

    async reverseResolve(address) {
        if (!this.enableReverseResolution) {
            console.warn('Reverse resolution is disabled');
            return null;
        }

        try {
            if (!ethers.isAddress(address)) {
                console.warn(`Invalid Ethereum address format: ${address}`);
                return null;
            }

            const normalizedAddress = address.toLowerCase();

            const cacheKey = `reverse:${normalizedAddress}`;
            const cached = this._getCached(cacheKey);
            if (cached !== null) {
                return cached;
            }

            const ensName = await this.provider.lookupAddress(normalizedAddress);

            this._setCache(cacheKey, ensName);

            return ensName;

        } catch (error) {
            console.error(`Reverse ENS resolution failed for ${address}: ${error.message}`);
            return null;
        }
    }

    async testConnection() {
        try {
            const blockNumber = await this.provider.getBlockNumber();
            console.log(`Connected to network ${this.networkId}, current block: ${blockNumber}`);
            return true;
        } catch (error) {
            console.error(`Connection test failed: ${error.message}`);
            return false;
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('ENS resolver cache cleared');
    }

    getCacheStats() {
        const now = Date.now();
        const validEntries = Array.from(this.cache.values())
            .filter(entry => (now - entry.timestamp) < (this.cacheTTL * 1000));

        return {
            totalEntries: this.cache.size,
            validEntries: validEntries.length,
            hitRate: this.cache.size > 0 ? (validEntries.length / this.cache.size) : 0
        };
    }
}

module.exports = ENSResolver;

async function main() {
    try {
        const resolver = new ENSResolver();

        console.log('Testing connection...');
        const connected = await resolver.testConnection();
        if (!connected) {
            console.error('Failed to connect to provider');
            return;
        }

        console.log('\n=== Testing ENS Resolution ===');
        const testNames = ['vitalik.eth', 'ens.eth', 'heramb.eth', 'nonexistent.eth'];

        for (const name of testNames) {
            console.log(`${name} →`, await resolver.resolve(name));
        }

        if (resolver.enableReverseResolution) {
            console.log('\n=== Testing Reverse Resolution ===');
            const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
            console.log(`${testAddress} →`, await resolver.reverseResolve(testAddress));
        }

        console.log('\n=== Cache Statistics ===');
        console.log(resolver.getCacheStats());

    } catch (error) {
        console.error('Demo failed:', error.message);
    }
}

if (require.main === module) {
    main();
}