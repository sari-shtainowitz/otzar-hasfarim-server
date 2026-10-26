import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common';
import { bookInputSchema, catalogQuerySchema, listBooksQuerySchema, newBooksQuerySchema } from '../schemas/book.schema';
import * as booksService from '../services/books.service';

export async function list(req: Request, res: Response) {
  res.json(await booksService.listBooks(listBooksQuerySchema.parse(req.query)));
}

export async function listNew(req: Request, res: Response) {
  const { days } = newBooksQuerySchema.parse(req.query);
  res.json(await booksService.listNewBooks(days));
}

export async function catalog(req: Request, res: Response) {
  const { sort } = catalogQuerySchema.parse(req.query);
  res.json(await booksService.getCatalog(sort));
}

export async function getOne(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json(await booksService.getBook(id));
}

export async function create(req: Request, res: Response) {
  const result = await booksService.createBook(bookInputSchema.parse(req.body ?? {}));
  res.status(result.merged ? 200 : 201).json(result);
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ book: await booksService.updateBook(id, bookInputSchema.parse(req.body ?? {})) });
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await booksService.deleteBook(id);
  res.status(204).end();
}
