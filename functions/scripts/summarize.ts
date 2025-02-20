import * as readline from 'node:readline/promises';
import {fetchAndSummarize} from '../src/index'

import "dotenv/config";

async function summarize(url: string): Promise<void> {
    // Your summarize logic here
    console.log(`Summarizing the content of: ${url}`);

    const out = await fetchAndSummarize(url);
    console.log(out)
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


while (true) {
    const url = await rl.question('Enter a URL to summarize: ');
    if (url) {
        await summarize(url);
    } else {
        console.log('Ctrl+C to exit.');
    }
}
