import { defineConfig } from 'vite';

const devEntryTag = '<script type="module" src="/src/main.ts"></script>';
const productionEntryTag = '<script src="./js/script.js"></script>';

export default defineConfig({
	server: {
		host: '127.0.0.1',
		port: 3000,
	},
	plugins: [
		{
			name: 'time-off-dev-entry',
			apply: 'serve',
			transformIndexHtml(html) {
				return html.replace(productionEntryTag, devEntryTag);
			},
		},
	],
});
