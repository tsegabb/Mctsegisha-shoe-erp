import { asyncHandler } from '../utils/asyncHandler.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { salesService } from '../services/sales.service.ts';
import { cashService } from '../services/cash.service.ts';
import { reportsService } from '../services/reports.service.ts';
import { resolveWarehouseScope } from '../services/scope.service.ts';

const ok = apiResponse.success;

export const salesController = {
  list: asyncHandler(async (req, res) => ok(res, await salesService.list(req.user!, req.valid!.query))),
  create: asyncHandler(async (req, res) => ok(res, await salesService.create(req.user!, req.valid!.body), 201)),
  processReturn: asyncHandler(async (req, res) => ok(res, await salesService.processReturn(req.user!, req.valid!.body))),
  reconcile: asyncHandler(async (req, res) => {
    const q = req.valid!.query;
    ok(res, await salesService.reconcile(await resolveWarehouseScope(req.user!, q.warehouseId ?? q.shopId)));
  }),
};

export const cashController = {
  summary: asyncHandler(async (req, res) => ok(res, await cashService.summary(req.user!, req.valid!.query.shopId ?? req.valid!.query.warehouseId))),
  drop: asyncHandler(async (req, res) => ok(res, await cashService.drop(req.user!, req.valid!.body.amount, req.valid!.body.note, req.valid!.body.shopId), 200, 'Cash drop processed successfully')),
  float: asyncHandler(async (req, res) => ok(res, await cashService.setFloat(req.user!, req.valid!.body.amount, req.valid!.body.note, req.valid!.body.shopId), 200, 'Opening float updated successfully')),
  activity: asyncHandler(async (req, res) => ok(res, await cashService.record(req.user!, req.valid!.body), 200, 'Cash activity recorded successfully')),
};

export const reportsController = {
  stats: asyncHandler(async (req, res) => ok(res, await reportsService.getStats(req.user!, req.valid!.query.warehouseId ?? req.valid!.query.shopId))),
  dashboard: asyncHandler(async (req, res) => ok(res, await reportsService.getDashboard(req.user!, req.valid!.query.warehouseId ?? req.valid!.query.shopId))),
};
