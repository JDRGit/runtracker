import { v4 as uuidv4 } from "uuid";
import { enforceSameOrigin, requireAuth } from "../../lib/auth";
import { logApiError } from "../../lib/requestLogger";
import { applyRateLimit } from "../../lib/rateLimit";
import { validateRunInput } from "../../lib/runs";
import { createRun, deleteRunById, getRuns } from "../../lib/runStore";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!applyRateLimit(req, res, { limit: 60, scope: "runs:get", windowMs: 60_000 })) {
        return;
      }

      const session = await requireAuth(req, res);

      if (!session) {
        return;
      }

      res.status(200).json(await getRuns(session.user.id));
      return;
    }

    if (req.method === "POST") {
      if (!applyRateLimit(req, res, { limit: 20, scope: "runs:post", windowMs: 60_000 })) {
        return;
      }

      const sameOriginAllowed = enforceSameOrigin(req, res);

      if (!sameOriginAllowed) {
        return;
      }

      const session = await requireAuth(req, res);

      if (!session) {
        return;
      }

      const validation = validateRunInput(req.body ?? {});

      if (!validation.isValid) {
        res.status(400).json({ error: validation.errors[0] });
        return;
      }

      const newRun = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...validation.value,
      };

      res.status(201).json(await createRun(session.user.id, newRun));
      return;
    }

    if (req.method === "DELETE") {
      if (!applyRateLimit(req, res, { limit: 20, scope: "runs:delete", windowMs: 60_000 })) {
        return;
      }

      const sameOriginAllowed = enforceSameOrigin(req, res);

      if (!sameOriginAllowed) {
        return;
      }

      const session = await requireAuth(req, res);

      if (!session) {
        return;
      }

      const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";

      if (!id) {
        res.status(400).json({ error: "Run id is required." });
        return;
      }

      const deleted = await deleteRunById(session.user.id, id);

      if (!deleted) {
        res.status(404).json({ error: "Run not found." });
        return;
      }

      res.status(200).json({ id });
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (error) {
    logApiError(req, "runs.error", error);
    res.status(500).json({ error: "Unexpected server error." });
  }
}
