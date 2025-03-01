import React, { useState } from 'react';

function Settings() {
  const [tradeSize, setTradeSize] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState('');
  const [takeProfitPercentage, setTakeProfitPercentage] = useState('');
  const [gasFee, setGasFee] = useState('');
  const [walletBuyPercentage, setWalletBuyPercentage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeSize,
          slippageTolerance,
          stopLossPercentage,
          takeProfitPercentage,
          gasFee,
          walletBuyPercentage,
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('An error occurred while saving settings.');
    }
  };

  return (
    <div className="bg-dark-surface rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tradeSize" className="block text-sm font-medium text-dark-text-secondary">Trade Size (USDT)</label>
          <input
            type="text"
            id="tradeSize"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={tradeSize}
            onChange={(e) => setTradeSize(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="slippageTolerance" className="block text-sm font-medium text-dark-text-secondary">Slippage Tolerance (%)</label>
          <input
            type="text"
            id="slippageTolerance"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={slippageTolerance}
            onChange={(e) => setSlippageTolerance(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="stopLossPercentage" className="block text-sm font-medium text-dark-text-secondary">Stop Loss (%)</label>
          <input
            type="text"
            id="stopLossPercentage"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={stopLossPercentage}
            onChange={(e) => setStopLossPercentage(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="takeProfitPercentage" className="block text-sm font-medium text-dark-text-secondary">Take Profit (%)</label>
          <input
            type="text"
            id="takeProfitPercentage"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={takeProfitPercentage}
            onChange={(e) => setTakeProfitPercentage(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="gasFee" className="block text-sm font-medium text-dark-text-secondary">Gas Fee (Gwei)</label>
          <input
            type="text"
            id="gasFee"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={gasFee}
            onChange={(e) => setGasFee(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="walletBuyPercentage" className="block text-sm font-medium text-dark-text-secondary">Wallet Buy Percentage (%)</label>
          <input
            type="text"
            id="walletBuyPercentage"
            className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-brand-primary focus:ring-brand-primary bg-dark-bg text-dark-text"
            value={walletBuyPercentage}
            onChange={(e) => setWalletBuyPercentage(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="bg-brand-primary hover:bg-brand-primary/80 text-dark-bg font-bold py-2 px-4 rounded"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}

export default Settings;