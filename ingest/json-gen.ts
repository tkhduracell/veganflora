import glob from "fast-glob";
import path from "path";
import admin from "firebase-admin";

import { readFile, writeFile } from "./src/fs";
import { parseIngredient, noEmpty } from "./src/ingredients";

admin.initializeApp({
	credential: admin.credential.applicationDefault(),
	projectId: "veganflora",
	databaseURL: "https://veganflora.firebaseio.com",
});

const cwd = path.join(__dirname, "..");

async function findFiles() {
	const files = await glob("./**/*.md", {
		cwd,
		ignore: ["_app", "_script", "README.md"],
	});
	return files.map((f) => ({
		file: path.join(cwd, f),
		dir: path.dirname(f),
		name: path.basename(f),
	}));
}

async function fileContents(
	files: { file: string; dir: string; name: string }[],
) {
	return await Promise.all(
		files.map(async (f) => {
			const { file } = f;
			console.log(`Reading file ${path.relative(cwd, file)}`);
			return { content: await readFile(file, { encoding: "utf-8" }), ...f };
		}),
	);
}

function parseRecipie(f: {
	content: string;
	file: string;
	dir: string;
	name: string;
}) {
	const { content, file, dir } = f;
	try {
		const [title, size, ingredients, text] = content.split("\n\n", 4);
		return {
			title: title.trim().replace(/# /, ""),
			category: dir.split(path.sep),
			size,
			ingredients: ingredients.split(/\n/).map((l) => l.replace(/ - /gi, "")),
			text,
			file,
		};
	} catch (err) {
		console.error(`File ${file} at ${dir} did not comply with format. `);
		console.error(err);
		return { file, split: content.split("\n\n"), invalid: true };
	}
}

async function main() {
	const files = await findFiles();
	console.log(`Found ${files.length} files`);

	const contents = await fileContents(files);
	console.log(`Read ${files.length} files`);

	const recipes = contents.map(parseRecipie);
	console.log(`Extracted ${recipes.length} recipies`);

	const json = JSON.stringify({ recipes }, null, 2);
	const out = path.join(__dirname, "..", "data.json");
	await writeFile(out, json, { encoding: "utf8" });
	console.log(`Wrote ${path.normalize(out)}`);

	const documents = recipes
		.map((r) => {
			const ingredients = (r.ingredients || [])
				.filter(noEmpty)
				.map(parseIngredient);
			return { ...r, ingredients };
		})
		.filter((r) => !r.invalid && r.text && r.title && r.category);

	const db = admin.firestore();

	const root = db.collection("veganflora").doc("root");
	const collection = root.collection("recipies");
	for (const doc of documents) {
		const { title, ingredients, text, size, category } = doc;
		const safename = title!
			.replace(/\//gi, "\\")
			.replace(/ö/gi, "oe")
			.replace(/ä/gi, "ae")
			.replace(/å/gi, "aa")
			.replace(/[\W]+/gi, "_");

		const prefix = category!
			.map((s) => s.replace(/[^\wåäö]+/gi, "_"))
			.join("\\");
		const ref = collection.doc(`${prefix}\\${safename}`);

		await ref.set({
			title,
			size,
			ingredients,
			text,
			category,
		});
		console.log(`Wrote '${title}' => ${ref.path}`);
	}

	console.log("Completed!");

	// console.log(' ---------------- OUTPUT ---------------- ')
	// console.log(json)
}

main();
