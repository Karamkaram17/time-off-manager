import { dashboardConfig } from './config/dashboard-config';
import { TimeOffDashboard } from './dashboard/time-off-dashboard';

const dashboard = new TimeOffDashboard(dashboardConfig);

type DashboardWindow = Window &
	typeof globalThis & {
		clearFilters: () => void;
	};

const dashboardWindow = window as DashboardWindow;

dashboardWindow.clearFilters = (): void => {
	dashboard.clearFilters();
};

dashboard.init();

export {};
