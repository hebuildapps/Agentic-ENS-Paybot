const AgentCore = require('./src/agent-core');

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
        console.log('Usage: node cli.js "prompt" --user 0x123... --chain 11155111');
        process.exit(1);
    }
    
    const prompt = args[0];
    const userIndex = args.indexOf('--user') + 1;
    const chainIndex = args.indexOf('--chain') + 1;
    
    const userAddress = userIndex > 0 ? args[userIndex] : null;
    const chainId = chainIndex > 0 ? parseInt(args[chainIndex]) : 11155111;
    
    if (!userAddress) {
        console.error('Error: --user address is required');
        process.exit(1);
    }
    
    const agent = new AgentCore();
    const result = await agent.handlePrompt(prompt, userAddress, chainId);
    
    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);