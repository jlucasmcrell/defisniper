import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Select, Button } from '../common';
import { validateAddress } from '../../utils/validation';

const WalletSettings = ({ config, onSave, onTest, testResults, isSaving }) => {
    const [walletConfig, setWalletConfig] = useState(config || {});
    const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

    useEffect(() => {
        checkMetaMaskInstallation();
    }, []);

    const checkMetaMaskInstallation = async () => {
        if (typeof window.ethereum !== 'undefined') {
            setIsMetaMaskInstalled(true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave('metamask', walletConfig);
    };

    const networks = [
        { value: 1, label: 'Ethereum Mainnet' },
        { value: 137, label: 'Polygon' },
        { value: 56, label: 'Binance Smart Chain' },
        { value: 43114, label: 'Avalanche' }
    ];

    return (
        <div className="wallet-settings">
            <Card>
                <h3>MetaMask Configuration</h3>
                {!isMetaMaskInstalled ? (
                    <div className="metamask-warning">
                        <p>MetaMask is not installed. Please install MetaMask to use this feature.</p>
                        <Button
                            href="https://metamask.io"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Install MetaMask
                        </Button>
                    </div>
                ) : (
                    <Form onSubmit={handleSubmit}>
                        <Form.Group>
                            <Form.Label>Enable MetaMask Integration</Form.Label>
                            <Switch
                                checked={walletConfig.enabled || false}
                                onChange={(checked) => setWalletConfig({
                                    ...walletConfig,
                                    enabled: checked
                                })}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Default Network</Form.Label>
                            <Select
                                options={networks}
                                value={networks.find(n => n.value === walletConfig.networkId)}
                                onChange={(option) => setWalletConfig({
                                    ...walletConfig,
                                    networkId: option.value
                                })}
                                isDisabled={!walletConfig.enabled}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Default Address (Optional)</Form.Label>
                            <Input
                                value={walletConfig.defaultAddress || ''}
                                onChange={(e) => setWalletConfig({
                                    ...walletConfig,
                                    defaultAddress: e.target.value
                                })}
                                validate={validateAddress}
                                disabled={!walletConfig.enabled}
                            />
                        </Form.Group>
                        <div className="button-group">
                            <Button
                                type="submit"
                                disabled={isSaving || !walletConfig.enabled}
                                loading={isSaving}
                            >
                                Save
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onTest('metamask')}
                                disabled={isSaving || !walletConfig.enabled}
                                loading={testResults['metamask']?.testing}
                            >
                                Test Connection
                            </Button>
                        </div>
                        {testResults['metamask']?.message && (
                            <div className={`test-result ${testResults['metamask'].success ? 'success' : 'error'}`}>
                                {testResults['metamask'].message}
                            </div>
                        )}
                    </Form>
                )}
            </Card>
        </div>
    );
};

export default WalletSettings;