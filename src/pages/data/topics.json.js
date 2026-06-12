import { topics } from "../../lib/data.js";

export function GET() {
  return new Response(JSON.stringify({ topics }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
