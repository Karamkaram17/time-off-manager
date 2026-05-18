import type { TimeOffCalculator } from '../calculators/time-off-calculator';
import type { FilterValues, TimeOffRecord } from '../models/time-off';
import { DateUtils } from '../utils/date-utils';

export class TimeOffRepository {
	readonly records: TimeOffRecord[];
	readonly calculator: TimeOffCalculator;

	constructor(records: TimeOffRecord[], calculator: TimeOffCalculator) {
		this.records = records;
		this.calculator = calculator;
	}

	getYears(): number[] {
		return [...new Set(this.records.map((record) => DateUtils.parseDate(record.startDate).year))].sort(
			(leftYear, rightYear) => rightYear - leftYear,
		);
	}

	getFiltered({ month, year }: FilterValues): TimeOffRecord[] {
		return this.records.filter((record) => {
			const date = DateUtils.parseDate(record.startDate);

			if (month !== null && date.month !== month) {
				return false;
			}

			if (year !== null && date.year !== year) {
				return false;
			}

			return true;
		});
	}

	getTotalUsed(records: TimeOffRecord[] = this.records): number {
		return records.reduce((sum, record) => sum + this.calculator.calculateWorkDays(record.hours), 0);
	}

	getUsedForMonth(monthDate: Date): number {
		return this.records.reduce((sum, record) => {
			const date = DateUtils.parseDate(record.startDate);
			const isSameMonth = date.month === monthDate.getMonth() + 1 && date.year === monthDate.getFullYear();

			return isSameMonth ? sum + this.calculator.calculateWorkDays(record.hours) : sum;
		}, 0);
	}
}
