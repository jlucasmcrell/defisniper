import React, { useState, useEffect } from 'react';
import './SettingsForm.css'; // Correct import path

const SettingsForm = () => {
    const [settings, setSettings] = useState({
        binanceApiKey: '',
        binanceApiSecret: '',
        cryptoComApiKey: '',
        cryptoComApiSecret: '',
        infuraProjectId: '',
        infuraProjectSecret: ''
    });
    const [liveData, setLiveData] = useState({
        binancePrice: null,
        cryptoComPrice: null,
        portfolioBalance: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/settings');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setSettings(data);
            } catch (e) {
                setError('Failed to load settings. Please check your network connection and try again.');
                console.error("Could not fetch settings:", e);
            } finally {
                setLoading(false);
            }
        };

        const fetchLiveData = async () => {
            try {
                const response = await fetch('/live-data');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLiveData(data);
            } catch (e) {
                setError('Failed to load live data. Please check your network connection and try again.');
                console.error("Could not fetch live data:", e);
            }
        };

        fetchSettings();
        fetchLiveData(); // Fetch live data on component mount

        // Set up interval to fetch live data every 5 seconds
        const intervalId = setInterval(fetchLiveData, 5000);

        return () => clearInterval(intervalId); // Clean up interval on unmount
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            alert('Settings saved successfully!');
        } catch (e) {
            setError('Failed to save settings. Please check your network connection and try again.');
            console.error("Could not save settings:", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="settings-form">Loading settings...</div>;
    }

    if (error) {
        return <div className="settings-form">Error: {error}</div>;
    }

    return (
        <div className="settings-form">
            <h2>Trading Bot Settings</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="binanceApiKey">Binance API Key:</label>
                    <input
                        type="text"
                        id="binanceApiKey"
                        name="binanceApiKey"
                        value={settings.binanceApiKey || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="binanceApiSecret">Binance API Secret:</label>
                    <input
                        type="password"
                        id="binanceApiSecret"
                        name="binanceApiSecret"
                        value={settings.binanceApiSecret || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="cryptoComApiKey">Crypto.com API Key:</label>
                    <input
                        type="text"
                        id="cryptoComApiKey"
                        name="cryptoComApiKey"
                        value={settings.cryptoComApiKey || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="cryptoComApiSecret">Crypto.com API Secret:</label>
                    <input
                        type="password"
                        id="cryptoComApiSecret"
                        name="cryptoComApiSecret"
                        value={settings.cryptoComApiSecret || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="infuraProjectId">Infura Project ID:</label>
                    <input
                        type="text"
                        id="infuraProjectId"
                        name="infuraProjectId"
                        value={settings.infuraProjectId || ''}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="infuraProjectSecret">Infura Project Secret:</label>
                    <input
                        type="password"
                        id="infuraProjectSecret"
                        name="infuraProjectSecret"
                        value={settings.infuraProjectSecret || ''}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit" className="save-button">Save Settings</button>
            </form>

            {/* Display Live Trading Data */}
            <h2>Live Trading Data</h2>
            {liveData.binancePrice !== null && liveData.cryptoComPrice !== null ? (
                <div>
                    <p>Binance Price: {liveData.binancePrice}</p>
                    <p>Crypto.com Price: {liveData.cryptoComPrice}</p>
                    <p>Portfolio Balance: {liveData.portfolioBalance}</p>
                </div>
            ) : (
                <p>Loading live data...</p>
            )}
        </div>
    );
};

export default SettingsForm;