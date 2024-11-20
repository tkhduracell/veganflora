import * as readline from 'readline';

import {fetchAndSummarize} from '../src/index'

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

rl.question('Please enter a URL: ', async (url) => {
    await summarize(url);
    rl.close();
});