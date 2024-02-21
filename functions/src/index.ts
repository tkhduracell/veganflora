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

        type Tag = { text: string, color: string }
        type TagLegacy = string
        type Category = string

        const tagsByName = new Map<Tag['text'], Tag>()
        const categorySet = new Set<Category>()

        cursor.forEach(doc => {
            const data = doc.data() as { tags?: (TagLegacy | Tag)[], category?: Category[] }

            if (data.tags) {
                data.tags
                    .map(t => typeof t === 'string' ? { text: t, color: '' } : t)
                    .forEach(t => {
                        if (tagsByName.has(t.text)) {
                            tagsByName.set(t.text, { text: t.text, color: t.color });
                        }
                    })
            }

            if (data.category) {
                categorySet.add(data.category.join(' / '))
            }
        })

        const tags = [...tagsByName.values()].sort((a,b) => a.text.localeCompare(b.text))
        const categories = [...categorySet.values()].sort()

        logger.info(`Updating prefill`, { tags, categories });

        await root.update({ prefill: { tags, categories } })
    });
