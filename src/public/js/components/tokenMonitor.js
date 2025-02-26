/**
 * Token Monitor UI Component
 */
class TokenMonitorUI {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.container = document.getElementById('tokenMonitor');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.dashboard.socket.on('monitoringUpdate', (data) => {
            this.updateDisplay(data);
        });
    }

    updateDisplay(data) {
        if (!this.container) return;

        let html = `
            <div class="row">
                <div class="col-12">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Trading Assets & Monitored Tokens</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <!-- Base Assets -->
                                <div class="col-md-4">
                                    <h6>Available Trading Assets</h6>
                                    ${this.renderBaseAssets(data.baseAssets)}
                                </div>
                                
                                <!-- Monitored Tokens -->
                                <div class="col-md-4">
                                    <h6>Monitored Tokens</h6>
                                    ${this.renderMonitoredTokens(data.tokens)}
                                </div>
                                
                                <!-- Active Trading Pairs -->
                                <div class="col-md-4">
                                    <h6>Active Trading Pairs</h6>
                                    ${this.renderTradingPairs(data.pairs)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    renderBaseAssets(baseAssets) {
        let html = '<div class="list-group">';
        
        for (const [network, assets] of Object.entries(baseAssets)) {
            html += `
                <div class="list-group-item">
                    <h6 class="mb-1">${network}</h6>
                    <div class="table-responsive">
                        <table class="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Balance</th>
                                    <th>Min</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            for (const [symbol, details] of Object.entries(assets)) {
                html += `
                    <tr>
                        <td>${symbol}</td>
                        <td>${Number(details.balance).toFixed(6)}</td>
                        <td>${Number(details.minBalance).toFixed(6)}</td>
                    </tr>
                `;
            }

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    renderMonitoredTokens(tokens) {
        if (!tokens.length) {
            return '<div class="alert alert-info">No tokens currently being monitored</div>';
        }

        return `
            <div class="list-group">
                ${tokens.map(token => `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${token.symbol}</h6>
                            <small>${token.network}</small>
                        </div>
                        <p class="mb-1 small text-truncate">${token.address}</p>
                        <small>Pairs: ${token.pairs.length}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTradingPairs(pairs) {
        if (!pairs.length) {
            return '<div class="alert alert-info">No active trading pairs</div>';
        }

        return `
            <div class="list-group">
                ${pairs.map(pair => `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${pair.token.symbol}/${pair.baseAsset}</h6>
                            <small>${pair.network}</small>
                        </div>
                        <p class="mb-1 small">
                            Available: ${Number(pair.baseAssetBalance).toFixed(6)} ${pair.baseAsset}
                        </p>
                        <small>Max Allocation: ${pair.maxAllocation}%</small>
                    </div>
                `).join('')}
            </div>
        `;
    }
}