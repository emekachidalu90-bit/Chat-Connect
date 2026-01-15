import { z } from 'zod';
import { insertGroupSchema, insertMessageSchema, groups, messages, groupMembers, users } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  groups: {
    list: {
      method: 'GET' as const,
      path: '/api/groups',
      responses: {
        200: z.array(z.custom<typeof groups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/groups',
      input: insertGroupSchema,
      responses: {
        201: z.custom<typeof groups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/groups/:id',
      responses: {
        200: z.custom<typeof groups.$inferSelect & { members: any[] }>(),
        404: errorSchemas.notFound,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/groups/:id/join',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    }
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/groups/:groupId/messages',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect & { sender: typeof users.$inferSelect }>()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/groups/:groupId/messages',
      input: z.object({
        content: z.string(),
        imageUrl: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

// ============================================
// WEBSOCKET EVENTS
// ============================================
export const ws = {
  // Client sends these
  send: {
    message: z.object({ groupId: z.number(), content: z.string(), imageUrl: z.string().optional() }),
    typing: z.object({ groupId: z.number(), isTyping: z.boolean() }),
    joinRoom: z.object({ groupId: z.number() }),
  },
  // Server broadcasts these
  receive: {
    message: z.object({ 
      id: z.number(), 
      groupId: z.number(), 
      senderId: z.string(), 
      content: z.string(), 
      imageUrl: z.string().optional(),
      createdAt: z.string(),
      sender: z.custom<typeof users.$inferSelect>(),
    }),
    typing: z.object({ groupId: z.number(), userId: z.string(), isTyping: z.boolean() }),
  },
};

// ============================================
// REQUIRED: buildUrl helper
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
