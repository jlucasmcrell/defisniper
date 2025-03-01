import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import TradeHistory from './components/TradeHistory';
import Logs from './components/Logs';

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [botRunning, setBotRunning] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Fetch initial bot status from backend
    const fetchBotStatus = async () => {
      try {
        const response = await fetch('/api/bot/status');
        if (response.ok) {
          const data = await response.json();
          setBotRunning(data.running);
        } else {
          console.error('Failed to fetch bot status');
        }
      } catch (error) {
        console.error('Error fetching bot status:', error);
      }
    };

    fetchBotStatus();
  }, []);

  const handleStart = async () => {
    try {
      const response = await fetch('/api/bot/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setBotRunning(true);
      } else {
        console.error('Failed to start bot');
        alert('Failed to start bot');
      }
    } catch (error) {
      console.error('Error starting bot:', error);
      alert('Error starting bot');
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch('/api/bot/stop', {
        method: 'POST',
      });
      if (response.ok) {
        setBotRunning(false);
      } else {
        console.error('Failed to stop bot');
        alert('Failed to stop bot');
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
      alert('Error stopping bot');
    }
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <header className="bg-dark-surface p-4 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">DeFi Sniper</h1>
          <div>
            <button
              onClick={handleStart}
              disabled={botRunning}
              className="bg-status-success hover:bg-status-success/80 text-white font-bold py-2 px-4 rounded mr-2"
            >
              Start Bot
            </button>
            <button
              onClick={handleStop}
              disabled={!botRunning}
              className="bg-status-danger hover:bg-status-danger/80 text-white font-bold py-2 px-4 rounded"
            >
              Stop Bot
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-dark-surface p-4">
        <div className="container mx-auto flex space-x-4">
          <button
            onClick={() => setActiveTab('Dashboard')}
            className={`px-3 py-2 rounded ${activeTab === 'Dashboard' ? 'bg-brand-primary text-dark-bg' : 'hover:bg-dark-bg/50'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('Settings')}
            className={`px-3 py-2 rounded ${activeTab === 'Settings' ? 'bg-brand-primary text-dark-bg' : 'hover:bg-dark-bg/50'}`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('TradeHistory')}
            className={`px-3 py-2 rounded ${activeTab === 'TradeHistory' ? 'bg-brand-primary text-dark-bg' : 'hover:bg-dark-bg/50'}`}
          >
            Trade History
          </button>
          <button
            onClick={() => setActiveTab('Logs')}
            className={`px-3 py-2 rounded ${activeTab === 'Logs' ? 'bg-brand-primary text-dark-bg' : 'hover:bg-dark-bg/50'}`}
          >
            Logs
          </button>
        </div>
      </nav>

      <main className="container mx-auto mt-4 p-4">
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Settings' && <Settings onSettingsChange={handleSettingsChange} />}
        {activeTab === 'TradeHistory' && <TradeHistory />}
        {activeTab === 'Logs' && <Logs />}
      </main>
    </div>
  );
}

export default App;