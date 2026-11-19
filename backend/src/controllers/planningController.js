import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Goal from '../models/Goal.js';
import SavingEntry from '../models/SavingEntry.js';
import Category from '../models/Category.js';
import { toMajor, parseAmountMinor, parseDay, optionalText } from '../utils/financeInput.js';
import { isSupportedCurrency } from '../utils/currencies.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const NOT_FOUND = 'That action could not be completed.';
const MAX_GOALS = 50;
const MAX_CONTRIBUTIONS = 500;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const dayOf = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

const budgetDto = (budget) => ({
  id: String(budget._id),
  categoryId: String(budget.categoryId),
  amount: toMajor(budget.amountMinor),
  currency: budget.currency,
});

export const goalDto = (goal) => {
  const savedMinor = goal.contributions.reduce((sum, item) => sum + item.amountMinor, 0);
  return {
    id: String(goal._id),
    name: goal.name,
    target: toMajor(goal.targetMinor),
    currency: goal.currency,
    deadline: dayOf(goal.deadline),
    saved: toMajor(savedMinor),
    contributions: [...goal.contributions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((item) => ({ id: String(item._id), amount: toMajor(item.amountMinor), date: dayOf(item.date), note: item.note || '' })),
  };
};

export const listBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ orgId: req.user.orgId }).lean();
    res.json({ success: true, budgets: budgets.map(budgetDto) });
  } catch (error) {
    next(error);
  }
};

// One limit per category: sending a category again changes its limit.
export const saveBudget = async (req, res, next) => {
  try {
    const body = req.body || {};
    const amountMinor = parseAmountMinor(body.amount);
    if (!mongoose.isValidObjectId(body.categoryId) || amountMinor === undefined || !isSupportedCurrency(body.currency)) return fail(res, 400, GENERIC_INVALID);
    const category = await Category.exists({ _id: body.categoryId, orgId: req.user.orgId, type: 'expense' });
    if (!category) return fail(res, 400, GENERIC_INVALID);
    const budget = await Budget.findOneAndUpdate(
      { orgId: req.user.orgId, categoryId: body.categoryId },
      { $set: { amountMinor, currency: body.currency }, $setOnInsert: { orgId: req.user.orgId, categoryId: body.categoryId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, budget: budgetDto(budget) });
  } catch (error) {
    next(error);
  }
};

export const removeBudget = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const result = await Budget.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!result.deletedCount) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const listGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ orgId: req.user.orgId }).sort({ createdAt: 1 }).limit(MAX_GOALS).lean();
    res.json({ success: true, goals: goals.map(goalDto) });
  } catch (error) {
    next(error);
  }
};

const readGoal = (body) => {
  const name = optionalText(body.name, 60);
  const targetMinor = parseAmountMinor(body.target);
  if (!name || targetMinor === undefined || !isSupportedCurrency(body.currency)) return null;
  let deadline = null;
  if (body.deadline) {
    deadline = parseDay(body.deadline, { maxFutureDays: 365 * 50 });
    if (!deadline) return null;
  }
  return { name, targetMinor, currency: body.currency, deadline };
};

export const createGoal = async (req, res, next) => {
  try {
    const fields = readGoal(req.body || {});
    if (!fields) return fail(res, 400, GENERIC_INVALID);
    if ((await Goal.countDocuments({ orgId: req.user.orgId })) >= MAX_GOALS) return fail(res, 400, GENERIC_INVALID);
    const goal = await Goal.create({ ...fields, orgId: req.user.orgId });
    res.status(201).json({ success: true, goal: goalDto(goal) });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const fields = readGoal(req.body || {});
    if (!fields) return fail(res, 400, GENERIC_INVALID);
    const goal = await Goal.findOneAndUpdate({ _id: req.params.id, orgId: req.user.orgId }, { $set: fields }, { new: true }).lean();
    if (!goal) return fail(res, 404, NOT_FOUND);
    res.json({ success: true, goal: goalDto(goal) });
  } catch (error) {
    next(error);
  }
};

export const removeGoal = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const result = await Goal.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!result.deletedCount) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// body: { amount, direction: 'in' | 'out', date?, note? }
export const addContribution = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const body = req.body || {};
    const amountMinor = parseAmountMinor(body.amount);
    const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
    const note = optionalText(body.note, 80);
    if (amountMinor === undefined || !date || note === undefined || (body.direction !== undefined && body.direction !== 'in' && body.direction !== 'out')) return fail(res, 400, GENERIC_INVALID);
    const signed = body.direction === 'out' ? -amountMinor : amountMinor;
    const goal = await Goal.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!goal) return fail(res, 404, NOT_FOUND);
    if (goal.contributions.length >= MAX_CONTRIBUTIONS) return fail(res, 400, GENERIC_INVALID);
    const saved = goal.contributions.reduce((sum, item) => sum + item.amountMinor, 0);
    if (saved + signed < 0) return fail(res, 400, GENERIC_INVALID);
    goal.contributions.push({ amountMinor: signed, date, note });
    await goal.save();
    res.json({ success: true, goal: goalDto(goal) });
  } catch (error) {
    next(error);
  }
};

export const removeContribution = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.contributionId)) return fail(res, 404, NOT_FOUND);
    const goal = await Goal.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!goal) return fail(res, 404, NOT_FOUND);
    const item = goal.contributions.id(req.params.contributionId);
    if (!item) return fail(res, 404, NOT_FOUND);
    const saved = goal.contributions.reduce((sum, row) => sum + row.amountMinor, 0);
    if (saved - item.amountMinor < 0) return fail(res, 400, GENERIC_INVALID);
    item.deleteOne();
    await goal.save();
    res.json({ success: true, goal: goalDto(goal) });
  } catch (error) {
    next(error);
  }
};

const MAX_SAVING_ENTRIES = 1000;
const savingDto = (entry) => ({ id: String(entry._id), amount: toMajor(entry.amountMinor), currency: entry.currency, date: dayOf(entry.date), note: entry.note || '' });

export const listSavings = async (req, res, next) => {
  try {
    const entries = await SavingEntry.find({ orgId: req.user.orgId }).sort({ date: -1, createdAt: -1 }).limit(MAX_SAVING_ENTRIES).lean();
    res.json({ success: true, entries: entries.map(savingDto) });
  } catch (error) {
    next(error);
  }
};

// body: { amount, currency, direction: 'in' | 'out', date?, note? }
export const addSaving = async (req, res, next) => {
  try {
    const body = req.body || {};
    const amountMinor = parseAmountMinor(body.amount);
    const date = body.date ? parseDay(body.date) : parseDay(new Date().toISOString().slice(0, 10));
    const note = optionalText(body.note, 80);
    if (amountMinor === undefined || !date || note === undefined || !isSupportedCurrency(body.currency)) return fail(res, 400, GENERIC_INVALID);
    if (body.direction !== undefined && body.direction !== 'in' && body.direction !== 'out') return fail(res, 400, GENERIC_INVALID);
    if ((await SavingEntry.countDocuments({ orgId: req.user.orgId })) >= MAX_SAVING_ENTRIES) return fail(res, 400, GENERIC_INVALID);
    const entry = await SavingEntry.create({ orgId: req.user.orgId, createdBy: req.user._id, amountMinor: body.direction === 'out' ? -amountMinor : amountMinor, currency: body.currency, date, note });
    res.status(201).json({ success: true, entry: savingDto(entry) });
  } catch (error) {
    next(error);
  }
};

export const removeSaving = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, NOT_FOUND);
    const result = await SavingEntry.deleteOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!result.deletedCount) return fail(res, 404, NOT_FOUND);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
