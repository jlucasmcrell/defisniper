import React, { useState, useEffect } from 'react';

function TradeHistory() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch('/api/trades');
        if (response.ok) {
          const data = await response.json();
          setTrades(data);
        } else {
          console.error('Failed to fetch trades');
        }
      } catch (error) {
        console.error('Error fetching trades:', error);
      }
    };

    fetchTrades();
  }, []);

  return (
    <div className="bg-dark-surface rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">Trade History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-dark-text">{trade.token}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-dark-text">{trade.amount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-dark-text">{trade.price}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-dark-text">{trade.date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-dark-text">{trade.status}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TradeHistory;