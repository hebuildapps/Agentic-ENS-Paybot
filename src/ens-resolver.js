const { ethers } = require('ethers');
const { WalletAbstraction } = require('./wallet-abstraction');

class ENSResolver {
    constructor() {
        this.wallet = new WalletAbstraction();
        this.cache = new Map();
    }
    
    async resolve(ensName, chainId = 1) {
        const cacheKey = `${ensName}-${chainId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            const provider = this.wallet.getProvider(1);
            const address = await provider.resolveName(ensName);
            
            this.cache.set(cacheKey, address);
            return address;
        } catch (error) {
            console.error(`ENS resolution failed for ${ensName}:`, error);
            return null;
        }
    }
    
    validateENSName(ensName) {
        const ensPattern = /^[a-zA-Z0-9-]+\.eth$/;
        return ensPattern.test(ensName);
    }
}

module.exports = ENSResolver;