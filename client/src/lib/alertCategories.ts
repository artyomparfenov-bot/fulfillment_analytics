/**
 * Alert Severity Levels and Risk Categories
 * Defines business impact, response time, and escalation procedures
 */

import type { AlertSeverity, AlertCategory, CustomerSize } from './alertPrioritization';

export interface SeverityDefinition {
  level: AlertSeverity;
  label: string;
  description: string;
  responseTimeHours: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: string;
  actionRequired: boolean;
}

export interface RiskCategoryDefinition {
  category: AlertCategory;
  label: string;
  description: string;
  businessImpact: string;
  typicalCauses: string[];
  recommendedActions: string[];
  priorityWeight: number; // 0-100, higher = more important
}

export interface CustomerSizeDefinition {
  size: CustomerSize;
  label: string;
  description: string;
  orderVolumeRange: string;
  revenueMultiplier: number; // Used for revenue at risk calculation
  responseTimeMultiplier: number; // Faster response for larger customers
}

/**
 * Severity Level Definitions
 */
export const SEVERITY_DEFINITIONS: Record<AlertSeverity, SeverityDefinition> = {
  CRITICAL: {
    level: 'CRITICAL',
    label: 'Критичный',
    description: 'Немедленное действие требуется. Крупный клиент теряет заказы или готов отвалиться.',
    responseTimeHours: 1,
    color: 'text-red-400',
    backgroundColor: 'bg-red-900/20',
    borderColor: 'border-red-500/50',
    icon: '🔴',
    actionRequired: true
  },
  HIGH: {
    level: 'HIGH',
    label: 'Высокий',
    description: 'Требуется действие в течение нескольких часов. Значительный риск потери выручки.',
    responseTimeHours: 4,
    color: 'text-orange-400',
    backgroundColor: 'bg-orange-900/20',
    borderColor: 'border-orange-500/50',
    icon: '🟠',
    actionRequired: true
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: 'Средний',
    description: 'Требуется мониторинг и планирование действий. Потенциальный риск в будущем.',
    responseTimeHours: 24,
    color: 'text-yellow-400',
    backgroundColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-500/50',
    icon: '🟡',
    actionRequired: false
  },
  LOW: {
    level: 'LOW',
    label: 'Низкий',
    description: 'Информационный. Мониторинг рекомендуется, но срочного действия не требуется.',
    responseTimeHours: 72,
    color: 'text-blue-400',
    backgroundColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/50',
    icon: '🔵',
    actionRequired: false
  }
};

/**
 * Risk Category Definitions
 */
export const RISK_CATEGORIES: Record<AlertCategory, RiskCategoryDefinition> = {
  CHURN_RISK: {
    category: 'CHURN_RISK',
    label: 'Риск отвала',
    description: 'Партнёр показывает признаки готовности прекратить сотрудничество',
    businessImpact: 'Потеря постоянного источника заказов и выручки',
    typicalCauses: [
      'Снижение частоты заказов на 50%+ за последние 2 недели',
      'Отсутствие заказов более 30 дней',
      'Переключение на конкурентов (снижение доли заказов)',
      'Снижение среднего размера заказа',
      'Увеличение времени между заказами'
    ],
    recommendedActions: [
      'Связаться с партнёром для выяснения причин',
      'Предложить специальные условия или скидки',
      'Провести анализ конкурентных предложений',
      'Назначить встречу с ключевым контактом',
      'Предложить дополнительные услуги поддержки'
    ],
    priorityWeight: 95
  },
  
  REVENUE_DROP: {
    category: 'REVENUE_DROP',
    label: 'Падение выручки',
    description: 'Резкое снижение объёма заказов или среднего размера заказа',
    businessImpact: 'Прямое снижение доходов от партнёра',
    typicalCauses: [
      'Сезонное снижение спроса',
      'Проблемы с поставками товара',
      'Технические проблемы на стороне партнёра',
      'Конкуренция и переключение на альтернативы',
      'Изменение стратегии партнёра'
    ],
    recommendedActions: [
      'Проанализировать тренды за последние 3 месяца',
      'Проверить, не связано ли с сезонностью',
      'Связаться с партнёром для выяснения причин',
      'Предложить помощь в решении проблем',
      'Рассмотреть возможность совместного маркетинга'
    ],
    priorityWeight: 85
  },
  
  VOLATILITY: {
    category: 'VOLATILITY',
    label: 'Волатильность',
    description: 'Непредсказуемые скачки в объёме заказов',
    businessImpact: 'Сложность планирования, риск перебоев в поставках',
    typicalCauses: [
      'Сезонные колебания спроса',
      'Нерегулярные крупные заказы',
      'Проблемы с логистикой',
      'Изменение маркетинговой активности партнёра',
      'Внешние факторы (праздники, события)'
    ],
    recommendedActions: [
      'Проанализировать исторические паттерны',
      'Обсудить с партнёром возможность стабилизации заказов',
      'Предложить программу лояльности за регулярные заказы',
      'Улучшить прогнозирование спроса',
      'Создать буфер запасов для критичных SKU'
    ],
    priorityWeight: 50
  },
  
  WAREHOUSE_ANOMALY: {
    category: 'WAREHOUSE_ANOMALY',
    label: 'Аномалия склада',
    description: 'Необычная активность или проблемы на конкретном складе',
    businessImpact: 'Локальные проблемы с доставкой или обработкой заказов',
    typicalCauses: [
      'Проблемы с логистикой на конкретном складе',
      'Техническое обслуживание или ремонт',
      'Кадровые проблемы',
      'Сезонная перегрузка',
      'Проблемы с поставками на склад'
    ],
    recommendedActions: [
      'Связаться с менеджером склада',
      'Проверить статус поставок на склад',
      'Оценить загруженность и пропускную способность',
      'Рассмотреть перераспределение заказов на другие склады',
      'Провести аудит процессов на складе'
    ],
    priorityWeight: 60
  },
  
  SKU_ANOMALY: {
    category: 'SKU_ANOMALY',
    label: 'Аномалия SKU',
    description: 'Необычное поведение конкретного товара',
    businessImpact: 'Проблемы с конкретным товаром могут указывать на качество или спрос',
    typicalCauses: [
      'Резкое снижение спроса на товар',
      'Проблемы с качеством товара',
      'Изменение цены конкурентов',
      'Появление альтернативных товаров',
      'Сезонное снижение спроса'
    ],
    recommendedActions: [
      'Проверить отзывы и рейтинги товара',
      'Проанализировать конкурентные предложения',
      'Обсудить с партнёром возможность оптимизации цены',
      'Рассмотреть возможность снятия товара с продажи',
      'Провести маркетинговую кампанию для товара'
    ],
    priorityWeight: 40
  },
  
  CONCENTRATION: {
    category: 'CONCENTRATION',
    label: 'Риск концентрации',
    description: 'Слишком большая доля заказов от одного партнёра или в одном направлении',
    businessImpact: 'Высокий риск при потере ключевого партнёра или направления',
    typicalCauses: [
      'Один партнёр даёт более 30% заказов',
      'Одно направление даёт более 50% заказов',
      'Недостаточная диверсификация',
      'Успешное развитие одного направления'
    ],
    recommendedActions: [
      'Разработать стратегию диверсификации',
      'Активно привлекать новых партнёров',
      'Развивать менее активные направления',
      'Снизить зависимость от ключевых партнёров',
      'Создать резервные каналы продаж'
    ],
    priorityWeight: 70
  }
};

