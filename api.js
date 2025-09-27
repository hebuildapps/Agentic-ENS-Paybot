const express = require('express');
const AgentCore = require('./src/agent-core');

const app = express();
app.use(express.json());

const agent = new AgentCore();

app.post('/api/payment', async (req, res) => {
    try {
        const { prompt, userAddress, chainId = 11155111 } = req.body;
        
        if (!prompt || !userAddress) {
            return res.status(400).json({
                error: 'Missing required fields: prompt, userAddress'
            });
        }
        
        const result = await agent.handlePrompt(prompt, userAddress, chainId);
        res.json(result);
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ENS Pay Agent API running on port ${PORT}`);
});