import React, { useState } from 'react';
import { Card, Form, Input, Button, Tabs } from '../common';
import { validateApiKey } from '../../utils/validation';

const ExchangeSettings = ({ configs, onSave, onTest, testResults, isSaving }) => {
    const [binanceConfig, setBinanceConfig] = useState(configs.binanceUS || {});
    const [cryptoConfig, setCryptoConfig] = useState(configs.cryptoCom || {});

    const handleBinanceSubmit = async (e) => {
        e.preventDefault();
        await onSave('binance-us', binanceConfig);
    };

    const handleCryptoSubmit = async (e) => {
        e.preventDefault();
        await onSave('crypto-com', cryptoConfig);
    };

    return (
        <div className="exchange-settings">
            <Tabs>
                <Tabs.Tab label="Binance.US">
                    <Card>
                        <h3>Binance.US API Configuration</h3>
                        <Form onSubmit={handleBinanceSubmit}>
                            <Form.Group>
                                <Form.Label>API Key</Form.Label>
                                <Input
                                    type="password"
                                    value={binanceConfig.apiKey || ''}
                                    onChange={(e) => setBinanceConfig({
                                        ...binanceConfig,
                                        apiKey: e.target.value
                                    })}
                                    validate={validateApiKey}
                                />
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>API Secret</Form.Label>
                                <Input
                                    type="password"
                                    value={binanceConfig.apiSecret || ''}
                                    onChange={(e) => setBinanceConfig({
                                        ...binanceConfig,
                                        apiSecret: e.target.value
                                    })}
                                    validate={validateApiKey}
                                />
                            </Form.Group>
                            <div className="button-group">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    loading={isSaving}
                                >
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => onTest('binance-us')}
                                    disabled={isSaving || !binanceConfig.apiKey}
                                    loading={testResults['binance-us']?.testing}
                                >
                                    Test Connection
                                </Button>
                            </div>
                            {testResults['binance-us']?.message && (
                                <div className={`test-result ${testResults['binance-us'].success ? 'success' : 'error'}`}>
                                    {testResults['binance-us'].message}
                                </div>
                            )}
                        </Form>
                    </Card>
                </Tabs.Tab>
                <Tabs.Tab label="Crypto.com">
                    <Card>
                        <h3>Crypto.com API Configuration</h3>
                        <Form onSubmit={handleCryptoSubmit}>
                            <Form.Group>
                                <Form.Label>API Key</Form.Label>
                                <Input
                                    type="password"
                                    value={cryptoConfig.apiKey || ''}
                                    onChange={(e) => setCryptoConfig({
                                        ...cryptoConfig,
                                        apiKey: e.target.value
                                    })}
                                    validate={validateApiKey}
                                />
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>API Secret</Form.Label>
                                <Input
                                    type="password"
                                    value={cryptoConfig.apiSecret || ''}
                                    onChange={(e) => setCryptoConfig({
                                        ...cryptoConfig,
                                        apiSecret: e.target.value
                                    })}
                                    validate={validateApiKey}
                                />
                            </Form.Group>
                            <div className="button-group">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    loading={isSaving}
                                >
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => onTest('crypto-com')}
                                    disabled={isSaving || !cryptoConfig.apiKey}
                                    loading={testResults['crypto-com']?.testing}
                                >
                                    Test Connection
                                </Button>
                            </div>
                            {testResults['crypto-com']?.message && (
                                <div className={`test-result ${testResults['crypto-com'].success ? 'success' : 'error'}`}>
                                    {testResults['crypto-com'].message}
                                </div>
                            )}
                        </Form>
                    </Card>
                </Tabs.Tab>
            </Tabs>
        </div>
    );
};

export default ExchangeSettings;