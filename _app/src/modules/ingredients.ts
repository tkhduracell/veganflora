import { Ingredient } from '@/components/types'

export function parseIngredient (x: string) {
  const regex = /\s*(?<amount>[\d¼½¾]+(?:\s*[¼½¾])?)(?:\s(?<measure>krm|tsk|msk|dl|liten\snäve|stor|medelstor))?\s*(?<name>.*)/gu
  const match = regex.exec(x)

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

  return out
}
