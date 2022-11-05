import { Timestamp } from 'firebase/firestore';



export type Tag = {
  text: string;
  color: string;
}
export type Category = string


export type Recipe = {
  size: string;
  text: string;
  category: Category[];
  tags?: Tag[];
  ingredients: Ingredient[];
  title: string;
  key: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export type Menu = {
  [key: string]: Week;
}

export type Week = {
  days: { [key: string]: Day };
}

export enum WeekDay {
  monday = 'Måndag',
  tuesday = 'Tisdag',
  wednesday = 'Onsdag',
  thursday = 'Torsdag',
  friday = 'Fredag',
  saturday = 'Lördag',
  sunday = 'Söndag'
}

export const WeekDays = [
  WeekDay.monday,
  WeekDay.tuesday,
  WeekDay.wednesday,
  WeekDay.thursday,
  WeekDay.friday,
  WeekDay.saturday,
  WeekDay.sunday
]

export enum Meal {
  breakfast = 'Frukost',
  lunch = 'Lunch',
  dinner = 'Middag'
}

export const Meals = [
  Meal.breakfast,
  Meal.dinner,
  Meal.lunch
]

export type Day = {
  [Meal.breakfast]: string[];
  [Meal.lunch]: string[];
  [Meal.dinner]: string[];
}

export type Ingredient = {
  name: string;
  amount?: string;
  measure?: string;
}

export type Context<T> = {
  week: number;
  weekday: WeekDay;
  meal: Meal;
  source: T;
}

export type IngredientWithContext = Ingredient & Context<Recipe>
