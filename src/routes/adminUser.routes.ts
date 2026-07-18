import { Router } from "express";
import { listUsers, updateUserRole } from "../controllers/adminUser.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { listUsersQuerySchema, updateUserRoleSchema } from "../validators/adminUser.validator";

const router = Router();
const adminOnly = authorize("admin");

router.get("/", authenticate, adminOnly, validate(listUsersQuerySchema), listUsers);
router.patch("/:id/role", authenticate, adminOnly, validate(updateUserRoleSchema), updateUserRole);

export default router;
