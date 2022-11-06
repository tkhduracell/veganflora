import {region, logger} from 'firebase-functions';

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();
const root = db.collection('veganflora').doc('root')

export const prefillUpdate = region('europe-west3')
    .firestore
    .document('/veganflora/root/recipies/{id}')
    .onWrite(async (_, ctx) => {
        logger.info(`${ctx.params.id}:onWrite()`);
        
        const cursor = await root.collection('recipies').get()
        
        const tagSet = new Set<{ text: string }>()
        const categorySet = new Set<string>()

        cursor.forEach(doc => {
            const data = doc.data() as { tags?: (string | { text: string })[], category?: string[] }

            if (data.tags) {
                data.tags
                    .map(t => typeof t === 'string' ? { text: t, color: '' } : t)
                    .forEach(t => tagSet.add(t))
            }

            if (data.category) {
                categorySet.add(data.category.join(' / '))
            }
        })

        const tags = [...tagSet.values()].sort()
        const categories = [...categorySet.values()].sort()

        logger.info(`Updating prefill`, { tags, categories });
        
        await root.update({ prefill: { tags, categories } })
    });
