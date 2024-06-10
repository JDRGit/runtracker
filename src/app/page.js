"use client";

import { useState } from "react";
import ClientLayout from "./ClientLayout";
import LogRunForm from "./LogRunForm";
import RunList from "./RunList";
import "./globals.css";
export default function Home() {
  const [runs, setRuns] = useState([]);

  const handleLogRun = (run) => {
    setRuns([run, ...runs]);
  };

  return (
    <ClientLayout>
      <h2 className="text-2xl font-bold mb-4">Welcome to RunTracker</h2>
      <p className="text-gray-700 mb-4">Track your running activities here.</p>
      <LogRunForm onLog={handleLogRun} />
      <RunList runs={runs} />
    </ClientLayout>
  );
}
