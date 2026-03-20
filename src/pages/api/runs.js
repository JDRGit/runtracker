import { v4 as uuidv4 } from "uuid";
import { validateRunInput } from "../../lib/runs";
import { createRun, deleteRunById, getRuns } from "../../lib/runStore";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      res.status(200).json(await getRuns());
      return;
    }

    if (req.method === "POST") {
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

      res.status(201).json(await createRun(newRun));
      return;
    }

    if (req.method === "DELETE") {
      const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";

      if (!id) {
        res.status(400).json({ error: "Run id is required." });
        return;
      }

      const deleted = await deleteRunById(id);

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
    res.status(500).json({ error: error.message || "Unexpected server error." });
  }
}
