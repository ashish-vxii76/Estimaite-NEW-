"use client";

import { useState } from "react";

type Member = {
  id?: string;
  teamId: string;
  teamName: string;
  name: string;
  resourceLevel: string;
  roleStream: string;
  location: string;
};

export function TeamCompositionEditor({
  teams,
  members,
  locations,
  levels,
  readOnly = false,
}: {
  teams: { id: string; name: string }[];
  members: Member[];
  locations: string[];
  levels: string[];
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState(members);
  const [message, setMessage] = useState("");

  function update(index: number, key: keyof Member, value: string) {
    setRows((current) =>
      current.map((row, i) => {
        if (i !== index) return row;
        if (key === "teamId") {
          const team = teams.find((t) => t.id === value);
          return { ...row, teamId: value, teamName: team?.name ?? row.teamName };
        }
        return { ...row, [key]: value };
      }),
    );
  }

  async function save() {
    const res = await fetch("/api/admin/team-composition", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members: rows }),
    });
    const json = await res.json();
    setMessage(res.ok ? "Team composition saved. New estimates will use these people and locations." : json.error);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Team Composition</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Team Name, Resource Name, Seniority, Role and Location. What-If and capacity planning only
          recommend seniorities that exist on the selected team.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              {["Team Name", "Resource Name", "Seniority", "Role", "Location", ""].map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? index} className="border-t border-[var(--line)]">
                <td className="px-2 py-1">
                  <select
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.teamId}
                    disabled={readOnly}
                    onChange={(e) => update(index, "teamId", e.target.value)}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.name}
                    disabled={readOnly}
                    onChange={(e) => update(index, "name", e.target.value)}
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.resourceLevel}
                    disabled={readOnly}
                    onChange={(e) => update(index, "resourceLevel", e.target.value)}
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.roleStream}
                    disabled={readOnly}
                    onChange={(e) => update(index, "roleStream", e.target.value)}
                  >
                    <option value="DEV">Dev</option>
                    <option value="QA">QA</option>
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select
                    className="w-full rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1"
                    value={row.location}
                    disabled={readOnly}
                    onChange={(e) => update(index, "location", e.target.value)}
                  >
                    {locations.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  {readOnly ? null : (
                  <button
                    className="text-xs text-rose-300"
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {readOnly ? (
        <p className="text-sm text-[var(--muted)]">Team composition is read-only for this profile.</p>
      ) : (
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-[var(--line)] px-3 py-2"
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                teamId: teams[0]?.id ?? "",
                teamName: teams[0]?.name ?? "",
                name: "New resource",
                resourceLevel: "intermediate",
                roleStream: "DEV",
                location: locations[0] ?? "India",
              },
            ])
          }
        >
          Add resource
        </button>
        <button className="btn-primary" onClick={save}>
          Save composition
        </button>
      </div>
      )}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
    </div>
  );
}
