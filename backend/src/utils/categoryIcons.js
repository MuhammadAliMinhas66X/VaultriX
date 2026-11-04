export const CATEGORY_ICONS = [
  'food', 'groceries', 'coffee', 'transport', 'fuel', 'car', 'home', 'bills', 'internet', 'phone',
  'health', 'medicine', 'fitness', 'education', 'books', 'entertainment', 'movies', 'music', 'games', 'shopping',
  'clothing', 'gifts', 'travel', 'kids', 'pets', 'work', 'tax', 'savings', 'repairs', 'beauty', 'charity', 'other',
];

export const isCategoryIcon = (value) => typeof value === 'string' && CATEGORY_ICONS.includes(value);
