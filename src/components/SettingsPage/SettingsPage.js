// Settings page component for API and configuration management
import React, { useState, useEffect } from 'react';
import { secureConfig } from '../../js/secure-config/manager';
import { events } from '../../js/events';
import { notifications } from '../../js/notifications';
import ExchangeSettings from './ExchangeSettings';
import WalletSettings from './WalletSettings';
import InfuraSettings from './InfuraSettings';
import SecuritySettings from './SecuritySettings';

export const SettingsPage = () => {
    const [configs, setConfigs] = useState({});
    const [activeTab, setActiveTab] = useState('exchanges');
    const [isSaving, setSaving] = useState(false);
    const [testResults, setTestResults] = useState({});

    useEffect(() => {
        loadConfigurations();
        const unsubscribe = events.subscribe('config:change', handleConfigChange);
        return () => unsubscribe();
    }, []);

    const loadConfigurations = async () => {
        try {
            const allConfigs = secureConfig.getAllConfigs();
            setConfigs(allConfigs);
        } catch (error) {
            notifications.show({
                type: 'error',
                message: 'Failed to load configurations'
            });
        }
    };

    const handleConfigChange = ({ provider, config }) => {
        setConfigs(prev => ({
            ...prev,
            [provider]: config
        }));
    };

    const handleSave = async (provider, config) => {
        setSaving(true);
        try {
            await secureConfig.saveConfig(provider, config);
            notifications.show({
                type: 'success',
                message: `${provider} configuration saved successfully`
            });
            await loadConfigurations();
        } catch (error) {
            notifications.show({
                type: 'error',
                message: `Failed to save ${provider} configuration: ${error.message}`
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (provider) => {
        try {
            setTestResults(prev => ({
                ...prev,
                [provider]: { testing: true }
            }));
            
            const result = await secureConfig.testConnection(provider);
            
            setTestResults(prev => ({
                ...prev,
                [provider]: { success: true, message: 'Connection successful' }
            }));
            
            notifications.show({
                type: 'success',
                message: `${provider} connection test successful`
            });
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                [provider]: { success: false, message: error.message }
            }));
            
            notifications.show({
                type: 'error',
                message: `${provider} connection test failed: ${error.message}`
            });
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'exchanges':
                return (
                    <>
                        <ExchangeSettings
                            configs={{
                                binanceUS: configs['binance-us'],
                                cryptoCom: configs['crypto-com']
                            }}
                            onSave={handleSave}
                            onTest={handleTest}
                            testResults={testResults}
                            isSaving={isSaving}
                        />
                    </>
                );
            case 'wallets':
                return (
                    <WalletSettings
                        config={configs['metamask']}
                        onSave={handleSave}
                        onTest={handleTest}
                        testResults={testResults}
                        isSaving={isSaving}
                    />
                );
            case 'infura':
                return (
                    <InfuraSettings
                        config={configs['infura']}
                        onSave={handleSave}
                        onTest={handleTest}
                        testResults={testResults}
                        isSaving={isSaving}
                    />
                );
            case 'security':
                return (
                    <SecuritySettings
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
                <div className="settings-tabs">
                    <button
                        className={activeTab === 'exchanges' ? 'active' : ''}
                        onClick={() => setActiveTab('exchanges')}
                    >
                        Exchanges
                    </button>
                    <button
                        className={activeTab === 'wallets' ? 'active' : ''}
                        onClick={() => setActiveTab('wallets')}
                    >
                        Wallets
                    </button>
                    <button
                        className={activeTab === 'infura' ? 'active' : ''}
                        onClick={() => setActiveTab('infura')}
                    >
                        Infura
                    </button>
                    <button
                        className={activeTab === 'security' ? 'active' : ''}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                </div>
            </div>
            <div className="settings-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsPage;