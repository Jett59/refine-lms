import { z } from "zod/v4"
import { AttachmentTemplate, MarkingCriterionTemplate, PostTemplate, PostType } from "../../data/post"
import { DATE, OBJECT_ID } from "../basic.zod"

export const POST_TYPE: z.ZodType<PostType> = z.enum(['post', 'assignment'])

export const MARKING_CRITERION_TEMPLATE: z.ZodType<MarkingCriterionTemplate> = z.object({
    id: z.string().optional(), // Only used for updating; overridden by the server on creation
    title: z.string(), // TODO: min/max
    maximumMarks: z.number().int().positive()
})
export const ATTACHMENT_TEMPLATE: z.ZodType<AttachmentTemplate> = z.object({
    title: z.string(), // TODO: min/max
    thumbnail: z.string().url(), // TODO: min/max
    mimeType: z.string(), // TODO: validate mime type
    shareMode: z.enum(['shared', 'copied']),
    othersCanEdit: z.boolean(),
    host: z.literal('google'),
    googleFileId: z.string()
})
export const POST_TEMPLATE: z.ZodType<PostTemplate> = z.object({
    schoolId: OBJECT_ID,
    yearGroupId: OBJECT_ID,
    courseId: OBJECT_ID.optional(),
    classIds: z.array(OBJECT_ID).optional(),
    private: z.boolean(),
    type: POST_TYPE,
    title: z.string(), // TODO: min/max
    content: z.string(), // TODO: min/max
    linkedSyllabusContentIds: z.array(OBJECT_ID),
    attachments: z.array(ATTACHMENT_TEMPLATE),
    isoDueDate: DATE.optional(),
    submissionTemplates: z.array(ATTACHMENT_TEMPLATE).optional(),
    markingCriteria: z.array(MARKING_CRITERION_TEMPLATE).optional()
})
