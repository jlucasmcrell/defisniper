# CryptoSniperBot Installation Guide

This guide will walk you through installing and configuring your automated cryptocurrency trading bot with a complete UI dashboard.

## System Requirements

- Windows 10 or 11
- 4GB RAM minimum (8GB recommended)
- Node.js v14.0.0 or higher
- Internet connection
- Cryptocurrency wallet (Metamask or private key)
- Exchange API keys (for Binance.US and/or Crypto.com)

## Installation Steps

### 1. Download and Extract

1. Create a folder where you want to install the bot (e.g., `C:\CryptoSniperBot`)
2. Extract all files to this folder, maintaining the folder structure

### 2. Initial Setup

1. Right-click on `install.bat` and select "Run as administrator"
2. The installation script will:
   - Check if Node.js is installed (and install it if needed)
   - Install all required dependencies
   - Create necessary folders

3. When installation completes, you'll see a success message

### 3. Configure the Bot

1. Double-click on `setup.bat` to launch the configuration wizard
2. Follow the prompts to enter:
   - Your Alchemy API key (for Ethereum connectivity)
   - Your wallet information (private key or seed phrase)
   - Exchange API keys (Binance.US and/or Crypto.com)
   - Initial trading settings

### 4. Start the Bot

1. Double-click on `start-bot.bat` to launch the bot
2. A command prompt window will show startup information
3. The dashboard will automatically open in your default browser
4. Log in using the credentials you created during setup

## Dashboard Overview

Once the bot is running, you'll have access to the complete dashboard:

- **Dashboard Tab**: Overview of portfolio, active trades, and performance metrics
- **Settings Tab**: Configure trading strategies, risk parameters, and wallet settings
- **Trades Tab**: View detailed history of all trades
- **Logs Tab**: Real-time logging of bot activities

## Trading Configuration

The bot includes several pre-configured settings that you can adjust:

1. **Wallet Percentage**: How much of your wallet to use per trade (default: 5%)
2. **Stop Loss**: Automatic sell when price drops by this percentage (default: 2.5%)
3. **Take Profit**: Automatic sell when price rises by this percentage (default: 5%)
4. **Max Trades**: Maximum number of concurrent trades (default: 5)
5. **Trading Strategies**: Enable/disable different trading strategies

## Security Features

The bot includes several security features:

1. **Encrypted Storage**: All private keys and API credentials are encrypted
2. **Auto-Timeout**: Dashboard automatically logs out after inactivity
3. **Honeypot Detection**: Automatically detects and avoids scam tokens
4. **Slippage Protection**: Prevents trades with excessive slippage

## Troubleshooting

If you encounter issues:

1. **Bot won't start**:
   - Check logs in `logs/error.log`
   - Verify your Alchemy API key is correct
   - Ensure you have enough ETH/BNB for gas fees

2. **Dashboard won't load**:
   - Try accessing http://localhost:3000 manually
   - Check if port 3000 is already in use by another application

3. **Trading errors**:
   - Check connection to exchanges
   - Verify API keys have trading permissions enabled
   - Check wallet balances for sufficient funds

## Support

For additional help:
- Check the `docs` folder for detailed documentation
- View logs in the `logs` folder

## Important Security Notes

- Never share your private keys or API credentials
- Start with small trading amounts while testing
- The bot stores encrypted credentials locally - secure your computer
- Always use API keys with trading-only permissions (no withdrawals)
