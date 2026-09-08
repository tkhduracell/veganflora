/**
 * Slug rules replicated from ingest/json-gen.ts. The existing ~50 document
 * IDs were generated with these exact rules; changing them would orphan
 * documents rather than rename them.
 */
export function slugify(title: string): string {
	return title
		.replace(/\//gi, "\\")
		.replace(/ö/gi, "oe")
		.replace(/ä/gi, "ae")
		.replace(/å/gi, "aa")
		.replace(/[\W]+/gi, "_")
}

/**
 * Category segments keep Swedish letters (unlike the title, which
 * transliterates them). This asymmetry is intentional and matches
 * ingest/json-gen.ts.
 */
export function recipeDocId(category: string[], title: string): string {
	const prefix = category.map((s) => s.replace(/[^\wåäö]+/gi, "_")).join("\\")
	return `${prefix}\\${slugify(title)}`
}
