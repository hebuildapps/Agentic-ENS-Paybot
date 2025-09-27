const WalletManager = require("../src/wallet-manager");

async function testWallet() {
    try {
        console.log("🧪 Testing Wallet Connection...\n");

        const wallet = new WalletManager();

        const address = wallet.getAddress();
        console.log(`Your Wallet Address: ${address}`);

        const ethBalance = await wallet.getETHBalance();
        console.log(`Your ETH Balance: ${ethBalance} ETH`);

        const hasGas = await wallet.hasGasForTransaction();
        console.log(`Wallet has Enough Gas for Transactions: ${hasGas}`);

        const network = await wallet.getNetworkInfo();
        console.log(`Your Network: ${network.name} (Chain ID: ${network.chainId})`);

        if (!hasGas) {
        console.log("\n WARNING: Low ETH balance. Get more from faucet!");
        }

        if (parseFloat(ethBalance) >= 0.05) {
        console.log("\n Wallet setup looks great!");
        }
    } catch (error) {
    console.error(" Wallet test failed:", error.message);
    console.log("\n Check your .env file:");
    console.log("   - RPC_URL should be your Alchemy/Infura endpoint");
    console.log("   - PRIVATE_KEY should start with 0x");
}
}

if (require.main === module) {
    testWallet();
}
