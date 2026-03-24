import "@neondatabase/auth/ui/css";
import "./globals.css";
import NeonAuthProvider from "./NeonAuthProvider";

export const metadata = {
  title: "RunTracker",
  description: "Log your runs, track your pace, and keep your training history organized.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NeonAuthProvider>{children}</NeonAuthProvider>
      </body>
    </html>
  );
}
