import React, { useEffect, useState } from 'react';

const SettingsForm = () => {
  const [config, setConfig] = useState({
    binanceUS: { apiKey: "", secretKey: "" },
    cryptoCom: { apiKey: "", secretKey: "" },
    infura: { projectId: "", projectSecret: "" },
    phantom: { privateKey: "" },
    tradeParameters: {
      maxPercentage: "",
      stopLoss: "",
      takeProfit: "",
      slippageTolerance: "",
      gasFees: "",
      tradeSize: "",
      walletBuyPercentage: ""
    }
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Fetch existing configuration from the backend
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error(err));
  }, []);

  const handleChange = (section, field, value) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      [section]: {
        ...prevConfig[section],
        [field]: value
      }
    }));
  };

  const handleTradeParamChange = (field, value) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      tradeParameters: {
        ...prevConfig.tradeParameters,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("Configuration updated successfully.");
        } else {
          setStatus("Failed to update configuration.");
        }
      })
      .catch(err => {
        console.error(err);
        setStatus("Error updating configuration.");
      });
  };

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold">Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        {/* Binance.US Settings */}
        <div>
          <h3 className="text-xl font-semibold">Binance.US</h3>
          <label className="block">
            API Key:
            <input 
              type="text"
              value={config.binanceUS.apiKey}
              onChange={(e) => handleChange('binanceUS', 'apiKey', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Secret Key:
            <input 
              type="text"
              value={config.binanceUS.secretKey}
              onChange={(e) => handleChange('binanceUS', 'secretKey', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
        </div>

        {/* Crypto.com Settings */}
        <div>
          <h3 className="text-xl font-semibold">Crypto.com</h3>
          <label className="block">
            API Key:
            <input 
              type="text"
              value={config.cryptoCom.apiKey}
              onChange={(e) => handleChange('cryptoCom', 'apiKey', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Secret Key:
            <input 
              type="text"
              value={config.cryptoCom.secretKey}
              onChange={(e) => handleChange('cryptoCom', 'secretKey', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
        </div>

        {/* Infura Settings */}
        <div>
          <h3 className="text-xl font-semibold">Infura</h3>
          <label className="block">
            Project ID:
            <input 
              type="text"
              value={config.infura.projectId}
              onChange={(e) => handleChange('infura', 'projectId', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Project Secret:
            <input 
              type="text"
              value={config.infura.projectSecret}
              onChange={(e) => handleChange('infura', 'projectSecret', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
        </div>

        {/* Phantom Wallet Settings */}
        <div>
          <h3 className="text-xl font-semibold">Phantom Wallet</h3>
          <label className="block">
            Private Key:
            <input 
              type="text"
              value={config.phantom.privateKey}
              onChange={(e) => handleChange('phantom', 'privateKey', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
        </div>

        {/* Trade Parameters Settings */}
        <div>
          <h3 className="text-xl font-semibold">Trade Parameters</h3>
          <label className="block">
            Max Percentage:
            <input 
              type="text"
              value={config.tradeParameters.maxPercentage}
              onChange={(e) => handleTradeParamChange('maxPercentage', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Stop Loss:
            <input 
              type="text"
              value={config.tradeParameters.stopLoss}
              onChange={(e) => handleTradeParamChange('stopLoss', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Take Profit:
            <input 
              type="text"
              value={config.tradeParameters.takeProfit}
              onChange={(e) => handleTradeParamChange('takeProfit', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Slippage Tolerance:
            <input 
              type="text"
              value={config.tradeParameters.slippageTolerance}
              onChange={(e) => handleTradeParamChange('slippageTolerance', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Gas Fees:
            <input 
              type="text"
              value={config.tradeParameters.gasFees}
              onChange={(e) => handleTradeParamChange('gasFees', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Trade Size:
            <input 
              type="text"
              value={config.tradeParameters.tradeSize}
              onChange={(e) => handleTradeParamChange('tradeSize', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <label className="block mt-2">
            Wallet Buy Percentage:
            <input 
              type="text"
              value={config.tradeParameters.walletBuyPercentage}
              onChange={(e) => handleTradeParamChange('walletBuyPercentage', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
        </div>

        <button 
          type="submit" 
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4"
        >
          Save Settings
        </button>
        {status && <p className="mt-2">{status}</p>}
      </form>
    </div>
  );
};

export default SettingsForm;