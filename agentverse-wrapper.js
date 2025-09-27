const AgentCore = require('./src/agent-core');

class AgentverseWrapper {
    constructor() {
        this.agent = new AgentCore();
        this.userSessions = new Map();
    }
    
    async handleAgentverseMessage(userId, message, context = {}) {
        const userAddress = context.walletAddress || this.getUserWallet(userId);
        const chainId = context.chainId || 11155111;
        
        if (!userAddress) {
            return {
                message: "Please connect your wallet to send USDC payments.",
                requestWalletConnection: true,
                supportedChains: [1, 137, 11155111]
            };
        }
        
        const result = await this.agent.handlePrompt(message, userAddress, chainId);
        
        if (result.success) {
            this.userSessions.set(userId, {
                lastTransaction: result.transaction,
                lastIntent: result.intent
            });
            
            return {
                message: result.summary,
                transactionRequest: result.transaction,
                requiresApproval: true
            };
        } else {
            return {
                message: `${result.error}`,
                suggestion: result.suggestion
            };
        }
    }
    
    getUserWallet(userId) {
        return null;
    }
}

module.exports = new AgentverseWrapper();