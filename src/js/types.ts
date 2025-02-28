// TypeScript definitions for the application

// Authentication
export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    preferences: UserPreferences;
    lastLogin: string;
}

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    VIEWER = 'viewer'
}

export interface UserPreferences {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
}

// Trading
export interface Trade {
    id: string;
    symbol: string;
    type: TradeType;
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    status: TradeStatus;
    timestamp: string;
    closedAt?: string;
    profitLoss?: number;
    profitLossPercent?: number;
    fees: number;
    notes?: string;
}

export enum TradeType {
    BUY = 'buy',
    SELL = 'sell'
}

export enum TradeStatus {
    OPEN = 'open',
    CLOSED = 'closed',
    CANCELLED = 'cancelled',
    FAILED = 'failed'
}

// Market Data
export interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    lastUpdate: string;
    history: PriceHistory[];
}

export interface PriceHistory {
    price: number;
    timestamp: string;
}

// Configuration
export interface Config {
    trading: TradingConfig;
    ethereum: BlockchainConfig;
    bnbChain: BlockchainConfig;
    exchanges: ExchangeConfig;
}

export interface TradingConfig {
    walletBuyPercentage: number;
    stopLoss: number;
    takeProfit: number;
    maxConcurrentTrades: number;
    maxTradesPerHour: number;
    autoStart: boolean;
}

export interface BlockchainConfig {
    enabled: boolean;
    network?: string;
    privateKey?: string;
    infuraId?: string;
    alchemyKey?: string;
}

export interface ExchangeConfig {
    binanceUS: {
        enabled: boolean;
        apiKey?: string;
        apiSecret?: string;
    };
}

// System
export interface SystemInfo {
    version: string;
    uptime: number;
    memory: {
        total: number;
        used: number;
        free: number;
    };
    cpu: {
        cores: number;
        load: number[];
    };
    network: {
        bytesIn: number;
        bytesOut: number;
    };
}

// Analytics
export interface AnalyticsEvent {
    eventName: string;
    properties: Record<string, any>;
    userId?: string;
    sessionId: string;
    timestamp: string;
    url: string;
    userAgent: string;
}

// Error Handling
export interface ErrorInfo {
    message: string;
    stack?: string;
    type: string;
    timestamp: string;
    context: {
        url: string;
        userAgent: string;
        [key: string]: any;
    };
}

// WebSocket Messages
export interface WebSocketMessage {
    type: string;
    payload: any;
}

// API Responses
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    timestamp: string;
}

// Notification
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
    closeable?: boolean;
    timestamp: string;
}