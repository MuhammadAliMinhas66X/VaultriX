import Category, { CATEGORY_TYPE_VALUES } from '../models/Category.js';
import { cleanLabel, isHexColor } from '../utils/validators.js';
import { isCategoryIcon } from '../utils/categoryIcons.js';
import Expense from '../models/Expense.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const toCategoryDto = (category) => ({
  id: String(category._id),
  name: category.name,
  type: category.type,
  color: category.color,
  icon: category.icon || '',
  isArchived: category.isArchived,
  isDefault: category.isDefault,
});

// A brand-new org has nothing to attach a transaction to yet - rather than
// making every new user build a category list from a blank page before
// they can log a single transaction, the first GET for an org with none
// seeds this starter set. They're ordinary categories after that (editable,
// archivable, not protected) - isDefault just marks where they came from.
const DEFAULT_CATEGORIES = [
  { name: 'Salary', icon: 'work', type: 'income', color: '#16a34a' },
  { name: 'Freelance', icon: 'work', type: 'income', color: '#0d9488' },
  { name: 'Gifts received', icon: 'gifts', type: 'income', color: '#65a30d' },
  { name: 'Other income', icon: 'savings', type: 'income', color: '#4d7c0f' },
  { name: 'Food & Dining', icon: 'food', type: 'expense', color: '#dc2626' },
  { name: 'Transport', icon: 'transport', type: 'expense', color: '#ea580c' },
  { name: 'Housing', icon: 'home', type: 'expense', color: '#b45309' },
  { name: 'Utilities', icon: 'bills', type: 'expense', color: '#0891b2' },
  { name: 'Entertainment', icon: 'entertainment', type: 'expense', color: '#7c3aed' },
  { name: 'Shopping', icon: 'shopping', type: 'expense', color: '#db2777' },
  { name: 'Health', icon: 'health', type: 'expense', color: '#059669' },
  { name: 'Other expense', icon: 'other', type: 'expense', color: '#6b7280' },
];

export const listCategories = async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = { orgId: req.user.orgId };
    if (!includeArchived) filter.isArchived = false;

    let categories = await Category.find(filter).sort({ type: 1, name: 1 }).lean();

    if (categories.length === 0 && !includeArchived) {
      const seeded = await Category.insertMany(
        DEFAULT_CATEGORIES.map((c) => ({ ...c, orgId: req.user.orgId, isDefault: true, createdBy: req.user.id }))
      );
      categories = seeded.map((c) => c.toObject()).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    }

    res.json({ success: true, categories: categories.map(toCategoryDto) });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, type, color, icon } = req.body || {};

    const cleanedName = cleanLabel(name);
    if (!cleanedName) return fail(res, 400, GENERIC_INVALID);
    if (!CATEGORY_TYPE_VALUES.includes(type)) return fail(res, 400, GENERIC_INVALID);

    const resolvedColor = isHexColor(color) ? color : '#111114';
    if (icon !== undefined && icon !== '' && !isCategoryIcon(icon)) return fail(res, 400, GENERIC_INVALID);

    const category = await Category.create({
      orgId: req.user.orgId,
      name: cleanedName,
      type,
      color: resolvedColor,
      icon: icon || '',
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, category: toCategoryDto(category.toObject()) });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!category) return fail(res, 404, NOT_FOUND);

    const { name, type, color, icon, isArchived } = req.body || {};
    const update = {};

    if (name !== undefined) {
      const cleanedName = cleanLabel(name);
      if (!cleanedName) return fail(res, 400, GENERIC_INVALID);
      update.name = cleanedName;
    }
    if (type !== undefined) {
      if (!CATEGORY_TYPE_VALUES.includes(type)) return fail(res, 400, GENERIC_INVALID);
      update.type = type;
    }
    if (color !== undefined) {
      if (!isHexColor(color)) return fail(res, 400, GENERIC_INVALID);
      update.color = color;
    }
    if (icon !== undefined) {
      if (icon !== '' && !isCategoryIcon(icon)) return fail(res, 400, GENERIC_INVALID);
      update.icon = icon;
    }
    if (isArchived !== undefined) {
      update.isArchived = Boolean(isArchived);
    }

    Object.assign(category, update);
    await category.save();

    res.json({ success: true, category: toCategoryDto(category.toObject()) });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const result = await Category.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (result.deletedCount === 0) return fail(res, 404, NOT_FOUND);
    const moved = await Expense.updateMany({ orgId: req.user.orgId, categoryId: req.params.id }, { $set: { categoryId: null } });
    res.json({ success: true, moved: moved.modifiedCount });
  } catch (error) {
    if (error?.name === 'CastError') return fail(res, 404, NOT_FOUND);
    next(error);
  }
};
