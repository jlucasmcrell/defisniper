// Web3 utilities for settings validation and testing
import Web3 from 'web3';

export const testWeb3Connection = async (provider) => {
    try {
        const web3 = new Web3(provider);
        await web3.eth.getBlockNumber();
        return true;
    } catch (error) {
        throw new Error(`Failed to connect to Web3 provider: ${error.message}`);
    }
};

export const validateNetworkConnection = async (networkId) => {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
    }

    try {
        const currentNetwork = await window.ethereum.request({ 
            method: 'eth_chainId' 
        });
        
        if (parseInt(currentNetwork, 16) !== networkId) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${networkId.toString(16)}` }],
            });
        }
        
        return true;
    } catch (error) {
        throw new Error(`Failed to switch network: ${error.message}`);
    }
};

export const getNetworkName = (networkId) => {
    const networks = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        42: 'Kovan Testnet',
        56: 'Binance Smart Chain',
        137: 'Polygon Mainnet',
        43114: 'Avalanche C-Chain'
    };
    
    return networks[networkId] || 'Unknown Network';
};