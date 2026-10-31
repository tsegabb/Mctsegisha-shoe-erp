import { asyncHandler } from '../utils/asyncHandler.ts';
import { apiResponse } from '../utils/apiResponse.ts';
import { authService } from '../services/auth.service.ts';
import { usersService } from '../services/users.service.ts';
import type { CreateUserInput, UpdateUserInput } from '../validators/auth.validator.ts';

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.valid!.body;
    apiResponse.success(res, await authService.login(email, password));
  }),
  me: asyncHandler(async (req, res) => apiResponse.success(res, await authService.me(req.user!))),
  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!, req.valid!.body.currentPassword, req.valid!.body.newPassword);
    apiResponse.success(res, { changed: true });
  }),

  listUsers: asyncHandler(async (_req, res) => apiResponse.success(res, await usersService.list())),
  createUser: asyncHandler(async (req, res) => apiResponse.success(res, await usersService.create(req.user!, req.valid!.body as CreateUserInput), 201)),
  updateUser: asyncHandler(async (req, res) => apiResponse.success(res, await usersService.update(req.user!, req.valid!.params.id, req.valid!.body as UpdateUserInput))),
  deleteUser: asyncHandler(async (req, res) => {
    await usersService.remove(req.user!, req.valid!.params.id);
    apiResponse.success(res, { deletedId: req.valid!.params.id });
  }),
  resetPassword: asyncHandler(async (req, res) => {
    await usersService.resetPassword(req.user!, req.valid!.params.id, req.valid!.body.newPassword);
    apiResponse.success(res, { reset: true });
  }),
};
