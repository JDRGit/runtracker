import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function getHandlers() {
  return toNextJsHandler(getAuth());
}

export async function GET(request) {
  return getHandlers().GET(request);
}

export async function POST(request) {
  return getHandlers().POST(request);
}

export async function PUT(request) {
  return getHandlers().PUT(request);
}

export async function PATCH(request) {
  return getHandlers().PATCH(request);
}

export async function DELETE(request) {
  return getHandlers().DELETE(request);
}
