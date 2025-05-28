import { ObjectId } from "mongodb"
import { z } from "zod/v4"

export const OBJECT_ID = z.string().refine(ObjectId.isValid, { message: 'Invalid ID format' })
export const DATE = z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid ISO date format"
})