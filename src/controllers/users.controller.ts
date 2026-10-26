import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common';
import { listUsersQuerySchema, updateRoleSchema } from '../schemas/user.schema';
import * as usersService from '../services/users.service';
import { currentUser } from '../middleware/auth';

export async function list(req: Request, res: Response) {
  res.json(await usersService.listUsers(listUsersQuerySchema.parse(req.query)));
}

export async function updateRole(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const { role } = updateRoleSchema.parse(req.body ?? {});
  res.json({ user: await usersService.updateUserRole(currentUser(req).id, id, role) });
}
