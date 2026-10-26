import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common';
import { createFeedbackSchema, listFeedbackQuerySchema, updateFeedbackStatusSchema } from '../schemas/feedback.schema';
import * as feedbackService from '../services/feedback.service';
import { currentUser } from '../middleware/auth';

export async function create(req: Request, res: Response) {
  const input = createFeedbackSchema.parse(req.body ?? {});
  // המזהה של השולח נלקח מהטוקן. שדה userId שהלקוח ישלח פשוט יתעלם.
  const feedback = await feedbackService.createFeedback(currentUser(req).id, input);
  res.status(201).json({ feedback });
}

export async function list(req: Request, res: Response) {
  res.json(await feedbackService.listFeedback(listFeedbackQuerySchema.parse(req.query)));
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const { status } = updateFeedbackStatusSchema.parse(req.body ?? {});
  res.json({ feedback: await feedbackService.updateFeedbackStatus(id, status) });
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await feedbackService.deleteFeedback(id);
  res.status(204).end();
}
