// Add these methods to the existing Dashboard class

class Dashboard {
    // ... (existing constructor and methods)

    async updateWalletBalances() {
        try {
            const response = await fetch('/api/wallets/balances');
            if (!response.ok) throw new Error('Failed to fetch wallet balances');
            
            const balances = await response.json();
            this.displayWalletBalances(balances);
        } catch (error) {
            console.error('Error updating wallet balances:', error);
            this.showError('Failed to update wallet balances');
        }
    }

    displayWalletBalances(balances) {
        const container = document.getElementById('walletBalances');
        if (!container) return;

        let html = '<div class="row">';
        
        // CEX Wallets
        if (balances.exchanges) {
            Object.entries(balances.exchanges).forEach(([exchange, balance]) => {
                html += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${exchange}</h5>
                                <div class="wallet-balance">
                                    ${Object.entries(balance).map(([asset, amount]) => `
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span>${asset}:</span>
                                            <span>${Number(amount).toFixed(8)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // DEX Wallets
        if (balances.dex) {
            Object.entries(balances.dex).forEach(([network, wallet]) => {
                html += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${network} Wallet</h5>
                                <div class="wallet-balance">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span>Address:</span>
                                        <span class="text-truncate" style="max-width: 150px;" title="${wallet.address}">
                                            ${wallet.address}
                                        </span>
                                    </div>
                                    ${Object.entries(wallet.balances).map(([token, balance]) => `
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <span>${token}:</span>
                                            <span>${Number(balance).toFixed(8)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // Add to initializeSocketListeners()
    initializeSocketListeners() {
        // ... existing socket listeners ...

        this.socket.on('scanProgress', (progress) => {
            this.updateScanProgress(progress);
        });

        this.socket.on('newToken', (token) => {
            this.addNewTokenNotification(token);
        });

        this.socket.on('walletBalances', (balances) => {
            this.displayWalletBalances(balances);
        });
    }

    updateScanProgress(progress) {
        const progressElement = document.getElementById('scanProgress');
        if (!progressElement) return;

        progressElement.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Scanning Progress - ${progress.network}</h5>
                    <div class="progress mb-2">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${(progress.current / progress.total * 100).toFixed(2)}%">
                            ${(progress.current / progress.total * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div class="scan-stats">
                        <small>Pairs Scanned: ${progress.current}/${progress.total}</small>
                        <small>New Tokens: ${progress.newTokens}</small>
                    </div>
                </div>
            </div>
        `;
    }

    addNewTokenNotification(token) {
        const container = document.getElementById('newTokens');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show';
        notification.innerHTML = `
            <strong>New Token Found!</strong><br>
            Symbol: ${token.symbol}<br>
            Network: ${token.network}<br>
            Address: ${token.address}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.insertBefore(notification, container.firstChild);

        // Remove old notifications if there are too many
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }
}