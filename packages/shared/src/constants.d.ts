import { RiskSettings, AutomationSettings, SubscriptionTier } from './types.js';
export declare const DEFAULT_RISK_SETTINGS: Omit<RiskSettings, 'userId'>;
export declare const DEFAULT_AUTOMATION_SETTINGS: Omit<AutomationSettings, 'userId'>;
export interface PlanFeature {
    name: string;
    includedIn: SubscriptionTier[];
}
export declare const SUBSCRIPTION_PLANS: {
    FREE: {
        id: string;
        name: string;
        price: number;
        interval: string;
        features: string[];
        maxStrategies: number;
        brokerIntegration: boolean;
        liveAutomation: boolean;
        backtestingRunsPerDay: number;
    };
    TRADER: {
        id: string;
        name: string;
        price: number;
        interval: string;
        popular: boolean;
        features: string[];
        maxStrategies: number;
        brokerIntegration: boolean;
        liveAutomation: boolean;
        backtestingRunsPerDay: number;
    };
    PRO: {
        id: string;
        name: string;
        price: number;
        interval: string;
        features: string[];
        maxStrategies: number;
        brokerIntegration: boolean;
        liveAutomation: boolean;
        backtestingRunsPerDay: number;
    };
};
