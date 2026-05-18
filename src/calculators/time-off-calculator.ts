import { HOURS_PER_WORKDAY } from '../constants/time';
import { DateUtils } from '../utils/date-utils';

export type AccrualBreakdown = {
	totalAccrued: number;
	fullMonths: number;
	partialMonths: number;
};

export type TimeOffCalculatorConfig = {
	employmentStartDate: Date;
	monthlyAccrualRate: number;
};

export class TimeOffCalculator {
	readonly employmentStartDate: Date;
	readonly monthlyAccrualRate: number;

	constructor({ employmentStartDate, monthlyAccrualRate }: TimeOffCalculatorConfig) {
		this.employmentStartDate = employmentStartDate;
		this.monthlyAccrualRate = monthlyAccrualRate;
	}

	calculateWorkDays(hours: number): number {
		const workdays = hours / HOURS_PER_WORKDAY;

		return Number(workdays.toFixed(2));
	}

	calculateAccruedForMonth(monthDate: Date, accrualCutoffDate: Date): number {
		const monthStart = DateUtils.getMonthStart(monthDate);
		const monthEnd = DateUtils.getMonthEnd(monthDate);

		if (monthEnd < this.employmentStartDate || accrualCutoffDate < monthStart) {
			return 0;
		}

		const startsMidMonth = DateUtils.isSameMonth(monthDate, this.employmentStartDate) && this.employmentStartDate.getDate() !== 1;
		const endsMidMonth = DateUtils.isSameMonth(monthDate, accrualCutoffDate) && accrualCutoffDate < monthEnd;

		if (startsMidMonth || endsMidMonth) {
			return this.monthlyAccrualRate / 2;
		}

		return this.monthlyAccrualRate;
	}

	calculateAccruedThrough(accrualCutoffDate: Date): number {
		let totalAccrued = 0;

		this.forEachAccrualMonth(accrualCutoffDate, (monthCursor) => {
			totalAccrued += this.calculateAccruedForMonth(monthCursor, accrualCutoffDate);
		});

		return totalAccrued;
	}

	getAccrualBreakdown(accrualCutoffDate: Date): AccrualBreakdown {
		const breakdown: AccrualBreakdown = {
			totalAccrued: 0,
			fullMonths: 0,
			partialMonths: 0,
		};

		this.forEachAccrualMonth(accrualCutoffDate, (monthCursor) => {
			const monthAccrual = this.calculateAccruedForMonth(monthCursor, accrualCutoffDate);

			breakdown.totalAccrued += monthAccrual;

			if (monthAccrual === this.monthlyAccrualRate) {
				breakdown.fullMonths += 1;
			} else if (monthAccrual > 0) {
				breakdown.partialMonths += 1;
			}
		});

		return breakdown;
	}

	private forEachAccrualMonth(accrualCutoffDate: Date, callback: (monthCursor: Date) => void): void {
		for (
			let monthCursor = DateUtils.getMonthStart(this.employmentStartDate);
			monthCursor <= accrualCutoffDate;
			monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
		) {
			callback(monthCursor);
		}
	}
}
