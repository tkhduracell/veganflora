export type Ingredient = {
	name: string;
	amount?: string;
	measure?: string;
};

export type Recipe = {
	title: string;
	size: string;
	ingredients: Ingredient[];
	text: string;
	category: string[];
	tags: string[];
	image?: string;
};

export type StoredRecipe = Recipe & {
	embedding?: number[];
	embeddingHash?: string;
};

export type RecipeSummary = {
	id: string;
	title: string;
	category: string[];
	tags: string[];
};
