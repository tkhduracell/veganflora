
export function noEmpty (x: string) {
  return !x.match(/^\s*$/gum)
}

export function normalize (x: string) {
  return x
    .replace(/1\s*[\\/]\s*2/gi, '½')
    .replace(/1\s*[\\/]\s*3/gi, '⅓')
    .replace(/2\s*[\\/]\s*3/gi, '⅔')
    .replace(/1\s*[\\/]\s*4/gi, '¼')
    .replace(/3\s*[\\/]\s*4/gi, '¾')
    .replace(/1\s*[\\/]\s*5/gi, '⅕')
    .replace(/2\s*[\\/]\s*5/gi, '⅖')
    .replace(/3\s*[\\/]\s*5/gi, '⅗')
    .replace(/4\s*[\\/]\s*5/gi, '⅘')
    .replace(/1\s*[\\/]\s*6/gi, '⅙')
    .replace(/5\s*[\\/]\s*6/gi, '⅚')
    .replace(/1\s*[\\/]\s*7/gi, '⅐')
    .replace(/1\s*[\\/]\s*8/gi, '⅛')
    .replace(/3\s*[\\/]\s*8/gi, '⅜')
    .replace(/5\s*[\\/]\s*8/gi, '⅝')
    .replace(/7\s*[\\/]\s*8/gi, '⅞')
    .replace(/1\s*[\\/]\s*9/gi, '⅑')
    .replace(/1\s*[\\/]\s*10/gi, '⅒')
}

export function parseIngredient (x: string) {
  const regex = /\s*(?:(?<amount>[\d¼½¾,.]+(?:\s+[\d¼½¾])?(?:\s*-\s*[\d¼½¾]+)?)\s*)?(?:(?<measure>st|g|gram|krm|tsk|msk|ml|dl|liten\snäve|stora?|medelstor)\s+)?(?<name>.+)?/gu

  const match = regex.exec(normalize(x))

  let out = { name: x } as Ingredient
  if (match && match.groups && Object.keys(match.groups).length === 2) {
    out = {
      amount: match.groups.amount as string,
      name: match.groups.name as string
    }
  }
  if (match && match.groups && Object.keys(match.groups).length === 3) {
    out = {
      amount: match.groups.amount as string,
      measure: match.groups.measure as string,
      name: match.groups.name as string
    }
  }

  if (!out.amount) delete out.amount
  if (!out.measure) delete out.measure

  /* Read parenthesis at the end */
  const notes = /\s+\((?<note>.*)\)$/gum
  const note = notes.exec(out.name)
  if (note && note.groups && Object.keys(note.groups).length === 1) {
    out.name = out.name.replace(notes, '')
    out.note = note.groups.note
  }

  return out
}

export type Ingredient = {
  name: string;
  amount?: string;
  measure?: string;
  note?: string;
}
