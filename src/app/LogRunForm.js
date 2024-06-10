"use client"

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export default function LogRunForm({ onLog }) {
  const [date, setDate] = useState('')
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newRun = { id: uuidv4(), date, distance, time }
    const response = await fetch('/api/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRun),
    })
    if (response.ok) {
      const savedRun = await response.json()
      onLog(savedRun)
      setDate('')
      setDistance('')
      setTime('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md">
      <div className="mb-4">
        <label className="block text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 p-2 w-full border rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Distance (km)</label>
        <input
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="mt-1 p-2 w-full border rounded"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Time (minutes)</label>
        <input
          type="number"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 p-2 w-full border rounded"
          required
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        Log Run
      </button>
    </form>
  )
}
