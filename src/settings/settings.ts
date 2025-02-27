import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../utils/logger';
import { SecurityManager } from '../security/securityManager';

export class SettingsManager {
    private logger: Logger;
    private securityManager: SecurityManager;
    private settingsPath: string;
    private window: BrowserWindow | null = null;

    constructor(securityManager: SecurityManager) {
        this.logger = new Logger('SettingsManager');
        this.securityManager = securityManager;
        this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
        this.setupIpcListeners();
    }

    public openSettingsWindow() {
        if (this.window) {
            this.window.focus();
            return;
        }

        this.window = new BrowserWindow({
            width: 1000,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        this.window.loadFile(path.join(__dirname, '../renderer/settings.html'));

        this.window.on('closed', () => {
            this.window = null;
        });
    }

    private setupIpcListeners() {
        ipcMain.handle('get-settings', async () => {
            try {
                const settings = this.loadSettings();
                return { success: true, settings };
            } catch (error) {
                this.logger.error('Failed to load settings', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('save-settings', async (event, settings) => {
            try {
                await this.saveSettings(settings);
                return { success: true };
            } catch (error) {
                this.logger.error('Failed to save settings', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('test-connection', async (event, settings) => {
            try {
                // Implement connection testing here
                return { success: true, message: 'Connection successful' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
    }

    private loadSettings(): any {
        try {
            if (!fs.existsSync(this.settingsPath)) {
                return this.getDefaultSettings();
            }

            const encryptedData = fs.readFileSync(this.settingsPath, 'utf8');
            const decryptedData = this.securityManager.decrypt(encryptedData);
            return JSON.parse(decryptedData);
        } catch (error) {
            this.logger.error('Failed to load settings', error);
            return this.getDefaultSettings();
        }
    }

    private async saveSettings(settings: any): Promise<void> {
        try {
            const settingsJson = JSON.stringify(settings, null, 2);
            const encryptedData = this.securityManager.encrypt(settingsJson);
            fs.writeFileSync(this.settingsPath, encryptedData);
            this.logger.info('Settings saved successfully');
        } catch (error) {
            this.logger.error('Failed to save settings', error);
            throw error;
        }
    }

    private getDefaultSettings() {
        return {
            trading: {
                walletBuyPercentage: 5,
                stopLoss: 2.5,
                takeProfit: 5,
                maxConcurrentTrades: 3,
                maxTradesPerHour: 10,
                autoStart: false
            },
            ethereum: {
                enabled: false,
                network: 'mainnet',
                infuraId: '',
                alchemyKey: '',
                privateKey: ''
            },
            bnbChain: {
                enabled: false,
                privateKey: ''
            },
            exchanges: {
                binanceUS: {
                    enabled: false,
                    apiKey: '',
                    apiSecret: ''
                },
                cryptoCom: {
                    enabled: false,
                    apiKey: '',
                    apiSecret: ''
                }
            },
            strategies: {
                tokenSniper: {
                    enabled: false,
                    minLiquidity: 10000,
                    maxBuyTax: 10,
                    maxSellTax: 10,
                    requireAudit: false
                },
                scalping: {
                    enabled: false,
                    minPriceChange: 0.5,
                    maxTradeTime: 300
                },
                trendTrading: {
                    enabled: false,
                    rsiLow: 30,
                    rsiHigh: 70,
                    macdFast: 12,
                    macdSlow: 26,
                    macdSignal: 9
                }
            }
        };
    }
}