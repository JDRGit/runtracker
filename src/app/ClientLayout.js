"use client"

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-500 text-white p-4">
        <h1 className="text-xl">RunTracker</h1>
      </header>
      <main className="p-4">{children}</main>
    </div>
  )
}
