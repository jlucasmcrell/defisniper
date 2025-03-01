import React, { useState } from 'react';
import { Card, Form, Input, Button, Select } from '../common';
import { validateInfuraProjectId } from '../../utils/validation';

const InfuraSettings = ({ config, onSave, onTest, testResults, isSaving }) => {
    const [infuraConfig, setInfuraConfig] = useState(config || {});

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave('infura', infuraConfig);
    };

    const networks = [
        { value: 'mainnet', label: 'Ethereum Mainnet' },
        { value: 'ropsten', label: 'Ropsten Testnet' },
        { value: 'rinkeby', label: 'Rinkeby Testnet' },
        { value: 'kovan', label: 'Kovan Testnet' }
    ];

    return (
        <div className="infura-settings">
            <Card>
                <h3>Infura Configuration</h3>
                <Form onSubmit={handleSubmit}>
                    <Form.Group>
                        <Form.Label>Project ID</Form.Label>
                        <Input
                            type="password"
                            value={infuraConfig.projectId || ''}
                            onChange={(e) => setInfuraConfig({
                                ...infuraConfig,
                                projectId: e.target.value
                            })}
                            validate={validateInfuraProjectId}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Project Secret</Form.Label>
                        <Input
                            type="password"
                            value={infuraConfig.projectSecret || ''}
                            onChange={(e) => setInfuraConfig({
                                ...infuraConfig,
                                projectSecret: e.target.value
                            })}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Default Network</Form.Label>
                        <Select
                            options={networks}
                            value={networks.find(n => n.value === infuraConfig.defaultNetwork)}
                            onChange={(option) => setInfuraConfig({
                                ...infuraConfig,
                                defaultNetwork: option.value
                            })}
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
                            onClick={() => onTest('infura')}
                            disabled={isSaving || !infuraConfig.projectId}
                            loading={testResults['infura']?.testing}
                        >
                            Test Connection
                        </Button>
                    </div>
                    {testResults['infura']?.message && (
                        <div className={`test-result ${testResults['infura'].success ? 'success' : 'error'}`}>
                            {testResults['infura'].message}
                        </div>
                    )}
                </Form>
            </Card>
        </div>
    );
};

export default InfuraSettings;