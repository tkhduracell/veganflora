import { Recipe, Tag } from '@/components/types'
import { Timestamp } from 'firebase/firestore'

export enum AutoTag {
  New = '✦ Nytt',
  Updated = '✐ Uppdaterad'
}
export const AutoTags = [
  AutoTag.New,
  AutoTag.Updated
]

export function autoTag(r: Recipe): Recipe {
  function lastNDays(ts: Timestamp, n: number) {
    return new Date().getTime() - ts.toDate().getTime() < 1000 * 3600 * n
  }
  const created = r.created_at && lastNDays(r.created_at, 14)
    ? { text: AutoTag.New, color: '#FF650D' }
    : null
  const updated = r.updated_at && lastNDays(r.updated_at, 14)
    ? { text: AutoTag.Updated, color: '#B39812' }
    : null

  const tags = (r.tags || []) as Tag[]
  if (created) {
    tags.push(created)
  } else if (updated) {
    tags.push(updated)
  }

  return {
    ...r,
    tags
  }
}
