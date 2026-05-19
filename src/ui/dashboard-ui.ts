import { HOURS_PER_WORKDAY } from '../constants/time';
import type { FilterValues, SortColumn, SortDirection, SortState, TimeOffRecord } from '../models/time-off';
import { queryRequiredElement } from '../utils/dom';
import type { AccrualBreakdown } from '../calculators/time-off-calculator';
import { DateUtils } from '../utils/date-utils';

export type SelectorMap = {
	filterMonth: string;
	filterYear: string;
	tableBody: string;
	totalWorkdays: string;
	recordCount: string;
	accruedDays: string;
	accruedInfo: string;
	remainingTimeOffManager: string;
	updatedInfo: string;
	remainingToday: string;
	remainingThisMonthInfo: string;
	remainingYear: string;
	yearProjectionInfo: string;
};

type DashboardElements = {
	filterMonth: HTMLSelectElement;
	filterYear: HTMLSelectElement;
	tableBody: HTMLTableSectionElement;
	totalWorkdays: HTMLElement;
	recordCount: HTMLElement;
	accruedDays: HTMLElement;
	accruedInfo: HTMLElement;
	remainingTimeOffManager: HTMLElement;
	updatedInfo: HTMLElement;
	remainingToday: HTMLElement;
	remainingThisMonthInfo: HTMLElement;
	remainingYear: HTMLElement;
	yearProjectionInfo: HTMLElement;
};

type SortButton = HTMLButtonElement & {
	dataset: DOMStringMap & {
		sortKey: SortColumn;
	};
};

export type ProjectionSummary = {
	accruedBreakdown: AccrualBreakdown;
	remainingTimeOffManager: number;
	endOfTimeManagerUpdateDateMonth: Date;
	remainingToday: number;
	endOfCurrentMonth: Date;
	remainingYear: number;
	projectedYear: number;
};

export class DashboardUI {
	readonly elements: DashboardElements;
	readonly sortButtons: SortButton[];
	sortState: SortState = null;

	constructor(selectors: SelectorMap) {
		this.elements = {
			filterMonth: queryRequiredElement(selectors.filterMonth) as HTMLSelectElement,
			filterYear: queryRequiredElement(selectors.filterYear) as HTMLSelectElement,
			tableBody: queryRequiredElement(selectors.tableBody) as HTMLTableSectionElement,
			totalWorkdays: queryRequiredElement(selectors.totalWorkdays) as HTMLElement,
			recordCount: queryRequiredElement(selectors.recordCount) as HTMLElement,
			accruedDays: queryRequiredElement(selectors.accruedDays) as HTMLElement,
			accruedInfo: queryRequiredElement(selectors.accruedInfo) as HTMLElement,
			remainingTimeOffManager: queryRequiredElement(selectors.remainingTimeOffManager) as HTMLElement,
			updatedInfo: queryRequiredElement(selectors.updatedInfo) as HTMLElement,
			remainingToday: queryRequiredElement(selectors.remainingToday) as HTMLElement,
			remainingThisMonthInfo: queryRequiredElement(selectors.remainingThisMonthInfo) as HTMLElement,
			remainingYear: queryRequiredElement(selectors.remainingYear) as HTMLElement,
			yearProjectionInfo: queryRequiredElement(selectors.yearProjectionInfo) as HTMLElement,
		};

		this.sortButtons = Array.from(document.querySelectorAll<SortButton>('[data-sort-key]'));
		this.updateSortIndicators();
	}

	getFilterValues(): FilterValues {
		return {
			month: Number(this.elements.filterMonth.value) || null,
			year: Number(this.elements.filterYear.value) || null,
		};
	}

	clearFilters(): void {
		this.elements.filterMonth.value = '';
		this.elements.filterYear.value = '';
	}

	populateYears(years: number[]): void {
		years.forEach((year) => {
			const option = document.createElement('option');
			option.value = String(year);
			option.textContent = String(year);
			this.elements.filterYear.append(option);
		});
	}

