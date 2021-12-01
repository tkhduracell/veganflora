import { Suggest } from '../../../src/modules/suggestions'

describe('Suggest.categories', () => {
  it('gives empty if input is empty', () => {
    expect(Suggest.categories([], [])).toHaveLength(0)
  })

  it('gives a suggestion', () => {
    expect(Suggest.categories(['A'], [])).toHaveLength(1)
  })

  it('gives a suggestion when given current null', () => {
    expect(Suggest.categories(['A'], [])).toHaveLength(1)
  })

  it('gives no suggestion is equal to category', () => {
    expect(Suggest.categories(['A'], ['A'])).toHaveLength(0)
  })

  it('gives no suggestion is equal to category', () => {
    expect(Suggest.categories(['A / B'], ['A'])).toEqual(['B'])
  })

  it('gives suggestion for second level', () => {
    expect(Suggest.categories(['A / B', 'A / C'], ['A'])).toEqual(['B', 'C'])
  })

  it('gives suggestion for second level with only third level suggestions', () => {
    expect(Suggest.categories(['A / A / A', 'A / A / B', 'A / B', 'A / B / C'], ['A'])).toEqual(['A', 'B'])
  })

  it('gives suggestion for third level', () => {
    expect(Suggest.categories(['A / A / A', 'A / A / B'], ['A', 'A'])).toEqual(['A', 'B'])
  })

  it('gives suggestion for third level', () => {
    expect(Suggest.categories(['A / A / A', 'A / A / B'], [])).toEqual(['A'])
  })
})

describe('Suggest.tags', () => {
  it('should not give same tag', () => {
    expect(Suggest.tags(['A', 'B'], ['B', 'C'])).toEqual(['A'])
  })

  it('should giva all suggestions if current is undefined', () => {
    expect(Suggest.tags(['A', 'B'], undefined)).toEqual(['A', 'B'])
  })
})
