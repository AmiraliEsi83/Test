import { Signal, AutomationSettings, Order } from '@harsi/shared';
import { OrderManager } from './order-manager.js';
export declare class ExecutionPipeline {
    private orderManager;
    private automationSettings;
    private onAlert?;
    constructor(orderManager: OrderManager, automationSettings: AutomationSettings, onAlert?: (signal: Signal) => void);
    updateAutomation(settings: Partial<AutomationSettings>): void;
    processSignal(signal: Signal): Promise<Order | null>;
}
