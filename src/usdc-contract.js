const { ethers } = require('ethers');

class USDCContract {
    constructor(wallet, contractAddress) {
        this.wallet = wallet;
        this.contractAddress = contractAddress;
        
        this.abi = [
            'function balanceOf(address account) view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function symbol() view returns (string)',
            'function name() view returns (string)',
            'function transfer(address to, uint256 amount) returns (bool)',
            'event Transfer(address indexed from, address indexed to, uint256 value)'
        ];
        
        this.contract = new ethers.Contract(contractAddress, this.abi, wallet);
    }
    
    async getBalance(address = null) {
        try {
            const targetAddress = address || this.wallet.address;
            const balance = await this.contract.balanceOf(targetAddress);
            const decimals = await this.contract.decimals();
            
            return {
                raw: balance.toString(),
                formatted: ethers.formatUnits(balance, decimals),
                decimals: decimals
            };
        } catch (error) {
            console.error('Error getting USDC balance:', error);
            throw new Error(`Failed to get USDC balance: ${error.message}`);
        }
    }
    
    async getContractInfo() {
        try {
            const [name, symbol, decimals] = await Promise.all([
                this.contract.name(),
                this.contract.symbol(), 
                this.contract.decimals()
            ]);
            
            return { 
                name, 
                symbol, 
                decimals: decimals.toString(), 
                address: this.contractAddress 
            };
        } catch (error) {
            console.error('Error getting contract info:', error);
            throw new Error('Failed to get contract info');
        }
    }
    
    async validateTransferAmount(amount, fromAddress = null) {
        try {
            const sourceAddress = fromAddress || this.wallet.address;
            const balance = await this.getBalance(sourceAddress);
            const requestedAmount = parseFloat(amount);
            const availableAmount = parseFloat(balance.formatted);
            
            const validation = {
                isValid: true,
                errors: [],
                balance: availableAmount,
                requested: requestedAmount
            };
            
            if (requestedAmount <= 0) {
                validation.isValid = false;
                validation.errors.push('Amount must be greater than 0');
            }
            
            if (requestedAmount > availableAmount) {
                validation.isValid = false;
                validation.errors.push(`Insufficient balance. Available: ${availableAmount} USDC, Requested: ${requestedAmount} USDC`);
            }
            
            if (requestedAmount > 1000) {
                validation.isValid = false;
                validation.errors.push('Amount too large (max 1,000 USDC per transaction)');
            }
            
            return validation;
        } catch (error) {
            throw new Error('Failed to validate transfer amount');
        }
    }
    
    async estimateTransferGas(toAddress, amount) {
        try {
            const decimals = await this.contract.decimals();
            const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
            
            const gasEstimate = await this.contract.transfer.estimateGas(toAddress, formattedAmount);
            
            return {
                estimated: gasEstimate.toString(),
                recommended: (gasEstimate * 120n / 100n).toString() // Add 20% buffer
            };
        } catch (error) {
            console.error('Error estimating gas:', error);
            throw new Error(`Gas estimation failed: ${error.message}`);
        }
    }
}

module.exports = USDCContract;