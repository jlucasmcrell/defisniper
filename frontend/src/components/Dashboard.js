import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [botStatus, setBotStatus] = useState('Stopped');
  const [balance, setBalance] = useState('0.00');
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // TODO: Fetch initial data from backend
    // Example:
    // fetch('/api/dashboard')
    //   .then(response => response.json())
    //   .then(data => {
    //     setBotStatus(data.botStatus);
    //     setBalance(data.balance);
    //     setTrades(data.trades);
    //   });

    // TODO: Set up WebSocket connection for real-time updates
    // Example:
    // const socket = new WebSocket('ws://localhost:8080/ws');
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.type === 'botStatus') {
    //     setBotStatus(data.status);
    //   } else if (data.type === 'balance') {
    //     setBalance(data.balance);
    //   } else if (data.type === 'trade') {
    //     setTrades([...trades, data.trade]);
    //   }
    // };
  }, []);

  return (
    <div className="bg-dark-surface rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Bot Status</h3>
          <p>{botStatus}</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Balance (USDT)</h3>
          <p>{balance}</p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Recent Trades</h3>
        <ul>
          {trades.map((trade, index) => (
            <li key={index}>{/* TODO: Display trade details */}</li>
          ))}
        </ul>
      </div>
      {/* TODO: Add charts and advanced configurable settings */}
    </div>
  );
}

export default Dashboard;