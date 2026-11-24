import Link from "next/link";
import { getStore, storeProblem } from "@/lib/store";
import UploadForm from "./upload-form";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  not_run: "Claims not extracted",
  done: "Claims extracted",
  error: "Extraction failed",
};

export default async function ApplicationsPage() {
  if (storeProblem()) {
    return (
      <>
        <h1>Applications</h1>
        <p className="muted">Applications cannot be listed or uploaded until the database is connected (see the notice above).</p>
      </>
    );
  }
  const apps = await getStore().list();
  return (
    <>
      <h1>Applications</h1>
      <p className="muted">
        Upload an application&apos;s deck and form. The app reads the text, then extracts the claims, recomputes the figures
        and lists where the deck and the form disagree.
      </p>

      <UploadForm />

      <h2>Received ({apps.length})</h2>
      {apps.length === 0 ? (
        <p className="muted">No applications yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Status</th>
                <th className="num">Deck–form conflicts</th><th className="num">Figures not matching</th><th>Added</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/applications/${a.id}`}>{a.name}</Link></td>
                  <td>{STATUS[a.extractionStatus]}</td>
                  <td className="num">{a.extractionStatus === "done" ? a.conflicts : "–"}</td>
                  <td className="num">{a.extractionStatus === "done" ? a.mismatches : "–"}</td>
                  <td>{new Date(a.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
