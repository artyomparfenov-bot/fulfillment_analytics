export interface OrderRecord {
  "Партнер": string;
  "№ заказа ДС": string;
  "ID заказа": string;
  "Тип заказа": string;
  "Товаров": string;
  "Общий вес": string;
  "Склад": string;
  "Статус": string;
  "Дата заказа (orders)": string;
  "Честные знаки": string;
  "Площадка": string;
  "Артикул": string;
  "Вес (report)": string;
  "Кол-во": string;
  "Склад (report)": string;
  "Статус (report)": string;
  "Дата заказа (report)": string;
  "Направление (расчёт)": string;
  "Маркетплейс (норм.)": string;
  "Файл-источник": string;
  "Последнее обновление": string;
}

export interface PartnerStats {
  partner: string;
  direction: string;
  totalOrders: number;
  uniqueSKU: number;
  uniqueWarehouses: number;
  avgOrdersPerDay: number;
  medianOrdersPerDay: number;
  orderFrequency: number; // days between orders
  volatility: number; // coefficient of variation
  lastOrderDate: Date;
  firstOrderDate: Date;
  daysSinceLastOrder: number;
  isActive: boolean;
  churnRisk: number; // 0-100
  alerts: Alert[];
}

export interface SKUStats {
  sku: string;
  partner: string;
  direction: string;
  totalOrders: number;
  avgOrdersPerDay: number;
  medianOrdersPerDay: number;
  lastOrderDate: Date;
  daysSinceLastOrder: number;
  orderFrequency: number;
  alerts: Alert[];
}

export interface Alert {
  type: 'partner' | 'sku';
  severity: 'high' | 'medium' | 'low';
  message: string;
  metric: string;
  value: number;
  threshold?: number;
}

export interface TimeRange {
  label: string;
  days: number | null; // null means "all time"
}

export interface DirectionStats {
  direction: string;
  totalOrders: number;
  totalPartners: number;
  totalSKU: number;
  avgOrdersPerPartner: number;
  medianOrdersPerPartner: number;
}

export interface ChurnPattern {
  avgOrderFrequency: number;
  medianOrderFrequency: number;
  avgSKUCount: number;
  medianSKUCount: number;
  avgWarehouseCount: number;
  medianWarehouseCount: number;
  avgVolatility: number;
  medianVolatility: number;
}

