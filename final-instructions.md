# CryptoSniperBot - Complete Installation Instructions

I've created all the necessary files for a fully functional cryptocurrency trading bot with a user-friendly interface. This guide will walk you through downloading, installing, and running the bot.

## File Structure

Download all files and organize them in the following structure:

```
crypto-sniper-bot/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── dashboard.js
│   ├── index.html
│   └── error.html
├── src/
│   ├── blockchain/
│   │   ├── ethereumConnector.js
│   │   └── bnbConnector.js
│   ├── config/
│   │   └── configManager.js
│   ├── exchanges/
│   │   ├── binance.js
│   │   └── cryptocom.js
│   ├── routes/
│   │   └── api.js
│   ├── scripts/
│   │   ├── setup.js
│   │   ├── showLogs.js
│   │   └── stopBot.js
│   ├── security/
│   │   └── securityManager.js
│   ├── strategies/
│   │   ├── tokenSniper.js
│   │   ├── scalping.js
│   │   └── trendTrading.js
│   ├── trading/
│   │   └── engine.js
│   ├── utils/
│   │   └── logger.js
│   ├── electron.js
│   ├── main.js
│   ├── preload.js
│   └── server.js
├── install.bat
├── setup.bat
├── start-bot.bat
├── abis.js
├── package.json
└── tailwind.config.js
```

## Installation Steps

### 1. Download and Prepare

1. Create a new folder named `crypto-sniper-bot` on your computer
2. Download all the files from the provided artifacts
3. Place them in the appropriate directories according to the structure above
4. Make sure the three batch files (`install.bat`, `setup.bat`, and `start-bot.bat`) are in the root directory

### 2. Run the Installer

1. Right-click on `install.bat` and select "Run as administrator"
2. The installer will:
   - Check if Node.js is installed and install it if needed
   - Install all required dependencies
   - Create necessary directories

3. Wait for the installation to complete - this may take a few minutes

### 3. Configure the Bot

1. Run `setup.bat` by double-clicking it
2. Follow the step-by-step prompts to configure:
   - Dashboard password (for accessing the UI)
   - Encryption key (for securing sensitive data)
   - Wallet information (your Ethereum/BNB private key)
   - Exchange API keys (for Binance.US and/or Crypto.com)
   - Trading strategies and parameters
   - Risk management settings

3. **IMPORTANT**: Save your encryption key in a secure location! You will need it to start the bot.

### 4. Start the Bot

1. Run `start-bot.bat` by double-clicking it
2. The bot will start in two parts:
   - Backend server that handles trading logic
   - Dashboard interface that opens in your browser

3. Log in to the dashboard using the password you created during setup
4. Use the "Start Bot" button to begin trading

## Customization Options

### Trading Strategies

The bot includes three main trading strategies:

1. **Token Sniping**: Monitors DEXes for newly added tokens and buys them quickly
2. **Scalping**: Executes quick trades to profit from small price movements
3. **Trend Trading**: Uses technical indicators (RSI, MACD) to identify market trends

You can enable/disable and customize each strategy from the Settings tab.

### Risk Management

Control your risk with several parameters:

- **Wallet Buy Percentage**: How much of your wallet to use per trade
- **Stop Loss**: Automatically sell if a trade goes against you by this percentage
- **Take Profit**: Automatically sell when profit reaches this percentage
- **Max Concurrent Trades**: Limit the number of active trades

### Network Support

The bot supports:

- **Ethereum** (via Alchemy API)
- **BNB Chain** (Binance Smart Chain)
- **Binance.US** exchange
- **Crypto.com** exchange

## Making the Bot Fully Functional

To use the bot with real funds:

1. **API Keys**: Use your own Alchemy API key for Ethereum connectivity
2. **Exchange Accounts**: Create API keys with trading permission (but NOT withdrawal permission) on Binance.US or Crypto.com
3. **Wallet**: Use a dedicated trading wallet with only the funds you're willing to risk

## Security Considerations

1. **Never share your private keys or API credentials**
2. **Start with small amounts** to test the bot's functionality
3. **Regularly monitor** the bot's performance
4. **Keep your encryption key secure** - without it, you cannot restart the bot

## Troubleshooting

If you encounter issues:

1. **Bot won't start**: Check logs in `logs/error.log`
2. **Connection errors**: Verify your Alchemy API key and internet connection
3. **Trading errors**: Ensure you have sufficient funds and trading permissions

For more detailed help, view the logs in the Logs tab or check the error.log file.

## Next Steps

After successful installation:

1. Start with small trade amounts and conservative settings
2. Monitor the bot's performance closely
3. Adjust strategies and parameters based on results
4. Consider setting up automated monitoring and alerts

Remember that cryptocurrency trading involves significant risk. Only trade with funds you can afford to lose.
