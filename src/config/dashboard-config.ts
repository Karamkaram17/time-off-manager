import type { DashboardConfig } from '../dashboard/time-off-dashboard';

export const dashboardConfig: DashboardConfig = {
	records: [],
	employmentStartDate: new Date('2025-05-26'),
	timeOffManagerLastUpdateDate: new Date('2026-04-20'),
	monthlyAccrualRate: 1.25,
	chartSelector: '#monthlyChart',
	selectors: {
		filterMonth: '#filterMonth',
		filterYear: '#filterYear',
		tableBody: '#tableBody',
		totalWorkdays: '#totalWorkdays',
		recordCount: '#recordCount',
		accruedDays: '#accruedDays',
		accruedInfo: '#accruedInfo',
		remainingTimeOffManager: '#remainingTimeOffManager',
		updatedInfo: '#updatedInfo',
		remainingToday: '#remainingToday',
		remainingThisMonthInfo: '#remainingThisMonthInfo',
		remainingYear: '#remainingYear',
		yearProjectionInfo: '#yearProjectionInfo',
	},
};

export const kssEngineConfig = {
	serviceId: '6a0b468fd52cb93c85848291',
	type: 'service',
	fallbackPath: './data/data.json',
	fallbackOnly: false,
} as const;
