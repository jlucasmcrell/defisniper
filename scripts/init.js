const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function initializeBot() {
    try {
        console.log('Initializing trading bot...\n');

        // Ensure directories exist
        await ensureDirectories();

        // Generate encryption key if it doesn't exist
        await generateEncryptionKey();

        // Get configurations from user
        const configs = await getConfigurations();

        // Save configurations
        await saveConfigurations(configs);

        console.log('\nInitialization completed successfully!');
        rl.close();
    } catch (error) {
        console.error('\nError during initialization:', error.message);
        rl.close();
        process.exit(1);
    }
}

async function ensureDirectories() {
    const dirs = ['secure-config', 'logs', 'data'];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
}

async function generateEncryptionKey() {
    const keyPath = path.join('secure-config', 'master.key');
    try {
        await fs.access(keyPath);
        console.log('Encryption key already exists');
    } catch {
        const key = crypto.randomBytes(32);
        await fs.writeFile(keyPath, key);
        await fs.chmod(keyPath, 0o600);
        console.log('Generated new encryption key');
    }
}

async function getConfigurations() {
    const configs = {};

    console.log('\nExchange Configuration:');
    console.log('----------------------');

    const setupBinance = await question('Set up Binance.US API? (y/n): ');
    if (setupBinance.toLowerCase() === 'y') {
        configs['binance-us'] = {
            apiKey: await question('Enter Binance.US API Key: '),
            apiSecret: await question('Enter Binance.US API Secret: ')
        };
    }

    const setupCrypto = await question('\nSet up Crypto.com API? (y/n): ');
    if (setupCrypto.toLowerCase() === 'y') {
        configs['crypto-com'] = {
            apiKey: await question('Enter Crypto.com API Key: '),
            apiSecret: await question('Enter Crypto.com API Secret: ')
        };
    }

    console.log('\nInfura Configuration:');
    console.log('--------------------');
    const setupInfura = await question('Set up Infura? (y/n): ');
    if (setupInfura.toLowerCase() === 'y') {
        configs['infura'] = {
            projectId: await question('Enter Infura Project ID: '),
            projectSecret: await question('Enter Infura Project Secret: ')
        };
    }

    return configs;
}

async function saveConfigurations(configs) {
    const keyPath = path.join('secure-config', 'master.key');
    const key = await fs.readFile(keyPath);

    for (const [provider, config] of Object.entries(configs)) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const encrypted = Buffer.concat([
            cipher.update(JSON.stringify(config), 'utf8'),
            cipher.final()
        ]);
        
        const authTag = cipher.getAuthTag();
        const finalBuffer = Buffer.concat([iv, authTag, encrypted]);
        
        await fs.writeFile(
            path.join('secure-config', `${provider}.config`),
            finalBuffer.toString('base64')
        );
        
        console.log(`Saved configuration for ${provider}`);
    }
}

// Start initialization
initializeBot();