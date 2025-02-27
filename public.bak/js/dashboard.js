/**
 * CryptoSniperBot Dashboard
 * 
 * Main JavaScript file for the dashboard UI. Handles real-time updates,
 * chart rendering, user interactions, and communicating with the server API.
 */

// Global socket connection
let socket;

// Global chart references
let balanceChart;
let profitChart;

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication status
  checkAuthStatus();
  
  // Initialize UI components
  initializeUI();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Check if the user is authenticated
 */
async function checkAuthStatus() {
  try {
    const response = await fetch('/auth/status');
    const data = await response.json();
    
    if (!data.authenticated) {
      // Show login form if not authenticated
      showLoginForm();
    } else {
      // Connect to socket if authenticated
      connectSocket();
      
      // Load initial data
      loadDashboard();
    }
    
    // Check if bot is configured
    if (!data.configured) {
      showConfigurationAlert();
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
  }
}

/**
 * Show login form
 */
function showLoginForm() {
  document.getElementById('login-container').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
}

/**
 * Show configuration alert
 */
function showConfigurationAlert() {
  const alertElement = document.getElementById('config-alert');
  if (alertElement) {
    alertElement.classList.remove('hidden');
  }
}

/**
 * Initialize UI components
 */
function initializeUI() {
  // Initialize charts
  initializeCharts();
  
  // Initialize tabs
  const tabs = document.querySelectorAll('[data-tab-target]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tabTarget;
      activateTab(target);
    });
  });
}

/**
 * Initialize charts
 */
function initializeCharts() {
  // Balance Chart
  const balanceCtx = document.getElementById('balance-chart').getContext('2d');
  balanceChart = new Chart(balanceCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Balance',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        borderColor: 'rgba(45, 212, 191, 1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        data: []
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
  
  // Profit Chart
  const profitCtx = document.getElementById('profit-chart').getContext('2d');
  profitChart = new Chart(profitCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Profit/Loss',
        backgroundColor: function(context) {
          const value = context.dataset.data[context.dataIndex];
          return value >= 0 ? 'rgba(45, 212, 191, 0.7)' : 'rgba(244, 63, 94, 0.7)';
        },
        borderColor: function(context) {
          const value = context.dataset.data[context.dataIndex];
          return value >= 0 ? 'rgba(45, 212, 191, 1)' : 'rgba(244, 63, 94, 1)';
        },
        borderWidth: 1,
        data: []
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
            }
          }
        }
      }
    }
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Login form submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Hide login form
          document.getElementById('login-container').classList.add('hidden');
          document.getElementById('main-content').classList.remove('hidden');
          
          // Connect to socket
          connectSocket();
          
          // Load dashboard
          loadDashboard();
        } else {
          // Show error
          document.getElementById('login-error').textContent = 'Invalid password';
        }
      } catch (error) {
        console.error('Login error:', error);
        document.getElementById('login-error').textContent = 'Server error. Please try again.';
      }
    });
  }
  
  // Start/Stop bot button
  const botControlButton = document.getElementById('bot-control');
  if (botControlButton) {
    botControlButton.addEventListener('click', async () => {
      const isRunning = botControlButton.dataset.running === 'true';
      
      try {
        const endpoint = isRunning ? '/api/bot/stop' : '/api/bot/start';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          updateBotStatus(!isRunning);
        }
      } catch (error) {
        console.error(`Failed to ${isRunning ? 'stop' : 'start'} bot:`, error);
      }
    });
  }
  
  // Logout button
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await fetch('/auth/logout', {
          method: 'POST'
        });
        
        // Disconnect socket
        if (socket) {
          socket.disconnect();
        }
        
        // Show login form
        showLoginForm();
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
  
  // Settings form submission
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(settingsForm);
      const settings = {};
      
      for (const [key, value] of formData.entries()) {
        // Convert checkboxes to boolean
        if (value === 'on') {
          settings[key] = true;
        } 
        // Convert numbers
        else if (!isNaN(parseFloat(value)) && isFinite(value)) {
          settings[key] = parseFloat(value);
        }
        // Keep strings as is
        else {
          settings[key] = value;
        }
      }
      
      try {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });
        
        const data = await response.json();
        
        if (data.success) {
          showNotification('Settings saved successfully', 'success');
        } else {
          showNotification('Failed to save settings', 'error');
        }
      } catch (error) {
        console.error('Settings error:', error);
        showNotification('Server error. Please try again.', 'error');
      }
    });
  }
}

