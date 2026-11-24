import type { Metadata } from "next";
import "./globals.css";
import { storeProblem } from "@/lib/store";

export const metadata: Metadata = {
  title: "All In Capital Screening",
  description: "Evidence-based first read of inbound applications, for partner review.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="brand">All In Capital</span>
          <span className="tag">Application screening · trial build</span>
          <nav className="nav"><a href="/">Framework</a><a href="/applications">Applications</a><a href="/evaluation">Evaluation</a><a href="/settings">Settings</a></nav>
        </header>
        <main className="page">
          {storeProblem() && <div className="notice" role="alert">{storeProblem()}</div>}
          {children}
        </main>
      </body>
    </html>
  );
}
