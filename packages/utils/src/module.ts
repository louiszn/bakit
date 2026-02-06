export function isCommonJS() {
	return typeof require !== "undefined" && typeof module !== "undefined";
}

export function isESM() {
	return !isCommonJS();
}
