import React, { useState, useEffect, useRef } from 'react';

function Logs() {
  const [logs, setLogs] = useState([]);
  const logsContainerRef = useRef(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/logs');

    socket.onmessage = (event) => {
      const message = event.data;
      setLogs((prevLogs) => [...prevLogs, message]);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the logs container when new logs are added
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-dark-surface rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-4">Live Logs</h2>
      <div
        ref={logsContainerRef}
        className="h-64 overflow-y-scroll bg-dark-bg p-2 rounded-md"
      >
        {logs.map((log, index) => (
          <div key={index} className="text-sm text-dark-text">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Logs;