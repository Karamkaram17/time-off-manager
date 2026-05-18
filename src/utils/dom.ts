export function queryRequiredElement(selector: string): Element {
	const element = document.querySelector(selector);

	if (element === null) {
		throw new Error(`Expected element for selector: ${selector}`);
	}

	return element;
}
