import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { normalizeStoredRun, sortRunsByDate, validateRunInput } from "../../lib/runs";

const filePath = path.resolve(process.cwd(), "data", "runs.json");

function ensureDataFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }
}

function readData() {
  ensureDataFile();

  const jsonData = fs.readFileSync(filePath, "utf8");
  const parsedData = JSON.parse(jsonData);
  const runs = Array.isArray(parsedData) ? parsedData : [];

  return sortRunsByDate(runs.map(normalizeStoredRun).filter(Boolean));
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(sortRunsByDate(data), null, 2));
}

export default function handler(req, res) {
  try {
    if (req.method === "GET") {
      res.status(200).json(readData());
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

      const data = readData();
      writeData([newRun, ...data]);
      res.status(201).json(newRun);
      return;
    }

    if (req.method === "DELETE") {
      const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";

      if (!id) {
        res.status(400).json({ error: "Run id is required." });
        return;
      }

      const data = readData();
      const nextRuns = data.filter((run) => run.id !== id);

      if (nextRuns.length === data.length) {
        res.status(404).json({ error: "Run not found." });
        return;
      }

      writeData(nextRuns);
      res.status(200).json({ id });
      return;
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unexpected server error." });
  }
}
