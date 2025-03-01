import React, { useEffect, useState } from 'react';

const SettingsForm = () => {
  const [config, setConfig] = useState({
    binanceUS: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    cryptoCom: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    infura: { projectId: "", projectSecret: "" },
    phantom: { privateKey: "" },
    tradeParameters: {
      maxPercentage: "",
      stopLoss: "",
      takeProfit: "",
      slippageTolerance: "",
      gasFees: "",
      tradeSize: "",
      walletBuyPercentage: "",
      executionDelay: "",
      rsiOverboughtThreshold: "",
      rsiOversoldThreshold: ""
    },
    monitoring: {
      popularPairs: ["BTC/USDT", "ETH/USDT", "ADA/USDT", "DOGE/USDT"],
      uniswapPairs: ["USDT/ETH"]
    }
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
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

  const handleMonitoringChange = (section, index, value) => {
    setConfig(prevConfig => {
      let updatedArray = [...prevConfig.monitoring[section]];
      updatedArray[index] = value;
      return {
        ...prevConfig,
        monitoring: {
          ...prevConfig.monitoring,
          [section]: updatedArray
        }
      };
    });
  };

  const handleAddMonitoringPair = (section) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      monitoring: {
        ...prevConfig.monitoring,
        [section]: [...prevConfig.monitoring[section], ""]
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
          <p className="mt-1 text-gray-400">Base Currency: USDT</p>
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
          <p className="mt-1 text-gray-400">Base Currency: USDT</p>
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
          <p className="mt-1 text-gray-400">Phantom wallet will be used for Uniswap trades (USDT/ETH).</p>
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
          <p className="mt-1 text-gray-400">
            Maximum percentage of your wallet funds to use per trade (e.g., "2" for 2%).
          </p>
          <label className="block mt-2">
            Stop Loss:
            <input 
              type="text"
              value={config.tradeParameters.stopLoss}
              onChange={(e) => handleTradeParamChange('stopLoss', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            Percentage loss threshold to exit a trade (e.g., "1.5" for 1.5%).
          </p>
          <label className="block mt-2">
            Take Profit:
            <input 
              type="text"
              value={config.tradeParameters.takeProfit}
              onChange={(e) => handleTradeParamChange('takeProfit', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            Target profit percentage at which to close a trade (e.g., "3" for 3%).
          </p>
          <label className="block mt-2">
            Slippage Tolerance:
            <input 
              type="text"
              value={config.tradeParameters.slippageTolerance}
              onChange={(e) => handleTradeParamChange('slippageTolerance', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            Acceptable deviation from the expected price during execution (percentage value).
          </p>
          <label className="block mt-2">
            Gas Fees:
            <input 
              type="text"
              value={config.tradeParameters.gasFees}
              onChange={(e) => handleTradeParamChange('gasFees', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            Gas fee amount to spend on transactions (in ETH, e.g., "0.001").
          </p>
          <label className="block mt-2">
            Trade Size:
            <input 
              type="text"
              value={config.tradeParameters.tradeSize}
              onChange={(e) => handleTradeParamChange('tradeSize', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            The monetary value (in USDT) allocated per trade.
          </p>
          <label className="block mt-2">
            Wallet Buy Percentage:
            <input 
              type="text"
              value={config.tradeParameters.walletBuyPercentage}
              onChange={(e) => handleTradeParamChange('walletBuyPercentage', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            The percentage of your wallet balance to use when buying (e.g., "5" for 5%).
          </p>
          <label className="block mt-2">
            Execution Delay:
            <input 
              type="text"
              value={config.tradeParameters.executionDelay}
              onChange={(e) => handleTradeParamChange('executionDelay', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            Delay in seconds before order execution (optional).
          </p>
          <label className="block mt-2">
            RSI Overbought Threshold:
            <input 
              type="text"
              value={config.tradeParameters.rsiOverboughtThreshold}
              onChange={(e) => handleTradeParamChange('rsiOverboughtThreshold', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            RSI value above which the asset is considered overbought (typically 70).
          </p>
          <label className="block mt-2">
            RSI Oversold Threshold:
            <input 
              type="text"
              value={config.tradeParameters.rsiOversoldThreshold}
              onChange={(e) => handleTradeParamChange('rsiOversoldThreshold', e.target.value)}
              className="w-full p-2 bg-gray-800 text-white mt-1"
            />
          </label>
          <p className="mt-1 text-gray-400">
            RSI value below which the asset is considered oversold (typically 30).
          </p>
        </div>

        {/* Monitoring Settings: Popular Pairs */}
        <div>
          <h3 className="text-xl font-semibold">Monitoring - Popular Pairs</h3>
          {config.monitoring.popularPairs.map((pair, index) => (
            <label className="block mt-2" key={`popular-${index}`}>
              Pair {index + 1}:
              <input 
                type="text"
                value={pair}
                onChange={(e) => handleMonitoringChange('popularPairs', index, e.target.value)}
                className="w-full p-2 bg-gray-800 text-white mt-1"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => handleAddMonitoringPair('popularPairs')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-2"
          >
            Add Popular Pair
          </button>
        </div>

        {/* Monitoring Settings: Uniswap Pairs */}
        <div>
          <h3 className="text-xl font-semibold">Monitoring - Uniswap Pairs</h3>
          {config.monitoring.uniswapPairs.map((pair, index) => (
            <label className="block mt-2" key={`uniswap-${index}`}>
              Pair {index + 1}:
              <input 
                type="text"
                value={pair}
                onChange={(e) => handleMonitoringChange('uniswapPairs', index, e.target.value)}
                className="w-full p-2 bg-gray-800 text-white mt-1"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => handleAddMonitoringPair('uniswapPairs')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-2"
          >
            Add Uniswap Pair
          </button>
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