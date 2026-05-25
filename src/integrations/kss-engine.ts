import type { TimeOffRecord } from '../models/time-off';

type KssSignal<TValue> = {
	value: TValue;
	set(nextValue: TValue): void;
	subscribe(listener: (value: TValue) => void): () => void;
};

export type KssServiceInitConfig = {
	serviceId: string;
	logServiceId?: string;
	type: 'service';
	fallbackPath?: string;
	fallbackOnly?: boolean;
	filterEmpty?: boolean;
};

type KssEngine = {
	init(config: KssServiceInitConfig): void;
	loading: KssSignal<boolean>;
	data: KssSignal<unknown>;
	error: KssSignal<Error | null>;
	onReady(callback: (data: unknown) => void): () => void;
};

type KssTimeOffPayload = {
	updatedAt?: string;
	data?: {
		employmentStartDate?: string;
		timeOffManagerLastUpdateDate?: string;
		monthlyAccrualRate?: number;
		updatedAt?: string;
		dataArr?: unknown[];
	};
	employmentStartDate?: string;
	timeOffManagerLastUpdateDate?: string;
	monthlyAccrualRate?: number;
	dataArr?: unknown[];
	records?: unknown[];
};

type KssTimeOffRecord = {
	id: number;
	created: string;
	type?: string;
	startDate: string;
	endDate: string;
	hours: number;
};

export type LoadedTimeOffData = {
	records: TimeOffRecord[];
	employmentStartDate?: Date;
	timeOffManagerLastUpdateDate?: Date;
	monthlyAccrualRate?: number;
};

declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		KSS_ENGINE?: KssEngine;
	}
}

export function loadTimeOffData(config: KssServiceInitConfig): Promise<LoadedTimeOffData> {
	const engine = getKssEngine();

	return new Promise<LoadedTimeOffData>((resolve, reject) => {
		let settled = false;
		const cleanupCallbacks: (() => void)[] = [];

		const cleanup = (): void => {
			cleanupCallbacks.forEach((callback) => {
				callback();
			});
		};

		const settle = <TValue>(callback: (value: TValue) => void) => {
			return (value: TValue): void => {
				if (settled) {
					return;
				}

				settled = true;
				cleanup();
				callback(value);
			};
		};

		cleanupCallbacks.push(
			engine.onReady(
				settle((payload: unknown) => {
					resolve(normalizeTimeOffPayload(payload));
				}),
			),
		);

		cleanupCallbacks.push(
			engine.error.subscribe((error: Error | null) => {
				if (error !== null) {
					settle((nextError: Error) => {
						reject(nextError);
					})(error);
				}
			}),
		);

		engine.init(config);
	});
}

function getKssEngine(): KssEngine {
	const engine = window.KSS_ENGINE;

	if (engine === undefined) {
		throw new Error('KSS_ENGINE is not available. Load kss-engine.js before the app bundle.');
	}

	return engine;
}

function normalizeTimeOffPayload(payload: unknown): LoadedTimeOffData {
	if (!isRecord(payload)) {
		throw new Error('KSS_ENGINE returned an unexpected payload.');
	}

	const timeOffPayload = payload as KssTimeOffPayload;
	const rawRecords = getRawRecords(timeOffPayload);

	if (!Array.isArray(rawRecords)) {
		throw new Error('KSS time-off payload does not include a records array.');
	}

	const employmentStartDate = parseOptionalDate(timeOffPayload.data?.employmentStartDate) ?? parseOptionalDate(timeOffPayload.employmentStartDate);
	const timeOffManagerLastUpdateDate =
		parseOptionalDate(timeOffPayload.data?.timeOffManagerLastUpdateDate) ??
		parseOptionalDate(timeOffPayload.timeOffManagerLastUpdateDate) ??
		parseOptionalDate(timeOffPayload.updatedAt) ??
		parseOptionalDate(timeOffPayload.data?.updatedAt);
	const monthlyAccrualRate =
		requireOptionalNumber(timeOffPayload.data?.monthlyAccrualRate, 'monthlyAccrualRate') ??
		requireOptionalNumber(timeOffPayload.monthlyAccrualRate, 'monthlyAccrualRate');

	return {
		records: rawRecords.map((rawRecord) => normalizeRecord(rawRecord)),
		...(employmentStartDate === undefined ? {} : { employmentStartDate }),
		...(timeOffManagerLastUpdateDate === undefined ? {} : { timeOffManagerLastUpdateDate }),
		...(monthlyAccrualRate === undefined ? {} : { monthlyAccrualRate }),
	};
}

function getRawRecords(payload: KssTimeOffPayload): unknown[] | undefined {
	if (Array.isArray(payload.data?.dataArr)) {
		return payload.data.dataArr;
	}

	if (Array.isArray(payload.dataArr)) {
		return payload.dataArr;
	}

	if (Array.isArray(payload.records)) {
		return payload.records;
	}

	return undefined;
}

function normalizeRecord(record: unknown): TimeOffRecord {
	if (!isRecord(record)) {
		throw new Error('KSS time-off record is invalid.');
	}

	const rawRecord = record as Partial<KssTimeOffRecord>;

	return {
		id: requireNumber(rawRecord.id, 'id'),
		created: normalizeDateString(rawRecord.created, 'created'),
		type: normalizeString(rawRecord.type) || 'Paid Leave',
		startDate: normalizeDateString(rawRecord.startDate, 'startDate'),
		endDate: normalizeDateString(rawRecord.endDate, 'endDate'),
		hours: requireNumber(rawRecord.hours, 'hours'),
	};
}

function normalizeDateString(value: unknown, fieldName: string): string {
	const stringValue = normalizeString(value);

	if (stringValue === '') {
		throw new Error(`KSS time-off record is missing ${fieldName}.`);
	}

	if (/^\d{2}-\d{2}-\d{4}$/.test(stringValue)) {
		return stringValue;
	}

	const parsedDate = new Date(stringValue);

	if (Number.isNaN(parsedDate.getTime())) {
		throw new Error(`KSS time-off record has an invalid ${fieldName}: ${stringValue}`);
	}

	return formatDateForDashboard(parsedDate);
}

function parseOptionalDate(value: unknown): Date | undefined {
	const stringValue = normalizeString(value);

	if (stringValue === '') {
		return undefined;
	}

	const parsedDate = new Date(stringValue);

	if (Number.isNaN(parsedDate.getTime())) {
		return undefined;
	}

	return parsedDate;
}

function formatDateForDashboard(date: Date): string {
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = String(date.getFullYear());

	return `${day}-${month}-${year}`;
}

function normalizeString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function requireNumber(value: unknown, fieldName: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	throw new Error(`KSS time-off record has an invalid ${fieldName}.`);
}

function requireOptionalNumber(value: unknown, fieldName: string): number | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	throw new Error(`KSS time-off payload has an invalid ${fieldName}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}