	renderTable(records: TimeOffRecord[], calculateWorkDays: (hours: number) => number): void {
		const sortedRecords = this.getSortedRecords(records, calculateWorkDays);

		if (sortedRecords.length === 0) {
			this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No off days match the current filters.</td>
        </tr>
      `;
			return;
		}

		this.elements.tableBody.innerHTML = sortedRecords.map((record) => this.createRecordRow(record, calculateWorkDays)).join('');
	}

	renderFilteredSummary(records: TimeOffRecord[], totalUsed: number): void {
		this.elements.totalWorkdays.textContent = String(Number(totalUsed.toFixed(2)));
		this.elements.recordCount.textContent = `${String(records.length)} record${records.length !== 1 ? 's' : ''}`;
	}

	renderProjections({
		accruedBreakdown,
		remainingTimeOffManager,
		endOfTimeManagerUpdateDateMonth,
		remainingToday,
		endOfCurrentMonth,
		remainingYear,
		projectedYear,
	}: ProjectionSummary): void {
		this.elements.accruedDays.textContent = accruedBreakdown.totalAccrued.toFixed(2);
		this.elements.accruedInfo.textContent = `(${String(accruedBreakdown.fullMonths)} x 1.25) + (${String(accruedBreakdown.partialMonths)} x 0.625)`;
		this.elements.remainingTimeOffManager.textContent = remainingTimeOffManager.toFixed(2);
		this.elements.updatedInfo.textContent = `Until ${DateUtils.formatMonthLabel(endOfTimeManagerUpdateDateMonth)}`;
		this.elements.remainingToday.textContent = remainingToday.toFixed(2);
		this.elements.remainingThisMonthInfo.innerHTML = `Until ${DateUtils.formatMonthLabel(endOfCurrentMonth)}`;
		this.elements.remainingYear.textContent = remainingYear.toFixed(2);
		this.elements.yearProjectionInfo.textContent = `projected ${projectedYear.toFixed(2)} by Dec`;
	}

	bindFilters(onChange: () => void): void {
		this.elements.filterMonth.addEventListener('change', onChange);
		this.elements.filterYear.addEventListener('change', onChange);
	}

	bindSorting(onChange: () => void): void {
		this.sortButtons.forEach((button) => {
			button.addEventListener('click', () => {
				this.toggleSorting(button.dataset.sortKey);
				onChange();
			});
		});
	}

	private getSortedRecords(records: TimeOffRecord[], calculateWorkDays: (hours: number) => number): TimeOffRecord[] {
		if (this.sortState === null) {
			return records;
		}

		const { column, direction } = this.sortState;
		const directionMultiplier = direction === 'asc' ? 1 : -1;

		return [...records].sort((leftRecord, rightRecord) => {
			const leftValue = this.getComparableValue(leftRecord, column, calculateWorkDays);
			const rightValue = this.getComparableValue(rightRecord, column, calculateWorkDays);

			if (leftValue < rightValue) {
				return -1 * directionMultiplier;
			}

			if (leftValue > rightValue) {
				return 1 * directionMultiplier;
			}

			return 0;
		});
	}

	private getComparableValue(record: TimeOffRecord, column: SortColumn, calculateWorkDays: (hours: number) => number): number | string {
		switch (column) {
			case 'id':
				return record.id;
			case 'created':
				return this.getDateValue(record.created);
			case 'type':
				return record.type.toLocaleLowerCase();
			case 'startDate':
				return this.getDateValue(record.startDate);
			case 'endDate':
				return this.getDateValue(record.endDate);
			case 'hours':
				return calculateWorkDays(record.hours);
		}
	}

	private getDateValue(dateString: string): number {
		const { day, month, year } = DateUtils.parseDate(dateString);

		return new Date(year, month - 1, day).getTime();
	}

	private toggleSorting(column: SortColumn): void {
		if (this.sortState?.column === column) {
			this.sortState = {
				column,
				direction: this.getNextDirection(this.sortState.direction),
			};
		} else {
			this.sortState = {
				column,
				direction: 'asc',
			};
		}

		this.updateSortIndicators();
	}

	private getNextDirection(direction: SortDirection): SortDirection {
		return direction === 'asc' ? 'desc' : 'asc';
	}

	private updateSortIndicators(): void {
		this.sortButtons.forEach((button) => {
			const indicator = button.querySelector<HTMLElement>('.table-sort-indicator');
			const isActive = this.sortState?.column === button.dataset.sortKey;
			const direction = isActive ? this.sortState?.direction : null;
			const indicatorText = direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕';

			button.setAttribute('aria-pressed', String(isActive));
			button.closest('th')?.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none');

			if (indicator !== null) {
				indicator.textContent = indicatorText;
			}
		});
	}

	private createRecordRow(record: TimeOffRecord, calculateWorkDays: (hours: number) => number): string {
		const workdays = calculateWorkDays(record.hours);
		const extraHours = record.hours % HOURS_PER_WORKDAY;
		const hoursLabel = extraHours !== 0 ? ` (${String(extraHours)}h)` : '';

		return `
      <tr>
        <td>${String(record.id)}</td>
        <td>${record.created}</td>
        <td><span class="badge rounded-pill px-3 py-2 fw-semibold badge-soft-type">${record.type}</span></td>
        <td>${record.startDate}</td>
        <td>${record.endDate}</td>
        <td><span class="badge rounded-pill px-3 py-2 fw-semibold badge-soft-workdays">${String(workdays)}${hoursLabel}</span></td>
      </tr>
    `;
	}
}
