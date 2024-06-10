"use client"

export default function RunList({ runs }) {
  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Logged Runs</h3>
      <ul className="space-y-2">
        {runs.map((run, index) => (
          <li key={index} className="bg-white p-4 rounded shadow-md">
            <p className="text-gray-700">Date: {run.date}</p>
            <p className="text-gray-700">Distance: {run.distance} km</p>
            <p className="text-gray-700">Time: {run.time} minutes</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
