export type Ingredient = {
	name: string
	amount?: string
	measure?: string
	note?: string
}

export function noEmpty(x: string) {
	return !x.match(/^\s*$/gmu)
}

export function normalize(x: string) {
	return x
		.replace(/1\s*[\\/]\s*2/gi, "½")
		.replace(/1\s*[\\/]\s*3/gi, "⅓")
		.replace(/2\s*[\\/]\s*3/gi, "⅔")
		.replace(/1\s*[\\/]\s*4/gi, "¼")
		.replace(/3\s*[\\/]\s*4/gi, "¾")
		.replace(/1\s*[\\/]\s*5/gi, "⅕")
		.replace(/2\s*[\\/]\s*5/gi, "⅖")
		.replace(/3\s*[\\/]\s*5/gi, "⅗")
		.replace(/4\s*[\\/]\s*5/gi, "⅘")
		.replace(/1\s*[\\/]\s*6/gi, "⅙")
		.replace(/5\s*[\\/]\s*6/gi, "⅚")
		.replace(/1\s*[\\/]\s*7/gi, "⅐")
		.replace(/1\s*[\\/]\s*8/gi, "⅛")
		.replace(/3\s*[\\/]\s*8/gi, "⅜")
		.replace(/5\s*[\\/]\s*8/gi, "⅝")
		.replace(/7\s*[\\/]\s*8/gi, "⅞")
		.replace(/1\s*[\\/]\s*9/gi, "⅑")
		.replace(/1\s*[\\/]\s*10/gi, "⅒")
		.replace(/^ *\* */gi, "")
}

export function normalizeValue(x: string | number): string | number {
	if (typeof x === "number") return x
	if (x.match(/½|1\s*[\\/]\s*2/gi)) return 1 / 2
	if (x.match(/⅓|1\s*[\\/]\s*3/gi)) return 1 / 3
	if (x.match(/⅔|2\s*[\\/]\s*3/gi)) return 2 / 3
	if (x.match(/¼|1\s*[\\/]\s*4/gi)) return 1 / 4
	if (x.match(/¾|3\s*[\\/]\s*4/gi)) return 3 / 4
	if (x.match(/⅕|1\s*[\\/]\s*5/gi)) return 1 / 5
	if (x.match(/⅖|2\s*[\\/]\s*5/gi)) return 2 / 5
	if (x.match(/⅗|3\s*[\\/]\s*5/gi)) return 3 / 5
	if (x.match(/⅘|4\s*[\\/]\s*5/gi)) return 4 / 5
	if (x.match(/⅙|1\s*[\\/]\s*6/gi)) return 1 / 6
	if (x.match(/⅚|5\s*[\\/]\s*6/gi)) return 5 / 6
	if (x.match(/⅐|1\s*[\\/]\s*7/gi)) return 1 / 7
	if (x.match(/⅛|1\s*[\\/]\s*8/gi)) return 1 / 8
	if (x.match(/⅜|3\s*[\\/]\s*8/gi)) return 3 / 8
	if (x.match(/⅝|5\s*[\\/]\s*8/gi)) return 5 / 8
	if (x.match(/⅞|7\s*[\\/]\s*8/gi)) return 7 / 8
	if (x.match(/⅑|1\s*[\\/]\s*9/gi)) return 1 / 9
	if (x.match(/⅒|1\s*[\\/]\s*10/gi)) return 1 / 10
	return x
}

export function parseIngredient(x: string): Omit<Ingredient, "id"> {
	const regex =
		/\s*(?:(?<amount>[\d¼½¾,.]+(?:\s+[\d¼½¾])?(?:\s*-\s*[\d¼½¾]+)?)\s*)?(?:(?<measure>st|g|gram|krm|tsk|msk|ml|dl|liten\snäve|stora?|medelstor)\s+)?(?<name>.+)?/gu

	const match = regex.exec(normalize(x))

	let out = { name: x } as Omit<Ingredient, "id">
	if (match?.groups && Object.keys(match.groups).length === 2) {
		out = {
			amount: match.groups.amount as string,
			name: match.groups.name as string,
		}
	}
	if (match?.groups && Object.keys(match.groups).length === 3) {
		out = {
			amount: match.groups.amount as string,
			measure: match.groups.measure as string,
			name: match.groups.name as string,
		}
	}

	if (!out.amount) delete out.amount
	if (!out.measure) delete out.measure

	/* Read parenthesis at the end */
	const notes = /\s+\((?<note>.*)\)$/gmu
	const note = notes.exec(out.name)
	if (note?.groups && Object.keys(note?.groups).length === 1) {
		out.name = out.name.replace(notes, "")
		out.note = note.groups.note
	}

	return out
}
