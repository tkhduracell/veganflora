
export type Recipe = {
  size: string;
  text: string;
  ingredients: string[];
  title: string;
}

export type Week = {
  days: Day[];
}

export type Day = { name: string } & {
  [key: string]: string[];
}

export type Ingredient = {
  name: string;
  amount?: string;
  measure?: string;
}
