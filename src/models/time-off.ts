export type TimeOffRecord = {
	id: number;
	created: string;
	approved: boolean;
	type: string;
	startDate: string;
	endDate: string;
	hours: number;
};

export type FilterValues = {
	month: number | null;
	year: number | null;
};

export type SortColumn = 'id' | 'created' | 'type' | 'startDate' | 'endDate' | 'hours';

export type SortDirection = 'asc' | 'desc';

export type SortState = {
	column: SortColumn;
	direction: SortDirection;
} | null;
