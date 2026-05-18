export type DateParts = {
	day: number;
	month: number;
	year: number;
};

export const DateUtils = {
	parseDate(dateStr: string): DateParts {
		const [day, month, year] = dateStr.split('-').map(Number);

		if (day === undefined || month === undefined || year === undefined || Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
			throw new Error(`Invalid date string: ${dateStr}`);
		}

		return { day, month, year };
	},

	getMonthStart(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	},

	getMonthEnd(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0);
	},

	isSameMonth(leftDate: Date, rightDate: Date): boolean {
		return leftDate.getFullYear() === rightDate.getFullYear() && leftDate.getMonth() === rightDate.getMonth();
	},

	formatMonthLabel(date: Date): string {
		return date.toLocaleDateString('en-US', {
			month: 'short',
			year: '2-digit',
		});
	},

	getFullYearMonths(year: number): Date[] {
		return Array.from({ length: 12 }, (_, monthIndex) => new Date(year, monthIndex, 1));
	},
};
