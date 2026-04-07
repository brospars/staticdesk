import { setResponseHeaders, type H3Event } from "h3"

export function setCorsHeaders(event: H3Event) {
  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  })
}
