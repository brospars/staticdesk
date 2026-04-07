import { defineEventHandler, setResponseStatus } from "h3"

import { setCorsHeaders } from "../../utils/cors"

export default defineEventHandler((event) => {
  setCorsHeaders(event)
  setResponseStatus(event, 204)
  return ""
})
