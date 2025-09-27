const { ethers } = require('ethers');
const WalletManager = require('./wallet-manager');
const USDCContract = require('./usdc-contract');

class PaymentExecutor {
    constructor(usdcContractAddress = null) {
        this.walletManager = new WalletManager();

        // Use provided address or try to get from env
        const contractAddress = usdcContractAddress || process.env.USDC_CONTRACT_ADDRESS;

        if (!contractAddress) {
            throw new Error('USDC contract address required. Run USDC test first or set USDC_CONTRACT_ADDRESS in .env');
        }

        this.usdcContract = new USDCContract(this.walletManager.wallet, contractAddress);
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
    }
    
    async preFlightChecks(toAddress, amount) {
        const checks = {
            passed: true,
            errors: [],
            warnings: []
        };
        
        try {
            console.log(`🔍 Running pre-flight checks for ${amount} USDC to ${toAddress}...`);
            const hasGas = await this.walletManager.hasGasForTransaction();
            if (!hasGas) {
                checks.passed = false;
                checks.errors.push('Insufficient ETH for gas fees');
            }
            
            if (!ethers.isAddress(toAddress)) {
                checks.passed = false;
                checks.errors.push('Invalid recipient address');
            }
            
            const amountValidation = await this.usdcContract.validateTransferAmount(amount);
            if (!amountValidation.isValid) {
                checks.passed = false;
                checks.errors.push(...amountValidation.errors);
            }
            
            try {
                const gasEstimate = await this.usdcContract.estimateTransferGas(toAddress, amount);
                console.log(`   ⛽ Gas estimate: ${gasEstimate.estimated} (recommended: ${gasEstimate.recommended})`);
            } catch (error) {
                checks.passed = false;
                checks.errors.push(`Transaction would likely fail: ${error.message}`);
            }
            
        } catch (error) {
            checks.passed = false;
            checks.errors.push(`Pre-flight check failed: ${error.message}`);
        }
        
        return checks;
    }
    
    // Execute USDC transfer
    async executeTransfer(toAddress, amount) {
        const startTime = Date.now();
        
        try {
            console.log(`💸 Initiating transfer: ${amount} USDC to ${toAddress}`);
            
            const checks = await this.preFlightChecks(toAddress, amount);
            if (!checks.passed) {
                throw new Error(`Pre-flight checks failed: ${checks.errors.join(', ')}`);
            }
            
            const decimals = await this.usdcContract.contract.decimals();
            const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
            
            const gasEstimate = await this.usdcContract.estimateTransferGas(toAddress, amount);
            
            console.log(`📡 Sending transaction with gas limit: ${gasEstimate.recommended}...`);
            
            const tx = await this.usdcContract.contract.transfer(toAddress, formattedAmount, {
                gasLimit: gasEstimate.recommended
            });
            
            console.log(`📋 Transaction submitted: ${tx.hash}`);
            console.log(`⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            
            const duration = Date.now() - startTime;
            
            return {
                success: true,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                amount: amount,
                recipient: toAddress,
                duration: duration,
                explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`
            };
            
        } catch (error) {
            console.error('Transfer FAILED:', error.message);
            
            return {
                success: false,
                error: error.message,
                amount: amount,
                recipient: toAddress,
                duration: Date.now() - startTime
            };
        }
    }
    
    async getBalanceSummary() {
        try {
            const [ethBalance, usdcBalance, contractInfo] = await Promise.all([
                this.walletManager.getETHBalance(),
                this.usdcContract.getBalance(),
                this.usdcContract.getContractInfo()
            ]);
            
            return {
                wallet: this.walletManager.getAddress(),
                eth: {
                    balance: ethBalance,
                    sufficient: parseFloat(ethBalance) > 0.001
                },
                usdc: {
                    balance: usdcBalance.formatted,
                    symbol: contractInfo.symbol,
                    raw: usdcBalance.raw
                }
            };
        } catch (error) {
            throw new Error(`Failed to get balance summary: ${error.message}`);
        }
    }
    async getTransactionStatus(txHash) {
        try {
            const receipt = await this.walletManager.provider.getTransactionReceipt(txHash);
            if (!receipt) {
                return { status: 'pending' };
            }
            
            return {
                status: receipt.status === 1 ? 'success' : 'failed',
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
            };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = PaymentExecutor;