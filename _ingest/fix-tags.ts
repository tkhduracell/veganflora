#!/usr/bin/env ts-node-script

import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'veganflora',
  databaseURL: 'https://veganflora.firebaseio.com'
})

async function main () {
  const db = admin.firestore()

  const col = await db.collection('veganflora').doc('root').collection('recipies').get()

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

  console.log('Completed!')

  // console.log(' ---------------- OUTPUT ---------------- ')
  // console.log(json)
}

main()
