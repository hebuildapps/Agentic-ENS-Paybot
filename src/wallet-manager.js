const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class WalletManager {
    constructor() {
        // Validate environment variables
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL not found in .env file');
        }
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }
        
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        
        console.log(`Wallet initialized: ${this.wallet.address}`);
    }
    
    // Get wallet address
    getAddress() {
        return this.wallet.address;
    }
    
    // Get ETH balance (for gas)
    async getETHBalance() {
        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting ETH balance:', error);
            throw new Error('Failed to get ETH balance');
        }
    }
    
    // Check if wallet has sufficient ETH for gas
    async hasGasForTransaction() {
        try {
            const balance = await this.getETHBalance();
            const minGasBalance = 0.001; // 0.001 ETH minimum
            return parseFloat(balance) > minGasBalance;
        } catch (error) {
            console.error('Error checking gas balance:', error);
            return false;
        }
    }
    
    // Get current network info
    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            return {
                name: network.name,
                chainId: network.chainId.toString()
            };
        } catch (error) {
            console.error('Error getting network info:', error);
            throw new Error('Failed to get network info');
        }
    }
}

module.exports = WalletManager;