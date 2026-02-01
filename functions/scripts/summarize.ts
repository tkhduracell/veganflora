import * as readline from "node:readline/promises";
import { fetchAndSummarize } from "../src/index";

import "dotenv/config";

interface Ingredient {
	name: string;
	measure: string;
	amount: string;
}

interface Recipe {
	size: string;
	title: string;
	text: string;
	ingredients: Ingredient[];
	image: string;
}

async function summarize(url: string): Promise<void> {
	// Your summarize logic here
	console.log(`Summarizing the content of: ${url}`);

	const json = await fetchAndSummarize(url);
	const out = JSON.parse(json) as Recipe;

	console.log();
	console.log("----------------------------------------");
	console.log(out.title);
	console.log("----------------------------------------");
	console.log("Portions:", out.size);
	console.log();
	console.log(out.text);
	console.log();
	console.log("Ingredients:");
	out.ingredients.forEach((i) => {
		console.log(`- ${i.amount} ${i.measure} ${i.name}`);
	});
	console.log();
	if (out.image) {
		console.log("Image URL:", out.image);
	}
	console.log("----------------------------------------");
	console.log();
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

while (true) {
	const url = await rl.question("Enter a URL to summarize: ");
	if (url) {
		await summarize(url);
	} else {
		console.log("Ctrl+C to exit.");
	}
}
