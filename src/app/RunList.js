"use client"

import { useEffect, useState } from 'react'

export default function RunList({ initialRuns }) {
  const [runs, setRuns] = useState(initialRuns)

  useEffect(() => {
    const fetchRuns = async () => {
      const response = await fetch('/api/runs')
      const data = await response.json()
      setRuns(data)
    }
    fetchRuns()
  }, [])

  const handleDelete = async (id) => {
    const response = await fetch('/api/runs', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })
    if (response.ok) {
      setRuns(runs.filter(run => run.id !== id))
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Logged Runs</h3>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id} className="bg-white p-4 rounded shadow-md flex justify-between items-center">
            <div>
              <p className="text-gray-700">Date: {run.date}</p>
              <p className="text-gray-700">Distance: {run.distance} km</p>
              <p className="text-gray-700">Time: {run.time} minutes</p>
            </div>
            <button
              onClick={() => handleDelete(run.id)}
              className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
