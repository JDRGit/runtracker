export const metadata = {
  title: 'RunTracker',
  description: 'Track your running activities',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
