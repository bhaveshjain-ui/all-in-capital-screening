import { CRITERIA } from "@/lib/framework/config";
import { currentValues, FRAMEWORK_DEFAULTS } from "@/lib/settings";
import { getStore } from "@/lib/store";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const doc = await getStore().getSettings();
  const current = currentValues(doc);
  const history = [...(doc?.history ?? [])].reverse();
  return (
    <>
      <h1>Settings</h1>
      <p className="muted">
        The weights and thresholds the scoring uses. They start at the framework&apos;s provisional values, which were derived from
        twelve memos and are <strong>not the fund&apos;s own</strong>: the partners are meant to set them. Every change needs a reason
        and is kept below.
      </p>
      <div className="notice">
        Saved settings apply to new scoring runs. An application that was already scored keeps the values it was scored with until
        someone presses &quot;Recompute with the saved settings&quot; on its page, so nothing changes silently. Key criteria by business type
        are not editable here yet.
      </div>
      {!doc && <p className="small muted">No change has been saved yet: these are the framework&apos;s starting values.</p>}

      <SettingsForm
        criteria={CRITERIA.map((c) => ({ id: c.id, name: c.name, why: c.rationale }))}
        current={current}
        defaults={FRAMEWORK_DEFAULTS()}
      />

      <h2>History of changes ({history.length})</h2>
      {history.length === 0 ? (
        <p className="muted small">No changes yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>Why</th><th>What changed</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.at).toLocaleString("en-IN")}</td>
                  <td>{h.by}</td>
                  <td>{h.reason}</td>
                  <td><ul className="small">{h.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
