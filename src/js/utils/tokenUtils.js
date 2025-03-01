/**
 * Token Utilities for CryptoSniperBot
 * Handles token validation, analysis, and scoring
 */
const { ethers } = require('ethers');
const { Logger } = require('./logger');
const IERC20 = require('../contracts/IERC20.json');

class TokenUtils {
    constructor() {
        this.logger = new Logger('TokenUtils');
    }

    static async validateToken(tokenAddress, provider) {
        try {
            if (!ethers.utils.isAddress(tokenAddress)) {
                throw new Error('Invalid token address');
            }

            const tokenContract = new ethers.Contract(
                tokenAddress,
                IERC20.abi,
                provider
            );

            const [name, symbol, decimals, totalSupply] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
                tokenContract.decimals(),
                tokenContract.totalSupply()
            ]);

            return {
                isValid: true,
                details: {
                    address: tokenAddress,
                    name,
                    symbol,
                    decimals: decimals.toNumber(),
                    totalSupply: totalSupply.toString()
                }
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    static async getTokenBalance(tokenAddress, walletAddress, provider) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                IERC20.abi,
                provider
            );

            const balance = await tokenContract.balanceOf(walletAddress);
            const decimals = await tokenContract.decimals();

            return {
                raw: balance.toString(),
                formatted: ethers.utils.formatUnits(balance, decimals)
            };
        } catch (error) {
            throw new Error(`Failed to get token balance: ${error.message}`);
        }
    }

    static async checkTokenApproval(tokenAddress, owner, spender, provider) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                IERC20.abi,
                provider
            );

            const allowance = await tokenContract.allowance(owner, spender);
            return allowance.gt(0);
        } catch (error) {
            throw new Error(`Failed to check token approval: ${error.message}`);
        }
    }

    static async approveToken(tokenAddress, spender, amount, signer) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                IERC20.abi,
                signer
            );

            const tx = await tokenContract.approve(spender, amount);
            return await tx.wait();
        } catch (error) {
            throw new Error(`Failed to approve token: ${error.message}`);
        }
    }

    static calculateTokenScore(tokenInfo) {
        try {
            let score = 0;
            const weights = {
                liquidity: 0.3,
                holders: 0.2,
                age: 0.15,
                transactions: 0.15,
                marketCap: 0.2
            };

            // Normalize and weight each metric
            if (tokenInfo.liquidity) {
                score += this.normalizeMetric(tokenInfo.liquidity, 1000, 1000000) * weights.liquidity;
            }

            if (tokenInfo.holders) {
                score += this.normalizeMetric(tokenInfo.holders, 100, 10000) * weights.holders;
            }

            if (tokenInfo.age) {
                score += this.normalizeMetric(tokenInfo.age, 7, 365) * weights.age;
            }

            if (tokenInfo.transactions) {
                score += this.normalizeMetric(tokenInfo.transactions, 100, 10000) * weights.transactions;
            }

            if (tokenInfo.marketCap) {
                score += this.normalizeMetric(tokenInfo.marketCap, 100000, 10000000) * weights.marketCap;
            }

            return Math.min(Math.max(score * 100, 0), 100);
        } catch (error) {
            console.error('Error calculating token score:', error);
            return 0;
        }
    }

    static normalizeMetric(value, min, max) {
        try {
            if (value < min) return 0;
            if (value > max) return 1;
            return (value - min) / (max - min);
        } catch (error) {
            console.error('Error normalizing metric:', error);
            return 0;
        }
    }

    static isHoneypot(tokenInfo) {
        try {
            const redFlags = [
                !tokenInfo.canSell,
                tokenInfo.sellTax > 25,
                tokenInfo.buyTax > 25,
                tokenInfo.holderCount < 50,
                tokenInfo.ownerBalance > (tokenInfo.totalSupply * 0.5)
            ];

            return redFlags.some(flag => flag === true);
        } catch (error) {
            console.error('Error checking honeypot:', error);
            return true; // Assume it's a honeypot if we can't verify
        }
    }

    static calculateRiskLevel(tokenInfo) {
        try {
            let riskScore = 0;
            const riskFactors = {
                lowLiquidity: tokenInfo.liquidity < 50000 ? 2 : 0,
                highTaxes: (tokenInfo.buyTax + tokenInfo.sellTax) > 20 ? 2 : 0,
                ownershipConcentration: tokenInfo.ownerBalance > (tokenInfo.totalSupply * 0.3) ? 2 : 0,
                newToken: tokenInfo.age < 7 ? 1 : 0,
                lowHolders: tokenInfo.holderCount < 100 ? 1 : 0
            };

            riskScore = Object.values(riskFactors).reduce((acc, val) => acc + val, 0);

            return {
                level: riskScore <= 2 ? 'LOW' : riskScore <= 4 ? 'MEDIUM' : 'HIGH',
                score: riskScore
            };
        } catch (error) {
            console.error('Error calculating risk level:', error);
            return { level: 'HIGH', score: 10 };
        }
    }

    static validateTokenContract(bytecode) {
        try {
            // Common malicious patterns
            const maliciousPatterns = [
                '0x23b872dd', // transferFrom without approval
                '0x095ea7b3', // approve without conditions
                '0x42842e0e'  // safeTransferFrom without checks
            ];

            return !maliciousPatterns.some(pattern => 
                bytecode.toLowerCase().includes(pattern.slice(2).toLowerCase())
            );
        } catch (error) {
            console.error('Error validating token contract:', error);
            return false;
        }
    }
}

module.exports = { TokenUtils };