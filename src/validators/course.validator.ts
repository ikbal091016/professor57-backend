import { z } from "zod";

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(20).max(5000),
    category: z.string().trim().min(2).max(60),
    price: z.number().min(0).max(5000),
    thumbnailUrl: z.string().url().optional(),
  }),
});

export const updateCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    category: z.string().trim().min(2).max(60).optional(),
    price: z.number().min(0).max(5000).optional(),
    thumbnailUrl: z.string().url().optional(),
    published: z.boolean().optional(),
  }),
});

export const listCoursesQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

export const createSectionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(160),
    order: z.number().int().min(0).optional(),
  }),
});

export const updateSectionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    order: z.number().int().min(0).optional(),
  }),
});

export const reorderSchema = z.object({
  body: z.object({
    // Ordered list of IDs; the array index becomes the new `order` value.
    orderedIds: z.array(z.string()).min(1),
  }),
});

const resourceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  url: z.string().url(),
});

export const createLectureSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    videoProvider: z.enum(["youtube", "mux"]),
    videoRef: z.string().trim().min(1),
    durationSec: z.number().int().min(0),
    order: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    resources: z.array(resourceSchema).optional(),
  }),
});

export const updateLectureSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    videoProvider: z.enum(["youtube", "mux"]).optional(),
    videoRef: z.string().trim().min(1).optional(),
    durationSec: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    resources: z.array(resourceSchema).optional(),
  }),
});
