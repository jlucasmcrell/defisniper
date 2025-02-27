#!/bin/bash

echo "Starting DeFi Sniper Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the application using the existing npm script
echo "Starting server and UI..."
npm start

# If there was an error, keep the terminal open
if [ $? -ne 0 ]; then
    echo
    echo "An error occurred while starting the bot"
    echo "Check the logs for more information"
    read -p "Press Enter to exit..."
fi