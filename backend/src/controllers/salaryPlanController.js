import mongoose from 'mongoose';
import SalaryPlan from '../models/SalaryPlan.js';
import Category from '../models/Category.js';
import IncomeStream from '../models/IncomeStream.js';
import { toMajor, parseAmountMinor } from '../utils/financeInput.js';
import { isSupportedCurrency } from '../utils/currencies.js';

const GENERIC_INVALID = 'Some of the details look incomplete. Check the form and try again.';
const MAX_LINES = 40;
const MAX_LOGS = 60;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validMonth = (value) => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 2000;

const dto = (plan, month) => ({
  month,
  streamId: plan && plan.streamId ? String(plan.streamId) : null,
  detached: Boolean(plan && plan.detached),
  salary: plan && plan.detached ? toMajor(plan.salaryMinor) : 0,
  currency: plan && plan.detached ? plan.currency : null,
  lines: plan ? plan.lines.map((line) => ({ id: String(line._id), label: line.label, amount: toMajor(line.amountMinor), categoryId: line.categoryId ? String(line.categoryId) : null })) : [],
});

export const getSalaryPlan = async (req, res, next) => {
  try {
    if (!validMonth(req.params.month)) return fail(res, 400, GENERIC_INVALID);
    const plan = await SalaryPlan.findOne({ orgId: req.user.orgId, month: req.params.month }).lean();
    res.json({ success: true, plan: dto(plan, req.params.month) });
  } catch (error) {
    next(error);
  }
};

export const listSalaryPlans = async (req, res, next) => {
  try {
    const plans = await SalaryPlan.find({ orgId: req.user.orgId, detached: true }).sort({ month: -1 }).limit(MAX_LOGS).lean();
    res.json({
      success: true,
      plans: plans.map((plan) => ({
        ...dto(plan, plan.month),
        planned: toMajor(plan.lines.reduce((sum, line) => sum + line.amountMinor, 0)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const saveSalaryPlan = async (req, res, next) => {
  try {
    const month = req.params.month;
    if (!validMonth(month)) return fail(res, 400, GENERIC_INVALID);
    const body = req.body || {};
    if (!Array.isArray(body.lines) || body.lines.length > MAX_LINES) return fail(res, 400, GENERIC_INVALID);

    const lines = [];
    for (const raw of body.lines) {
      const label = typeof (raw && raw.label) === 'string' ? raw.label.replace(/\s+/g, ' ').trim() : '';
      const amountMinor = parseAmountMinor(raw && raw.amount);
      if (!label || label.length > 40 || amountMinor === undefined) return fail(res, 400, GENERIC_INVALID);
      let categoryId = null;
      if (raw.categoryId) {
        if (!mongoose.isValidObjectId(raw.categoryId)) return fail(res, 400, GENERIC_INVALID);
        const category = await Category.exists({ _id: raw.categoryId, orgId: req.user.orgId });
        if (!category) return fail(res, 400, GENERIC_INVALID);
        categoryId = raw.categoryId;
      }
      lines.push({ label, amountMinor, categoryId });
    }

    let streamId = null;
    if (body.streamId) {
      if (!mongoose.isValidObjectId(body.streamId) || !(await IncomeStream.exists({ _id: body.streamId, orgId: req.user.orgId }))) return fail(res, 400, GENERIC_INVALID);
      streamId = body.streamId;
    }

    const detached = body.detached === true;
    let salaryMinor = 0;
    let currency = null;
    if (detached) {
      salaryMinor = parseAmountMinor(body.salary);
      if (salaryMinor === undefined || !isSupportedCurrency(body.currency)) return fail(res, 400, GENERIC_INVALID);
      currency = body.currency;
    }

    const plan = await SalaryPlan.findOneAndUpdate(
      { orgId: req.user.orgId, month },
      { $set: { lines, streamId, detached, salaryMinor, currency }, $setOnInsert: { orgId: req.user.orgId, month } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, plan: dto(plan, month) });
  } catch (error) {
    next(error);
  }
};
