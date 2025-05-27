export function unique<T>(t: Iterable<T>) {
	return [...new Set(t)]
}
