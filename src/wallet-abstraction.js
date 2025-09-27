const { ethers } = require("ethers");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CHAIN_CONFIG = {
    1: {
        name: "Ethereum",
        rpc: "https://eth.llamarpc.com",
        usdc: "0xA0b86a33E6441d7aE36C7c4AF2ABfC92d11f8b99"
    },
    137: {
        name: "Polygon",
        rpc: "https://polygon.llamarpc.com",
        usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    },
    11155111: {
        name: "Sepolia",
        rpc: process.env.RPC_URL,
        usdc: process.env.USDC_CONTRACT_ADDRESS
    }
};

class WalletAbstraction {
    constructor() {
        this.providers = new Map();
        this.contracts = new Map();
    }
    
    getProvider(chainId) {
        if (!this.providers.has(chainId)) {
            const config = CHAIN_CONFIG[chainId];
            if (!config) throw new Error(`Unsupported chain: ${chainId}`);
            
            this.providers.set(chainId, new ethers.JsonRpcProvider(config.rpc));
        }
        return this.providers.get(chainId);
    }
    
    getUSDCContract(chainId, signer = null) {
        const key = `${chainId}-${signer ? 'signer' : 'readonly'}`;
        
        if (!this.contracts.has(key)) {
            const config = CHAIN_CONFIG[chainId];
            const provider = signer || this.getProvider(chainId);
            
            const contract = new ethers.Contract(
                config.usdc,
                [
                    'function balanceOf(address) view returns (uint256)',
                    'function transfer(address to, uint256 amount) returns (bool)',
                    'function decimals() view returns (uint8)'
                ],
                provider
            );
            
            this.contracts.set(key, contract);
        }
        return this.contracts.get(key);
    }
    
    async connectUserWallet(userAddress, chainId) {
        return {
            address: userAddress,
            chainId: chainId,
            provider: this.getProvider(chainId)
        };
    }
    
    getChainConfig(chainId) {
        return CHAIN_CONFIG[chainId];
    }
}

module.exports = { WalletAbstraction, CHAIN_CONFIG };