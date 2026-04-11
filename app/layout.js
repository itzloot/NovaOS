export const metadata = {
  title: "Beacon – AI Co‑Pilot",
  description: "Intelligent screen navigation assistant",
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: "#020617" }}>{children}</body>
    </html>
  );
}