/**
 * Connect to Socket.io for real-time updates
 */
function connectSocket() {
  // Close existing connection if any
  if (socket) {
    socket.disconnect();
  }
  
  // Create new connection
  socket = io();
  
  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  // Bot status updates
  socket.on('botStatus', (data) => {
    updateBotStatus(data.running);
    updateBalances(data.balances);
    updateStats(data.stats);
    updateActiveTrades(data.activeTrades);
  });
  
  // New trade events
  socket.on('newTrade', (trade) => {
    // Add to active trades
    addActiveTradeRow(trade);
    
    // Show notification
    showNotification(`New ${trade.action} trade: ${trade.symbol || trade.tokenAddress}`, 'info');
  });
  
  // Trade closed events
  socket.on('tradeClosed', (trade) => {
    // Remove from active trades
    removeActiveTradeRow(trade.id);
    
    // Add to trade history
    addTradeHistoryRow(trade);
    
    // Update profit chart
    updateProfitChart();
    
    // Show notification
    const profitLoss = trade.profitLoss || 0;
    const message = `Trade closed: ${trade.symbol || trade.tokenAddress} (${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%)`;
    const type = profitLoss >= 0 ? 'success' : 'error';
    
    showNotification(message, type);
  });
  
  // Balance updates
  socket.on('balances', (balances) => {
    updateBalances(balances);
  });
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    // Get bot status
    const statusResponse = await fetch('/api/status');
    const statusData = await statusResponse.json();
    
    updateBotStatus(statusData.running);
    
    // Get active trades
    const tradesResponse = await fetch('/api/trades/active');
    const tradesData = await tradesResponse.json();
    
    updateActiveTrades(tradesData);
    
    // Get trade history
    const historyResponse = await fetch('/api/trades/history');
    const historyData = await historyResponse.json();
    
    updateTradeHistory(historyData);
    
    // Get balances
    const balancesResponse = await fetch('/api/balances');
    const balancesData = await balancesResponse.json();
    
    updateBalances(balancesData);
    
    // Get stats
    const statsResponse = await fetch('/api/stats');
    const statsData = await statsResponse.json();
    
    updateStats(statsData);
    
    // Update charts
    updateBalanceChart();
    updateProfitChart();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Update bot status UI
 */
function updateBotStatus(isRunning) {
  const botControlButton = document.getElementById('bot-control');
  const botStatusIndicator = document.getElementById('bot-status-indicator');
  const botStatusText = document.getElementById('bot-status-text');
  
  if (botControlButton) {
    botControlButton.dataset.running = isRunning;
    botControlButton.textContent = isRunning ? 'Stop Bot' : 'Start Bot';
    botControlButton.className = isRunning 
      ? 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
      : 'bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded';
  }
  
  if (botStatusIndicator) {
    botStatusIndicator.className = isRunning
      ? 'w-3 h-3 bg-green-500 rounded-full mr-2'
      : 'w-3 h-3 bg-red-500 rounded-full mr-2';
  }
  
  if (botStatusText) {
    botStatusText.textContent = isRunning ? 'Running' : 'Stopped';
  }
}

/**
 * Update balances display
 */
function updateBalances(balances) {
  if (!balances) return;
  
  const balancesContainer = document.getElementById('balances-container');
  if (!balancesContainer) return;
  
  // Clear existing balances
  balancesContainer.innerHTML = '';
  
  // Total balance calculation
  let totalUsdValue = 0;
  
  // Add each network/exchange balance
  for (const [network, networkBalances] of Object.entries(balances)) {
    // Create network section
    const networkSection = document.createElement('div');
    networkSection.className = 'mb-4';
    
    // Add network heading
    const networkHeading = document.createElement('h3');
    networkHeading.className = 'text-md font-semibold mb-2 text-gray-300';
    networkHeading.textContent = formatNetworkName(network);
    networkSection.appendChild(networkHeading);
    
    // Add balances
    for (const [currency, amount] of Object.entries(networkBalances)) {
      // Skip zero balances
      if (amount <= 0) continue;
      
      const balanceRow = document.createElement('div');
      balanceRow.className = 'flex justify-between items-center py-1';
      
      const currencyName = document.createElement('span');
      currencyName.className = 'text-gray-400';
      currencyName.textContent = currency;
      
      const amountSpan = document.createElement('span');
      amountSpan.className = 'font-mono';
      amountSpan.textContent = formatAmount(amount, currency);
      
      balanceRow.appendChild(currencyName);
      balanceRow.appendChild(amountSpan);
      networkSection.appendChild(balanceRow);
      
      // Add to total USD value estimate
      if (currency === 'USDT' || currency === 'USDC' || currency === 'DAI') {
        totalUsdValue += amount;
      } else if (currency === 'ETH') {
        totalUsdValue += amount * 2000; // Estimate ETH price
      } else if (currency === 'BNB') {
        totalUsdValue += amount * 300; // Estimate BNB price
      } else if (currency === 'BTC') {
        totalUsdValue += amount * 30000; // Estimate BTC price
      }
    }
    
    // Add to container
    balancesContainer.appendChild(networkSection);
  }
  
  // Update total balance
  const totalBalanceElement = document.getElementById('total-balance');
  if (totalBalanceElement) {
    totalBalanceElement.textContent = `$${totalUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  
  // Update balance chart
  updateBalanceChart(totalUsdValue);
}

/**
 * Update trading statistics
 */
function updateStats(stats) {
  if (!stats) return;
  
  // Update win rate
  const winRateElement = document.getElementById('win-rate');
  if (winRateElement) {
    winRateElement.textContent = `${stats.winRate.toFixed(1)}%`;
  }
  
  // Update total trades
  const totalTradesElement = document.getElementById('total-trades');
  if (totalTradesElement) {
    totalTradesElement.textContent = stats.totalTrades.toString();
  }
  
  // Update successful trades
  const successfulTradesElement = document.getElementById('successful-trades');
  if (successfulTradesElement) {
    successfulTradesElement.textContent = stats.successfulTrades.toString();
  }
  
  // Update profit/loss
  const profitLossElement = document.getElementById('profit-loss');
  if (profitLossElement) {
    const profitLoss = stats.profitLoss || 0;
    profitLossElement.textContent = `${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%`;
    profitLossElement.className = profitLoss >= 0 
      ? 'text-xl font-bold text-green-500'
      : 'text-xl font-bold text-red-500';
  }
}

/**
 * Update active trades table
 */
function updateActiveTrades(trades) {
  if (!trades) return;
  
  const tradesTableBody = document.getElementById('active-trades-body');
  if (!tradesTableBody) return;
  
  // Clear existing rows
  tradesTableBody.innerHTML = '';
  
  // Add each trade
  Object.values(trades).forEach(trade => {
    addActiveTradeRow(trade);
  });
  
  // Update active trades count
  const activeTradesCount = document.getElementById('active-trades-count');
  if (activeTradesCount) {
    activeTradesCount.textContent = Object.keys(trades).length.toString();
  }
}

/**
 * Add a row to the active trades table
 */
function addActiveTradeRow(trade) {
  const tradesTableBody = document.getElementById('active-trades-body');
  if (!tradesTableBody) return;
  
  // Check if row already exists
  const existingRow = document.getElementById(`trade-${trade.id}`);
  if (existingRow) {
    // Update existing row
    return;
  }
  
  // Create new row
  const row = document.createElement('tr');
  row.id = `trade-${trade.id}`;
  row.className = 'border-b border-gray-700 hover:bg-gray-800';
  
  // Format time
  const timeCell = document.createElement('td');
  timeCell.className = 'py-3 px-4';
  timeCell.textContent = formatTime(trade.timestamp);
  row.appendChild(timeCell);
  
  // Symbol/token
  const symbolCell = document.createElement('td');
  symbolCell.className = 'py-3 px-4';
  symbolCell.textContent = trade.symbol || formatAddress(trade.tokenAddress);
  row.appendChild(symbolCell);
  
  // Network
  const networkCell = document.createElement('td');
  networkCell.className = 'py-3 px-4';
  networkCell.textContent = formatNetworkName(trade.network);
  row.appendChild(networkCell);
  
  // Strategy
  const strategyCell = document.createElement('td');
  strategyCell.className = 'py-3 px-4';
  strategyCell.textContent = formatStrategyName(trade.strategy);
  row.appendChild(strategyCell);
  
  // Action
  const actionCell = document.createElement('td');
  actionCell.className = 'py-3 px-4';
  const actionSpan = document.createElement('span');
  actionSpan.className = trade.action === 'buy' 
    ? 'bg-green-900 text-green-300 py-1 px-2 rounded text-xs'
    : 'bg-red-900 text-red-300 py-1 px-2 rounded text-xs';
  actionSpan.textContent = trade.action.toUpperCase();
  actionCell.appendChild(actionSpan);
  row.appendChild(actionCell);
  
  // Entry price
  const priceCell = document.createElement('td');
  priceCell.className = 'py-3 px-4 text-right';
  priceCell.textContent = trade.entryPrice ? `$${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '-';
  row.appendChild(priceCell);
  
  // Add row to table
  tradesTableBody.appendChild(row);
}

/**
 * Remove a row from the active trades table
 */
function removeActiveTradeRow(tradeId) {
  const row = document.getElementById(`trade-${tradeId}`);
  if (row) {
    row.remove();
  }
  
  // Update active trades count
  const activeTradesCount = document.getElementById('active-trades-count');
  if (activeTradesCount) {
    const currentCount = parseInt(activeTradesCount.textContent) || 0;
    activeTradesCount.textContent = Math.max(0, currentCount - 1).toString();
  }
}

/**
 * Update trade history table
 */
function updateTradeHistory(trades) {
  if (!trades) return;
  
  const historyTableBody = document.getElementById('trade-history-body');
  if (!historyTableBody) return;
  
  // Clear existing rows
  historyTableBody.innerHTML = '';
  
  // Add each trade
  trades.forEach(trade => {
    addTradeHistoryRow(trade);
  });
}

/**
 * Add a row to the trade history table
 */
function addTradeHistoryRow(trade) {
  const historyTableBody = document.getElementById('trade-history-body');
  if (!historyTableBody) return;
  
  // Create new row
  const row = document.createElement('tr');
  row.className = 'border-b border-gray-700 hover:bg-gray-800';
  
  // Format time
  const timeCell = document.createElement('td');
  timeCell.className = 'py-3 px-4';
  timeCell.textContent = formatTime(trade.timestamp);
  row.appendChild(timeCell);
  
  // Symbol/token
  const symbolCell = document.createElement('td');
  symbolCell.className = 'py-3 px-4';
  symbolCell.textContent = trade.symbol || formatAddress(trade.tokenAddress);
  row.appendChild(symbolCell);
  
  // Network
  const networkCell = document.createElement('td');
  networkCell.className = 'py-3 px-4';
  networkCell.textContent = formatNetworkName(trade.network);
  row.appendChild(networkCell);
  
  // Strategy
  const strategyCell = document.createElement('td');
  strategyCell.className = 'py-3 px-4';
  strategyCell.textContent = formatStrategyName(trade.strategy);
  row.appendChild(strategyCell);
  
  // Entry price
  const entryCell = document.createElement('td');
  entryCell.className = 'py-3 px-4 text-right';
  entryCell.textContent = trade.entryPrice ? `$${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '-';
  row.appendChild(entryCell);
  
  // Exit price
  const exitCell = document.createElement('td');
  exitCell.className = 'py-3 px-4 text-right';
  exitCell.textContent = trade.closePrice ? `$${trade.closePrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '-';
  row.appendChild(exitCell);
  
  // Profit/Loss
  const profitCell = document.createElement('td');
  profitCell.className = 'py-3 px-4 text-right';
  
  if (trade.profitLoss !== undefined) {
    const profitLoss = trade.profitLoss;
    const profitSpan = document.createElement('span');
    profitSpan.className = profitLoss >= 0 ? 'text-green-500' : 'text-red-500';
    profitSpan.textContent = `${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%`;
    profitCell.appendChild(profitSpan);
  } else {
    profitCell.textContent = '-';
  }
  
  row.appendChild(profitCell);
  
  // Add row to table
  historyTableBody.prepend(row); // Add to the top
}

/**
 * Update balance chart
 */
function updateBalanceChart(currentBalance) {
  if (!balanceChart) return;
  
  // Get current data
  const data = balanceChart.data.datasets[0].data;
  const labels = balanceChart.data.labels;
  
  // Add new data point
  if (currentBalance !== undefined) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Only add if changed or first point
    if (data.length === 0 || currentBalance !== data[data.length - 1]) {
      labels.push(timeLabel);
      data.push(currentBalance);
      
      // Keep only last 24 points
      if (labels.length > 24) {
        labels.shift();
        data.shift();
      }
      
      // Update chart
      balanceChart.update();
    }
  }
}

/**
 * Update profit chart
 */
async function updateProfitChart() {
  if (!profitChart) return;
  
  try {
    // Get trade history
    const response = await fetch('/api/trades/history');
    const trades = await response.json();
    
    // Calculate daily profits
    const dailyProfits = {};
    
    trades.forEach(trade => {
      if (trade.status === 'closed' && trade.profitLoss !== undefined) {
        const date = new Date(trade.timestamp);
        const dateStr = date.toLocaleDateString();
        
        if (!dailyProfits[dateStr]) {
          dailyProfits[dateStr] = 0;
        }
        
        dailyProfits[dateStr] += trade.profitLoss;
      }
    });
    
    // Convert to arrays for chart
    const dates = Object.keys(dailyProfits);
    const profits = Object.values(dailyProfits);
    
    // Update chart
    profitChart.data.labels = dates;
    profitChart.data.datasets[0].data = profits;
    profitChart.update();
    
  } catch (error) {
    console.error('Error updating profit chart:', error);
  }
}

/**
 * Activate a tab
 */
function activateTab(tabId) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // Show selected tab content
  const selectedContent = document.getElementById(tabId);
  if (selectedContent) {
    selectedContent.classList.remove('hidden');
  }
  
  // Update tab buttons
  document.querySelectorAll('[data-tab-target]').forEach(tab => {
    if (tab.dataset.tabTarget === tabId) {
      tab.classList.add('bg-gray-800', 'text-white');
      tab.classList.remove('bg-gray-700', 'text-gray-300');
    } else {
      tab.classList.remove('bg-gray-800', 'text-white');
      tab.classList.add('bg-gray-700', 'text-gray-300');
    }
  });
}

/**
 * Show a notification
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 rounded shadow-lg p-4 max-w-md transition-all duration-300 transform translate-x-full';
  
  // Set background color based on type
  switch (type) {
    case 'success':
      notification.classList.add('bg-green-900', 'text-green-100', 'border-l-4', 'border-green-500');
      break;
    case 'error':
      notification.classList.add('bg-red-900', 'text-red-100', 'border-l-4', 'border-red-500');
      break;
    case 'warning':
      notification.classList.add('bg-yellow-900', 'text-yellow-100', 'border-l-4', 'border-yellow-500');
      break;
    default:
      notification.classList.add('bg-blue-900', 'text-blue-100', 'border-l-4', 'border-blue-500');
  }
  
  // Add message
  notification.textContent = message;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Slide in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 10);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    
    // Remove from DOM after animation
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Format a timestamp into a readable time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format a blockchain address
 */
function formatAddress(address) {
  if (!address) return '-';
  return address.slice(0, 6) + '...' + address.slice(-4);
}

/**
 * Format a network name
 */
function formatNetworkName(network) {
  if (!network) return '-';
  
  switch (network) {
    case 'ethereum':
      return 'Ethereum';
    case 'bnbChain':
      return 'BNB Chain';
    case 'binanceUS':
      return 'Binance.US';
    case 'cryptoCom':
      return 'Crypto.com';
    default:
      return network.charAt(0).toUpperCase() + network.slice(1);
  }
}

/**
 * Format a strategy name
 */
function formatStrategyName(strategy) {
  if (!strategy) return '-';
  
  switch (strategy) {
    case 'tokenSniper':
      return 'Token Sniping';
    case 'scalping':
      return 'Scalping';
    case 'trendTrading':
      return 'Trend Trading';
    default:
      return strategy.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }
}

/**
 * Format an amount with currency symbol
 */
function formatAmount(amount, currency) {
  if (amount === undefined || amount === null) return '-';
  
  // Format based on currency
  switch (currency) {
    case 'ETH':
    case 'BNB':
    case 'BTC':
      return amount.toLocaleString(undefined, { maximumFractionDigits: 8 });
    case 'USDT':
    case 'USDC':
    case 'DAI':
      return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    default:
      return amount.toLocaleString();
  }
}
// Updated dashboard.js function to properly handle log events
// Add this to the public/js/dashboard.js file

// Initialize Socket.IO connection with proper error handling
function connectSocket() {
  // Close existing connection if any
  if (socket) {
    socket.disconnect();
  }
  
  // Create new connection with error handling
  socket = io({
    reconnectionAttempts: 5,
    timeout: 10000
  });
  
  // Connection events with detailed logging
  socket.on('connect', () => {
    console.log('Socket connected with ID:', socket.id);
    updateConnectionStatus(true);
    loadDashboard();
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    updateConnectionStatus(false);
    showError(`Connection error: ${error.message}. Please check if the server is running.`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    updateConnectionStatus(false);
  });
  
  // Bot status updates
  socket.on('botStatus', (data) => {
    console.log('Received bot status update:', data);
    updateBotStatus(data.running);
    if (data.balances) updateBalances(data.balances);
    if (data.stats) updateStatistics(data.stats);
    if (data.activeTrades) updateActiveTrades(data.activeTrades);
  });
  
  // Enhanced log handling
  socket.on('log', (logEntry) => {
    console.log('Received log entry:', logEntry);
    addLogEntry(logEntry);
  });
  
  // New trade events with detailed logging
  socket.on('newTrade', (trade) => {
    console.log('New trade received:', trade);
    addActiveTradeRow(trade);
    showNotification(`New ${trade.action} trade: ${trade.symbol || trade.tokenAddress}`, 'info');
  });
  
  // Trade closed events with detailed logging
  socket.on('tradeClosed', (trade) => {
    console.log('Trade closed received:', trade);
    removeActiveTradeRow(trade.id);
    addTradeHistoryRow(trade);
    updateProfitChart();
    
    const profitLoss = trade.profitLoss || 0;
    const message = `Trade closed: ${trade.symbol || trade.tokenAddress} (${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%)`;
    const type = profitLoss >= 0 ? 'success' : 'error';
    
    showNotification(message, type);
  });
  
  // Enhanced balance updates
  socket.on('walletBalances', (balances) => {
    console.log('Received wallet balances:', balances);
    displayWalletBalances(balances);
  });
  
  // Scanner updates
  socket.on('scanProgress', (progress) => {
    console.log('Scan progress received:', progress);
    updateScanProgress(progress);
  });
  
  // New token events
  socket.on('newToken', (token) => {
    console.log('New token detected:', token);
    addNewTokenNotification(token);
  });
}

// Enhanced log display function
function addLogEntry(entry) {
  const timestamp = entry.timestamp || new Date().toISOString();
  const level = entry.level || 'info';
  const message = entry.message || 'No message provided';
  const module = entry.module || 'System';
  
  logBuffer.push({
    timestamp,
    level,
    message,
    module
  });
  
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
  
  updateLogDisplay();
}

// Improved log display rendering
function updateLogDisplay() {
  const selectedLevel = logLevel.value;
  const logOutput = document.getElementById('logOutput');
  
  if (!logOutput) return;
  
  const filteredLogs = logBuffer.filter(entry => 
    selectedLevel === 'all' || entry.level === selectedLevel
  );
  
  // Clear current logs but keep reference
  const wasScrolledToBottom = logOutput.scrollTop + logOutput.clientHeight >= logOutput.scrollHeight - 10;
  
  logOutput.innerHTML = filteredLogs
    .map(entry => {
      const levelClass = `log-${entry.level.toLowerCase()}`;
      const timeStr = new Date(entry.timestamp).toLocaleTimeString();
      return `
        <div class="log-entry ${levelClass}">
          <span class="log-time">[${timeStr}]</span>
          <span class="log-module">[${entry.module}]</span>
          <span class="log-level">[${entry.level.toUpperCase()}]</span>
          <span class="log-message">${entry.message}</span>
        </div>
      `;
    })
    .join('');
  
  // Keep scrolled to bottom if it already was
  if (wasScrolledToBottom) {
    logOutput.scrollTop = logOutput.scrollHeight;
  }
}

// Enhanced error notification
function showError(message) {
  const container = document.getElementById('notificationContainer') || document.body;
  
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg z-50 notification-enter';
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.replace('notification-enter', 'notification-exit');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
  
  // Also add to logs
  addLogEntry({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: message,
    module: 'UI'
  });
}

// Enhanced success notification
function showSuccess(message) {
  const container = document.getElementById('notificationContainer') || document.body;
  
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-800 text-white p-4 rounded-lg shadow-lg z-50 notification-enter';
  notification.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.replace('notification-enter', 'notification-exit');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
  
  // Also add to logs
  addLogEntry({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: message,
    module: 'UI'
  });
}