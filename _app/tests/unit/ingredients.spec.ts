import { parseIngredient } from '../../src/modules/ingredients'

describe('ingredients.ts', () => {
  it('parse four parts', () => {
    const out = parseIngredient('1 ½ dl sesamfrön')

    expect(out).toStrictEqual({ amount: '1 ½', measure: 'dl', name: 'sesamfrön'})
  })
  it('parse three parts', () => {
    const out = parseIngredient('½ dl sesamfrön')

    expect(out).toStrictEqual({ amount: '½', measure: 'dl', name: 'sesamfrön'})
  })

  it('parse two parts', () => {
    const out = parseIngredient('½ advocado')

    expect(out).toStrictEqual({ amount: '½', name: 'advocado'})
  })

  it('parse one part', () => {
    const out = parseIngredient('apple')

    expect(out).toStrictEqual({ name: 'apple' })
  })
})
