import { Recipe, Tags } from '@/components/types'
import { firestore } from 'firebase'

export enum Category {
  New = '✦ Nytt',
  Updated = '✐ Uppdaterad'
}
export const Categories = [
  Category.New,
  Category.Updated
]

export function autoTag(r: Recipe): Recipe {
  function lastNDays(ts: firestore.Timestamp, n: number) {
    return new Date().getTime() - ts.toDate().getTime() < 1000 * 3600 * n
  }
  const created = r.created_at && lastNDays(r.created_at, 14)
    ? { text: Category.New, color: '#FF650D' }
    : null
  const updated = r.updated_at && lastNDays(r.updated_at, 14)
    ? { text: Category.Updated, color: '#B39812' }
    : null

  return {
    ...r,
    tags: [...(r.tags || []), created, updated].filter(t => t !== null) as Tags
  }
}
