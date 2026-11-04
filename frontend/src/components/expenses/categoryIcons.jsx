import {
  Baby, BookOpen, Briefcase, Bus, Car, Coffee, Dumbbell, Film, Fuel, Gamepad2, GraduationCap, Gift, HeartHandshake, HeartPulse, Home, Landmark,
  Music, PawPrint, Phone, PiggyBank, Pill, Plane, Scissors, Shirt, ShoppingBag, ShoppingCart, Tag, Tv, Utensils, Wifi, Wrench, Zap,
} from 'lucide-react';

export const ICON_MAP = {
  food: Utensils,
  groceries: ShoppingCart,
  coffee: Coffee,
  transport: Bus,
  fuel: Fuel,
  car: Car,
  home: Home,
  bills: Zap,
  internet: Wifi,
  phone: Phone,
  health: HeartPulse,
  medicine: Pill,
  fitness: Dumbbell,
  education: GraduationCap,
  books: BookOpen,
  entertainment: Tv,
  movies: Film,
  music: Music,
  games: Gamepad2,
  shopping: ShoppingBag,
  clothing: Shirt,
  gifts: Gift,
  travel: Plane,
  kids: Baby,
  pets: PawPrint,
  work: Briefcase,
  tax: Landmark,
  savings: PiggyBank,
  repairs: Wrench,
  beauty: Scissors,
  charity: HeartHandshake,
  other: Tag,
};

export const ICON_KEYS = Object.keys(ICON_MAP);

const GUESSES = [
  [/food|dining|restaurant|meal|eat/i, 'food'],
  [/grocer|supermarket|mart/i, 'groceries'],
  [/coffee|cafe|tea/i, 'coffee'],
  [/fuel|petrol|diesel|gas\b/i, 'fuel'],
  [/transport|taxi|bus|ride|commute|travel to/i, 'transport'],
  [/\bcar\b|vehicle|parking/i, 'car'],
  [/rent|housing|home|house|mortgage/i, 'home'],
  [/util|bill|electric|water|power/i, 'bills'],
  [/internet|wifi|broadband/i, 'internet'],
  [/phone|mobile|recharge|load/i, 'phone'],
  [/medic|pharm|drug/i, 'medicine'],
  [/health|doctor|clinic|hospital|dental/i, 'health'],
  [/gym|fitness|sport/i, 'fitness'],
  [/school|education|tuition|course|fees|college|uni/i, 'education'],
  [/book|stationer/i, 'books'],
  [/movie|cinema|film/i, 'movies'],
  [/music|concert/i, 'music'],
  [/game|gaming/i, 'games'],
  [/entertain|fun|leisure|subscription|netflix/i, 'entertainment'],
  [/cloth|fashion|shoe|wear/i, 'clothing'],
  [/shop/i, 'shopping'],
  [/gift|present|eid|wedding/i, 'gifts'],
  [/travel|trip|flight|hotel|holiday|vacation/i, 'travel'],
  [/kid|child|baby|toy/i, 'kids'],
  [/pet|cat|dog|vet/i, 'pets'],
  [/work|office|business|salary/i, 'work'],
  [/tax/i, 'tax'],
  [/saving|invest/i, 'savings'],
  [/repair|maint|fix|plumb/i, 'repairs'],
  [/beauty|salon|haircut|grooming/i, 'beauty'],
  [/charity|zakat|sadaqah|donat/i, 'charity'],
];

export const iconKeyFor = (category) => {
  if (category && category.icon && ICON_MAP[category.icon]) return category.icon;
  const name = category ? category.name : '';
  const hit = GUESSES.find(([pattern]) => pattern.test(name));
  return hit ? hit[1] : 'other';
};

export const iconKeyForName = (name) => iconKeyFor({ name });

export function CategoryIcon({ category, name, iconKey, className = 'h-[18px] w-[18px]', strokeWidth = 1.75 }) {
  const key = iconKey || (category ? iconKeyFor(category) : iconKeyForName(name || ''));
  const Icon = ICON_MAP[key] || Tag;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export const SUGGESTED = [
  { name: 'Groceries', icon: 'groceries' },
  { name: 'Fuel', icon: 'fuel' },
  { name: 'Rent', icon: 'home' },
  { name: 'Internet', icon: 'internet' },
  { name: 'Education', icon: 'education' },
  { name: 'Gifts', icon: 'gifts' },
  { name: 'Travel', icon: 'travel' },
  { name: 'Medicine', icon: 'medicine' },
];
