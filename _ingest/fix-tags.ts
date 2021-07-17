import admin from 'firebase-admin'

admin.initializeApp({
  projectId: 'veganflora',
  databaseURL: 'https://veganflora.firebaseio.com'
})

type Input = {
  created_at: admin.firestore.Timestamp,
  updated_at: admin.firestore.Timestamp
}

async function main () {
  const db = admin.firestore()

  const col = db.collection('veganflora').doc('root').collection('recipies')
  const result = await col.get()

  for (const doc of result.docs) {
    const { created_at, updated_at } = doc.data() as Input

    const now = admin.firestore.Timestamp.now()
    const mypoch = new admin.firestore.Timestamp(now.seconds - 3600 * 24 * 30, now.nanoseconds)

    if (!created_at && !updated_at) {
      await doc.ref.update({
        created_at: mypoch,
        updated_at: mypoch
      })
      console.log('Updated recipie', { id: doc.id })
    }
  }

  console.log('Completed!')

  // console.log(' ---------------- OUTPUT ---------------- ')
  // console.log(json)
}

main()

/**
 *

for (const doc of col.docs) {
    const { title: oldTitle, tags: oldTags } = doc.data() as {title: string, tags?: string[]}

    let title = oldTitle
    const tags = new Set(oldTags)
    if (title.includes('ej testat')) {
      tags.add('Ej Testat')
      title = title.replace(/\s+-\s+ej testat/gi, '')
    }
    if (title.includes('andra chansen')) {
      tags.add('Andra Chansen')
      title = title.replace(/\s+-\s+andra chansen/gi, '')
    }
    if (title.includes('hitta annat recept')) {
      tags.add('Hitta Annat Recept')
      title = title.replace(/\s+-\s+hitta annat recept/gi, '')
    }

    await doc.ref.update({
      title,
      tags: [...tags]
    })
    console.log(`Updated recipie`, {title, tags: [...tags], path: doc.ref.path})
  }

 *
 */
