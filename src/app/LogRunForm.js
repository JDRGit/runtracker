"use client"

import { useState } from 'react'

export default function LogRunForm({ onLog }) {
  const [date, setDate] = useState('')
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onLog({ date, distance, time })
    setDate('')
    setDistance('')
    setTime('')
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
