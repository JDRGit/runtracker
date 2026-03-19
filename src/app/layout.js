import "./globals.css";

export const metadata = {
  title: "RunTracker",
  description: "Log your runs, track your pace, and keep your training history organized.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
