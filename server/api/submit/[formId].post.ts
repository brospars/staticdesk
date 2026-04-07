import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
} from "h3"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { forms, submissions } from "../../database/schema"
import { db } from "../../utils/db"
import { setCorsHeaders } from "../../utils/cors"

const submissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
})

export default defineEventHandler(async (event) => {
  setCorsHeaders(event)

  const formId = getRouterParam(event, "formId")

  if (!formId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Form id is required.",
    })
  }

  const parsedBody = submissionSchema.safeParse(await readBody(event))

  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid submission payload.",
      data: parsedBody.error.flatten(),
    })
  }

  const form = await db.query.forms.findFirst({
    where: eq(forms.id, formId),
    columns: {
      id: true,
      workspaceId: true,
    },
  })

  if (!form) {
    throw createError({
      statusCode: 404,
      statusMessage: "Form not found.",
    })
  }

  await db.insert(submissions).values({
    formId: form.id,
    workspaceId: form.workspaceId,
    senderName: parsedBody.data.name,
    senderEmail: parsedBody.data.email,
    message: parsedBody.data.message,
    status: "new",
  })

  setResponseStatus(event, 201)

  return {
    success: true,
  }
})
