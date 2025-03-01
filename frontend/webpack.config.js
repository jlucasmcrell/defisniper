const path = require('path');

module.exports = {
    // Other webpack configurations...

    ignoreWarnings: [
        /Module not found: Error: Can't resolve 'zlib'/,
        /Module not found: Error: Can't resolve 'querystring'/,
        /Module not found: Error: Can't resolve 'path'/,
        /Module not found: Error: Can't resolve 'crypto'/,
        /Module not found: Error: Can't resolve 'fs'/,
        /Module not found: Error: Can't resolve 'stream'/,
        /Module not found: Error: Can't resolve 'http'/,
        /Module not found: Error: Can't resolve 'net'/,
    ],
    module: {
        rules: [
            {
                test: /src\/index\.js$/, // Target the frontend's index.js
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            },
            {
                test: /src\/(logger|configManager|routes|services|exchangeServices|technicalIndicators)\.js$/,
                include: path.resolve(__dirname, 'src'),
                use: 'null-loader'
            }
        ]
    },
    resolve: {
        fallback: {
            "zlib": false,
            "querystring": false,
            "path": false,
            "crypto": false,
            "fs": false,
            "stream": false,
            "http": false,
            "net": false,
            "tls": false,
            "url": false,
            "assert": false
        }
    }
};