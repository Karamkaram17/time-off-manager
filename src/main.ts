import { dashboardConfig, kssEngineConfig } from './config/dashboard-config';
import { TimeOffDashboard } from './dashboard/time-off-dashboard';
import { loadTimeOffData } from './integrations/kss-engine';

type DashboardWindow = Window &
	typeof globalThis & {
		clearFilters: () => void;
	};

const dashboardWindow = window as DashboardWindow;
let dashboard: TimeOffDashboard | null = null;

dashboardWindow.clearFilters = (): void => {
	dashboard?.clearFilters();
};

async function bootstrap(): Promise<void> {
	let config = dashboardConfig;

	try {
		const remoteData = await loadTimeOffData(kssEngineConfig);
		config = {
			...dashboardConfig,
			records: remoteData.records,
			employmentStartDate: remoteData.employmentStartDate ?? dashboardConfig.employmentStartDate,
			timeOffManagerLastUpdateDate: remoteData.timeOffManagerLastUpdateDate ?? dashboardConfig.timeOffManagerLastUpdateDate,
			monthlyAccrualRate: remoteData.monthlyAccrualRate ?? dashboardConfig.monthlyAccrualRate,
		};
	} catch (error) {
		console.error('Failed to load time-off data through KSS_ENGINE. Falling back to bundled records.', error);
	}

	dashboard = new TimeOffDashboard(config);
	dashboard.init();
}

void bootstrap();

export {};
