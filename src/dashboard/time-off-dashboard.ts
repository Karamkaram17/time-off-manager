import { TimeOffCalculator, type TimeOffCalculatorConfig } from '../calculators/time-off-calculator';
import type { TimeOffRecord } from '../models/time-off';
import { TimeOffRepository } from '../repositories/time-off-repository';
import { DateUtils } from '../utils/date-utils';
import { MonthlyChartRenderer } from '../ui/monthly-chart-renderer';
import { DashboardUI, type SelectorMap } from '../ui/dashboard-ui';

export type DashboardConfig = TimeOffCalculatorConfig & {
	records: TimeOffRecord[];
	timeOffManagerLastUpdateDate: Date;
	chartSelector: string;
	selectors: SelectorMap;
};

export class TimeOffDashboard {
	readonly records: TimeOffRecord[];
	readonly timeOffManagerLastUpdateDate: Date;
	readonly calculator: TimeOffCalculator;
	readonly repository: TimeOffRepository;
	readonly ui: DashboardUI;
	readonly monthlyChart: MonthlyChartRenderer;

	constructor(config: DashboardConfig) {
		this.records = config.records;
		this.timeOffManagerLastUpdateDate = config.timeOffManagerLastUpdateDate;
		this.calculator = new TimeOffCalculator({
			employmentStartDate: config.employmentStartDate,
			monthlyAccrualRate: config.monthlyAccrualRate,
		});
		this.repository = new TimeOffRepository(this.records, this.calculator);
		this.ui = new DashboardUI(config.selectors);
		this.monthlyChart = new MonthlyChartRenderer(config.chartSelector, this.repository, this.calculator, this.ui);
	}

	init(): void {
		this.ui.populateYears(this.repository.getYears());
		this.ui.bindFilters(() => {
			this.render();
		});
		this.ui.bindSorting(() => {
			this.render();
		});
		this.render();
		this.calculateProjections();
	}

	clearFilters(): void {
		this.ui.clearFilters();
		this.render();
	}

	private render(): void {
		const filteredRecords = this.repository.getFiltered(this.ui.getFilterValues());
		const totalUsed = this.repository.getTotalUsed(filteredRecords);

		this.ui.renderTable(filteredRecords, (hours) => {
			return this.calculator.calculateWorkDays(hours);
		});
		this.ui.renderFilteredSummary(filteredRecords, totalUsed);
		this.monthlyChart.render();
	}

	private calculateProjections(): void {
		const today = new Date();
		const endOfCurrentMonth = DateUtils.getMonthEnd(today);
		const endOfTimeManagerUpdateDateMonth = DateUtils.getMonthEnd(this.timeOffManagerLastUpdateDate);
		const endOfYear = new Date(today.getFullYear(), 11, 31);
		const accruedBreakdown = this.calculator.getAccrualBreakdown(endOfCurrentMonth);
		const timeOffManagerBreakdown = this.calculator.getAccrualBreakdown(endOfTimeManagerUpdateDateMonth);
		const projectedYear = this.calculator.calculateAccruedThrough(endOfYear);
		const totalUsed = this.repository.getTotalUsed();

		this.ui.renderProjections({
			accruedBreakdown,
			remainingTimeOffManager: timeOffManagerBreakdown.totalAccrued - totalUsed,
			endOfTimeManagerUpdateDateMonth,
			remainingToday: accruedBreakdown.totalAccrued - totalUsed,
			endOfCurrentMonth,
			remainingYear: projectedYear - totalUsed,
			projectedYear,
		});
	}
}
