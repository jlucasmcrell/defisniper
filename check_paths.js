const fs = require('fs');
const path = require('path');

// Check critical paths
const paths = [
    './src/security/securityManager.js',
    './src/utils/logger.js',
    './src/config/configManager.js',
    './src/trading/engine.js',
    './src/routes/api.js'
];

console.log('Checking critical paths...\n');

paths.forEach(p => {
    const fullPath = path.resolve(p);
    if (fs.existsSync(fullPath)) {
        console.log(`✓ Found: ${p}`);
    } else {
        console.log(`✗ Missing: ${p}`);
        console.log(`  Looked for: ${fullPath}`);
    }
});

// Check module exports
paths.forEach(p => {
    if (fs.existsSync(path.resolve(p))) {
        try {
            const module = require(path.resolve(p));
            console.log(`✓ Can require: ${p}`);
        } catch (error) {
            console.log(`✗ Error requiring: ${p}`);
            console.log(`  Error: ${error.message}`);
        }
    }
});