/**
 * Customer Size Definitions
 */
export const CUSTOMER_SIZE_DEFINITIONS: Record<CustomerSize, CustomerSizeDefinition> = {
  LARGE: {
    size: 'LARGE',
    label: 'Крупный',
    description: 'Партнёр с высоким объёмом заказов, стратегическое значение',
    orderVolumeRange: '500+ заказов в месяц',
    revenueMultiplier: 3.0,
    responseTimeMultiplier: 0.5 // Faster response
  },
  MEDIUM: {
    size: 'MEDIUM',
    label: 'Средний',
    description: 'Партнёр со стабильным объёмом заказов',
    orderVolumeRange: '100-500 заказов в месяц',
    revenueMultiplier: 1.5,
    responseTimeMultiplier: 1.0
  },
  SMALL: {
    size: 'SMALL',
    label: 'Малый',
    description: 'Партнёр с небольшим объёмом заказов',
    orderVolumeRange: 'менее 100 заказов в месяц',
    revenueMultiplier: 0.5,
    responseTimeMultiplier: 2.0 // Slower response acceptable
  }
};

/**
 * Get recommended response time based on severity and customer size
 */
export function getRecommendedResponseTime(
  severity: AlertSeverity,
  customerSize: CustomerSize
): number {
  const severityHours = SEVERITY_DEFINITIONS[severity].responseTimeHours;
  const sizeMultiplier = CUSTOMER_SIZE_DEFINITIONS[customerSize].responseTimeMultiplier;
  return Math.round(severityHours * sizeMultiplier);
}

/**
 * Get escalation level based on priority score
 */
export function getEscalationLevel(priorityScore: number): 'IMMEDIATE' | 'URGENT' | 'NORMAL' | 'LOW' {
  if (priorityScore >= 85) return 'IMMEDIATE';
  if (priorityScore >= 70) return 'URGENT';
  if (priorityScore >= 50) return 'NORMAL';
  return 'LOW';
}

/**
 * Get action checklist for alert
 */
export function getActionChecklist(category: AlertCategory): string[] {
  return RISK_CATEGORIES[category].recommendedActions;
}

/**
 * Format alert for notification/email
 */
export function formatAlertForNotification(
  partnerName: string,
  category: AlertCategory,
  severity: AlertSeverity,
  priorityScore: number,
  message: string
): string {
  const severityDef = SEVERITY_DEFINITIONS[severity];
  const categoryDef = RISK_CATEGORIES[category];
  const responseTime = getRecommendedResponseTime(severity, 'LARGE');
  
  return `
${severityDef.icon} ${severityDef.label} | ${categoryDef.label}

Партнёр: ${partnerName}
Приоритет: ${priorityScore}/100
Рекомендуемое время ответа: ${responseTime} часов

${message}

Рекомендуемые действия:
${categoryDef.recommendedActions.slice(0, 3).map((action, i) => `${i + 1}. ${action}`).join('\n')}
  `.trim();
}

