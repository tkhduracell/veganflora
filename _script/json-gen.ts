import * as glob from 'fast-glob'

import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const writeFile  = promisify(fs.writeFile)

async function main() {
    const regex = /\#(.+?)\n\n(.+?)\n\n(.+)\n\n(.+?)$/gms;

    const files = await glob("./**/*.md", {
        cwd: path.join(__dirname, '..'),
        ignore: ['_app', '_script', 'README.md']
    })
    console.log(`Found ${files.length} files`)

    const recipes = await Promise.all(files.map(async f => {
        console.log(`Reading file ${f}`)

        const content = await readFile(f, { encoding: 'utf-8' })
        try {
            const [ title, size, ingredients, text] = content.split('\n\n')
            console.log(`File ${f} has correct format!`)
            return {
                title: title.trim().replace(/# /, ''),
                category: path.dirname(f),
                size,
                ingredients: ingredients.split(/\n/).map(l => l.replace(/ - /gi, '')),
                text
            }
        } catch (err) {
            return { file: f, split: content.split('\n\n') }
        }
    }))

    const data = { recipes }
    const json = JSON.stringify(data, null, 2)
    await writeFile(path.join(__dirname, '../data.json'), json, { encoding: 'utf8'})

    console.log(json)
}

main()
