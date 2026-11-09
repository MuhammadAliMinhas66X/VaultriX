export const CATEGORY_ICONS = [
  'food', 'groceries', 'coffee', 'transport', 'fuel', 'car', 'home', 'bills', 'internet', 'phone',
  'health', 'medicine', 'fitness', 'education', 'books', 'entertainment', 'movies', 'music', 'games', 'shopping',
  'clothing', 'gifts', 'travel', 'kids', 'pets', 'work', 'tax', 'savings', 'repairs', 'beauty',
  'charity', 'other', 'pizza', 'snacks', 'dessert', 'meat', 'fruits', 'salad', 'bakery', 'soup',
  'sandwich', 'water', 'electricity', 'gas', 'insurance', 'laptop', 'electronics', 'headphones', 'camera', 'jewelry',
  'watch', 'glasses', 'furniture', 'bed', 'cleaning', 'laundry', 'garden', 'flowers', 'tools', 'paint',
  'train', 'taxi', 'bike', 'truck', 'ship', 'hotel', 'camping', 'mountain', 'sports', 'party',
  'doctor', 'dental', 'vision', 'injection', 'hospital', 'card', 'cash', 'wallet', 'receipt', 'document',
  'mail', 'calendar', 'clock', 'package', 'store', 'building', 'school', 'heart', 'star', 'family',
  'podcast', 'art', 'idea', 'umbrella', 'leaf', 'nature', 'sun', 'dog', 'cat', 'fish',
  'news', 'cinema', 'subscription', 'worship',
];

export const isCategoryIcon = (value) => typeof value === 'string' && CATEGORY_ICONS.includes(value);
