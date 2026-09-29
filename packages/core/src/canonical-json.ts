function canonicalizeNumber(value: number): string {
	if (!Number.isFinite(value)) throw new TypeError("Canonical JSON does not support non-finite numbers");
	return JSON.stringify(value);
}

export function canonicalizeJson(value: unknown): string {
	if (value === null) return "null";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number") return canonicalizeNumber(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;

	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		return `{${Object.keys(record)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`)
			.join(",")}}`;
	}

	throw new TypeError(`Unsupported canonical JSON value: ${typeof value}`);
}
