# ENS Pay Agent

An AI agent that processes natural language payment commands and executes blockchain transactions using ENS (Ethereum Name Service) resolution.

## 🎯 Features

- **ENS Resolution**: Convert ENS names (like `alice.eth`) to Ethereum addresses
- **Reverse Resolution**: Convert addresses back to ENS names
- **Caching**: In-memory caching for improved performance
- **Validation**: Comprehensive input validation and error handling
- **Network Support**: Configurable for mainnet/testnet
- **Security**: Environment-based configuration, no hardcoded secrets

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NETWORK_ID=11155111
ENABLE_REVERSE_RESOLUTION=true
CACHE_TTL_SECONDS=300
```

### 3. Test ENS Resolution

```bash
# Run the demo
node ens-resolver.js

# Run comprehensive tests
node tests/ens-resolver.test.js
```

## 📖 Usage

### Basic ENS Resolution

```javascript
const ENSResolver = require('./ens-resolver');

const resolver = new ENSResolver();

// Resolve ENS name to address
const address = await resolver.resolve('vitalik.eth');
console.log(address); // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

// Reverse resolve address to ENS name
const ensName = await resolver.reverseResolve('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
console.log(ensName); // vitalik.eth
```

### Advanced Usage

```javascript
// Custom configuration
const resolver = new ENSResolver('https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY', 1);

// Test connection
const connected = await resolver.testConnection();

// Cache management
resolver.clearCache();
const stats = resolver.getCacheStats();

// Validation
const isValid = resolver.validateENSName('alice.eth'); // true
```

## 🏗️ Project Structure

```
ens-pay-agent/
├── ens-resolver.js         # Core ENS resolution class
├── tests/
│   └── ens-resolver.test.js # Comprehensive test suite
├── .env                    # Environment configuration
├── .gitignore             # Git ignore rules
├── package.json           # NPM configuration
└── README.md              # This file
```

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Ethereum RPC endpoint | Required |
| `NETWORK_ID` | Network ID (1=mainnet, 11155111=sepolia) | 1 |
| `CACHE_TTL_SECONDS` | Cache expiration time | 300 |
| `ENABLE_REVERSE_RESOLUTION` | Enable address→name lookup | true |

## 🧪 Testing

The test suite includes:

- ✅ ENS name validation
- ✅ Caching mechanism
- ✅ Error handling
- ✅ Reverse resolution
- ✅ Real network integration (optional)

```bash
# Run all tests
node tests/ens-resolver.test.js

# Test with real network (configure RPC_URL first)
RPC_URL=your_rpc_url node tests/ens-resolver.test.js
```

## 🛡️ Security

- ✅ No hardcoded API keys
- ✅ Environment-based configuration
- ✅ Input validation and sanitization
- ✅ Proper error handling
- ✅ No logging of sensitive data

## 🔄 Development Phases

### ✅ Phase 1: ENS Foundation (COMPLETE)
- [x] Secure ENS resolution
- [x] Comprehensive validation
- [x] Caching system
- [x] Error handling
- [x] Test suite

### 📋 Phase 2: MeTTa Integration (NEXT)
- [ ] Install OpenCog Hyperon MeTTa
- [ ] Create payment parsing rules
- [ ] Build JavaScript-MeTTa bridge
- [ ] Natural language intent parsing

### 🎯 Phase 3: Payment System
- [ ] ERC-20 token handling
- [ ] Transaction creation
- [ ] Gas estimation
- [ ] Transaction monitoring

## 📝 API Reference

### ENSResolver Class

#### Constructor
```javascript
new ENSResolver(rpcUrl?, networkId?)
```

#### Methods
- `resolve(ensName)` - Resolve ENS name to address
- `reverseResolve(address)` - Resolve address to ENS name
- `validateENSName(name)` - Validate ENS name format
- `testConnection()` - Test provider connection
- `clearCache()` - Clear resolution cache
- `getCacheStats()` - Get cache statistics

## 🐛 Troubleshooting

### Common Issues

1. **RPC_URL not configured**
   ```
   Error: RPC_URL not configured. Please set RPC_URL in .env file
   ```
   Solution: Configure your `.env` file with a valid RPC endpoint

2. **Network connection failed**
   ```
   Connection test failed: network timeout
   ```
   Solution: Check your internet connection and RPC endpoint

3. **Invalid ENS name**
   ```
   Invalid ENS name format: invalid-name
   ```
   Solution: Ensure ENS names end with `.eth` and contain only valid characters

## 🤝 Contributing

1. Focus on ENS resolution quality first
2. Add comprehensive tests for new features
3. Follow existing code style and patterns
4. Update documentation for API changes

## 📄 License

MIT License - see LICENSE file for details