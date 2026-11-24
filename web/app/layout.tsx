import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { sendMode } from "@/lib/email/send";
import { storeProblem } from "@/lib/store";
import Sidebar from "./sidebar";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: "All In Capital Screening",
  description: "Evidence-based first read of inbound applications, for partner review.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = sendMode();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <div className="frame">
          <div className="shell">
            <Sidebar />
            <div className="panel">
              <div className="topbar">
                <span>{today}</span>
                <span className={mode === "live" ? "pill pill-live" : "pill pill-test"}>
                  {mode === "live" ? "Email: live, real messages are sent" : "Email: test mode, nothing is sent"}
                </span>
              </div>
              <main className="page">
                {storeProblem() && <div className="notice" role="alert">{storeProblem()}</div>}
                {children}
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
