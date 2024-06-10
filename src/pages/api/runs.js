import fs from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), 'data', 'runs.json');

const readData = () => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const jsonData = fs.readFileSync(filePath);
  return JSON.parse(jsonData);
};

const writeData = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export default function handler(req, res) {
  if (req.method === 'GET') {
    const data = readData();
    res.status(200).json(data);
  } else if (req.method === 'POST') {
    const newRun = req.body;
    const data = readData();
    data.push(newRun);
    writeData(data);
    res.status(201).json(newRun);
  } else if (req.method === 'DELETE') {
    const { id } = req.body;
    let data = readData();
    data = data.filter(run => run.id !== id);
    writeData(data);
    res.status(200).json({ id });
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
