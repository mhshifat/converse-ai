import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { withCorrelationError, throwNotFoundWithId, throwBadRequestWithId } from '@/server/trpc-error';
import * as contactRepo from '../repositories/contact-repository';

const customFieldsSchema = z.record(z.string(), z.unknown()).nullable().optional();

export const contactsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().nullable().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return withCorrelationError('contacts.list', async () => {
        return contactRepo.listContacts({
          tenantId: ctx.user.tenantId,
          projectId: input.projectId,
          page: input.page,
          pageSize: input.pageSize,
          search: input.search,
        });
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return withCorrelationError('contacts.getById', async (correlationId) => {
        const contact = await contactRepo.getContactById(input.id, ctx.user.tenantId);
        if (!contact) throwNotFoundWithId(correlationId, 'Contact not found');
        return contact;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().nullable().optional(),
        externalId: z.string().min(1),
        name: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        customFields: customFieldsSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('contacts.create', async () => {
        return contactRepo.createContact({
          tenantId: ctx.user.tenantId,
          projectId: input.projectId ?? null,
          externalId: input.externalId,
          name: input.name ?? null,
          email: input.email ?? null,
          customFields: input.customFields ?? null,
        });
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        customFields: customFieldsSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('contacts.update', async (correlationId) => {
        const updated = await contactRepo.updateContact(input.id, ctx.user.tenantId, {
          name: input.name,
          email: input.email,
          customFields: input.customFields,
        });
        if (!updated) throwNotFoundWithId(correlationId, 'Contact not found');
        return updated;
      });
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().nullable().optional(),
        externalId: z.string().min(1),
        name: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        customFields: customFieldsSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('contacts.upsert', async (correlationId) => {
        const result = await contactRepo.upsertContact({
          tenantId: ctx.user.tenantId,
          projectId: input.projectId ?? null,
          externalId: input.externalId,
          name: input.name ?? null,
          email: input.email ?? null,
          customFields: input.customFields ?? null,
        });
        if (!result) throwBadRequestWithId(correlationId, 'Upsert failed');
        return result;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return withCorrelationError('contacts.delete', async (correlationId) => {
        const deleted = await contactRepo.deleteContact(input.id, ctx.user.tenantId);
        if (!deleted) throwNotFoundWithId(correlationId, 'Contact not found');
        return { success: true };
      });
    }),
});
