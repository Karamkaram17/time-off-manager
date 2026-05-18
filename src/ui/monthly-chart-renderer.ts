import Chart from 'chart.js/auto';

import type { TimeOffCalculator } from '../calculators/time-off-calculator';
import type { TimeOffRepository } from '../repositories/time-off-repository';
import { DateUtils } from '../utils/date-utils';
import { queryRequiredElement } from '../utils/dom';
import type { DashboardUI } from './dashboard-ui';

type ChartDataShape = {
	labels: string[];
	used: number[];
	accrued: number[];
};

export class MonthlyChartRenderer {
	readonly canvas: HTMLCanvasElement;
	readonly repository: TimeOffRepository;
	readonly calculator: TimeOffCalculator;
	readonly ui: DashboardUI;
	chart: Chart | null = null;

	constructor(canvasSelector: string, repository: TimeOffRepository, calculator: TimeOffCalculator, ui: DashboardUI) {
		this.canvas = queryRequiredElement(canvasSelector) as HTMLCanvasElement;
		this.repository = repository;
		this.calculator = calculator;
		this.ui = ui;
	}

	render(): void {
		const { labels, used, accrued } = this.buildData();

		this.chart?.destroy();

		this.chart = new Chart(this.canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						type: 'bar',
						label: 'Used',
						data: used,
						backgroundColor: 'rgba(96, 165, 250, 0.55)',
						borderColor: 'rgba(125, 211, 252, 0.95)',
						borderWidth: 1,
						borderRadius: 10,
						maxBarThickness: 28,
					},
					{
						type: 'line',
						label: 'Accrued',
						data: accrued,
						borderColor: 'rgba(52, 211, 153, 0.95)',
						backgroundColor: 'rgba(52, 211, 153, 0.2)',
						borderWidth: 2,
						tension: 0.35,
						pointRadius: 3,
						pointHoverRadius: 4,
						fill: false,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					legend: {
						labels: {
							color: '#c8d8ef',
							usePointStyle: true,
							boxWidth: 10,
						},
					},
					tooltip: {
						backgroundColor: 'rgba(7, 17, 31, 0.95)',
						borderColor: 'rgba(148, 163, 184, 0.2)',
						borderWidth: 1,
					},
				},
				scales: {
					x: {
						ticks: {
							color: '#8ca0bd',
						},
						grid: {
							display: false,
						},
					},
					y: {
						beginAtZero: true,
						ticks: {
							color: '#8ca0bd',
						},
						grid: {
							color: 'rgba(148, 163, 184, 0.12)',
						},
					},
				},
			},
		});
	}

	private buildData(): ChartDataShape {
		const today = new Date();
		const { month: selectedMonth, year: selectedYear } = this.ui.getFilterValues();
		const chartYear = selectedYear ?? today.getFullYear();
		const monthsToRender = selectedMonth === null ? DateUtils.getFullYearMonths(chartYear) : [new Date(chartYear, selectedMonth - 1, 1)];

		return monthsToRender.reduce<ChartDataShape>(
			(chartData, monthCursor) => {
				chartData.labels.push(DateUtils.formatMonthLabel(monthCursor));
				chartData.used.push(Number(this.repository.getUsedForMonth(monthCursor).toFixed(2)));
				chartData.accrued.push(Number(this.calculator.calculateAccruedForMonth(monthCursor, today).toFixed(2)));

				return chartData;
			},
			{ labels: [], used: [], accrued: [] },
		);
	}
}
