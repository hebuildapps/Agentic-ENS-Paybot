const { ethers } = require('ethers');
const ENSResolver = require('./ens-resolver');
const IntentParser = require('./intent-parser');
const { WalletAbstraction } = require('./wallet-abstraction');
const fs = require('fs');

class AgentCore {
    constructor() {
        this.ensResolver = new ENSResolver();
        this.intentParser = new IntentParser();
        this.walletManager = new WalletAbstraction();
        this.logFile = 'mvp.log';
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        console.log(logEntry.trim());
        fs.appendFileSync(this.logFile, logEntry);
    }
    
    async handlePrompt(rawPrompt, userAddress, chainId = 11155111) {
        this.log(`=== NEW REQUEST ===`);
        this.log(`Prompt: ${rawPrompt}`);
        this.log(`User: ${userAddress}`);
        this.log(`Chain: ${chainId} (${this.walletManager.getChainConfig(chainId).name})`);
        
        try {
            // Step 1: Parse Intent
            this.log(`Step 1: Parsing intent...`);
            const intent = this.intentParser.parseAndValidate(rawPrompt);
            
            if (!intent.success) {
                this.log(`Intent parsing FAILED: ${intent.error}`);
                return {
                    success: false,
                    error: intent.error,
                    suggestion: "Try: 'Send 5 USDC to alice.eth'"
                };
            }
            
            this.log(`Parsed: ${intent.amount} USDC to ${intent.recipient}`);
            
            // Step 2: Resolve ENS
            this.log(`Step 2: Resolving ENS name...`);
            const recipientAddress = await this.ensResolver.resolve(intent.recipient);
            
            if (!recipientAddress) {
                this.log(`ENS resolution FAILED for ${intent.recipient}`);
                return {
                    success: false,
                    error: `Could not resolve ${intent.recipient}`,
                    suggestion: "Check the ENS name spelling"
                };
            }
            
            this.log(`Resolved ${intent.recipient} → ${recipientAddress}`);
            
            this.log(`Step 3: Checking user balance...`);
            const userBalance = await this.checkUserBalance(userAddress, chainId);
            
            if (userBalance < intent.amount) {
                this.log(`Insufficient balance: ${userBalance} < ${intent.amount}`);
                return {
                    success: false,
                    error: `Insufficient balance. You have ${userBalance} USDC, need ${intent.amount} USDC`,
                    suggestion: "Add more USDC to your wallet"
                };
            }
            
            this.log(`Sufficient balance: ${userBalance} USDC`);
            
            // Step 4: Prepare Transaction
            this.log(`Step 4: Preparing transaction...`);
            const transaction = await this.prepareTransaction(
                userAddress,
                recipientAddress, 
                intent.amount,
                chainId
            );
            
            this.log(`Transaction prepared`);
            this.log(`=== REQUEST COMPLETE ===`);
            
            return {
                success: true,
                intent: intent,
                recipientAddress: recipientAddress,
                userBalance: userBalance,
                transaction: transaction,
                summary: `Send ${intent.amount} USDC to ${intent.recipient} (${recipientAddress.slice(0,6)}...${recipientAddress.slice(-4)})`
            };
            
        } catch (error) {
            this.log(`Error: ${error.message}`);
            return {
                success: false,
                error: error.message,
                suggestion: "Please try again or contact support"
            };
        }
    }
    
    async checkUserBalance(userAddress, chainId) {
        const usdcContract = this.walletManager.getUSDCContract(chainId);
        const balance = await usdcContract.balanceOf(userAddress);
        const decimals = await usdcContract.decimals();
        return parseFloat(ethers.formatUnits(balance, decimals));
    }
    
    async prepareTransaction(fromAddress, toAddress, amount, chainId) {
        const usdcContract = this.walletManager.getUSDCContract(chainId);
        const decimals = await usdcContract.decimals();
        const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
        const txData = await usdcContract.transfer.populateTransaction(toAddress, formattedAmount);
        const provider = this.walletManager.getProvider(chainId);
        const gasEstimate = await provider.estimateGas({
            ...txData,
            from: fromAddress
        });
        
        return {
            to: txData.to,
            data: txData.data,
            value: '0',
            gasLimit: gasEstimate.toString(),
            chainId: chainId
        };
    }
}

module.exports = AgentCore;