import { events } from "../../lib/data.js";

export function GET() {
  return new Response(JSON.stringify({ events }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
