import { Response } from "express";
import { Order } from "../models/Order";
import { catchAsync } from "../utils/catchAsync";
import { refundOrder } from "../services/payments.service";
import { AuthedRequest } from "../middleware/auth";

export const listOrders = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { page = "1", limit = "25", status } = req.query as Record<string, string>;
  const filter = status ? { status } : {};

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "name email")
      .populate("courseIds", "title price")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, page: Number(page), limit: Number(limit), total });
});

export const refundOrderById = catchAsync(async (req: AuthedRequest, res: Response) => {
  const order = await refundOrder(req.params.id);
  res.json({ order });
});
