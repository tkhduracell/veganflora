import {region, logger} from 'firebase-functions';

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();
const root = db.collection('veganflora').doc('root')

const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`

export const prefillUpdate = region('europe-west3')
    .firestore
    .document('/veganflora/root/recipies/{id}')
    .onWrite(async (_, ctx) => {
        logger.info(`${ctx.params.id}:onWrite()`);

        type TagInfo = { text: string, color: string }
        type TagKey = string

        type Category = string
        type CompatTags = (TagKey | TagInfo)[]

        const tagsByName = new Map<TagKey, TagInfo>()
        const categorySet = new Set<Category>()

        {
            const { prefill } = await root.get().then(itm => itm.data() as { prefill?: { tags: TagInfo[], categories: Category[] } })
            if (prefill) {
                prefill.tags.forEach(t => tagsByName.set(t.text, t))
                prefill.categories.forEach(c => categorySet.add(c))
            }
        }

        {
            const current = await root.collection('recipies').doc(ctx.params.id).get()
            if (!current.exists) return logger.warn(`Document ${ctx.params.id} does not exist`)

            logger.info(`Updating updated doc with tags`, {  });
            const tags: TagKey[] = (current.data()!.tags as CompatTags).map(t => typeof t === 'string' ? t : t.text)
            await current.ref.update({ tags })
        }

        const cursor = await root.collection('recipies').get()
        cursor.forEach(doc => {
            const { tags, category } = doc.data() as { tags?: CompatTags, category?: Category[] }

            if (!category)  return logger.error(`Document ${doc.id} has no category`)
            categorySet.add(category.join(' / '))

            if (!tags) return logger.warn(`Document ${doc.id} has no tags`)
            tags
                .map(t => typeof t === 'string' ? t : t.text ?? '')
                .filter(tag => tag !== '')
                .filter(tag => !tagsByName.has(tag))
                .forEach(tag => tagsByName.set(tag, { text: tag, color: randomColor() }))

        })

        const tags = [...tagsByName.values()].sort((a,b) => a.text.localeCompare(b.text))
        const categories = [...categorySet.values()].sort()

        logger.info(`Updating prefill`, { tags, categories });
        await root.update({ "prefill.tags": tags, "prefill.categories": categories })
    });
