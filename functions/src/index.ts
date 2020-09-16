import * as functions from 'firebase-functions';

import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const root = db.collection('veganflora').doc('root')

export const prefillUpdate = functions.region('europe-west3')
    .firestore
    .document('/veganflora/root/recipies/{id}')
    .onWrite(async (_, ctx) => {
        functions.logger.info(`${ctx.params.id}:onWrite()`);
        
        const cursor = await root.collection('recipies').get()
        
        const tagSet = new Set<string>()
        const categorySet = new Set<string>()

        cursor.forEach(doc => {
            const data = doc.data() as { tags?: string[], category?: string[] }

            if (data.tags) {
                data.tags.forEach(t => tagSet.add(t))
            }

            if (data.category) {
                categorySet.add(data.category.join(' / '))
            }
        })

        const tags = [...tagSet.values()].sort()
        const categories = [...categorySet.values()].sort()

        functions.logger.info(`Updating prefill`, { tags, categories });
        
        await root.update({ prefill: { tags, categories } })
    });
