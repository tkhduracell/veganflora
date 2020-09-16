
// ['A / B', 'A / C']
// ['A']
function categories (categories: string[], current?: string[], delim = ' / ') {
  if (!categories) return []

  const currentJoined = current ? current.join(delim) : ''

  // Find all with common parent categories
  const withSameParent = current ? categories.filter(c => c.startsWith(currentJoined)) : categories

  // Remove parent category as prefix
  const withoutTheParent = current ? withSameParent.map(c => c.split(delim).slice(current.length).join(delim)) : withSameParent

  // Keep only category below current level
  const onlyChilds = withoutTheParent.filter(c => c.length > 0)

  // Only suggest first subcategory of a path
  const onlyFirstName = onlyChilds.map(c => c.split(delim).slice(0, 1).join(delim))

  // Get only unique output
  const unique = new Set(onlyFirstName)

  return [...unique]
}

function tags (tags: string[], current?: string[]) {
  return current ? tags.filter(s => !current.includes(s)) : tags
}

export default class Suggest {
  static tags = tags
  static categories = categories
}
