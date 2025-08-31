// TeamsPage.tsx
"use client";

import React, { JSX, useEffect, useState } from "react";
import { MultiSelect } from "primereact/multiselect";

interface Member {
  id: number;
  name: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
  members: Member[];
}

export default function TeamsPage(): JSX.Element {
  // single source of truth for backend host
  const API_HOST =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_HOST ?? "http://127.0.0.1:8000"
      : process.env.NEXT_PUBLIC_API_HOST ?? "http://127.0.0.1:8000";

  // convenience endpoints
  const MEMBERS_URL = `${API_HOST}/api/members/`;
  const TEAMS_URL = `${API_HOST}/api/teams/`;

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]); // store ids
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Robust normalizer for many API shapes
  const normalizeMember = (m: any): Member => {
    // If payload is just an id number, return placeholder
    if (typeof m === "number") {
      return { id: m, name: `Member#${m}`, email: "" };
    }

    const id = m.id ?? m.pk ?? (m.user && m.user.id) ?? (m.user_id ?? undefined);
    // name candidates
    let name: string | null = null;
    let email: string | null = null;

    // common top-level fields
    name = m.full_name ?? m.name ?? m.display_name ?? null;
    email = m.email ?? m.contact_email ?? null;

    // nested user object
    if (!name && m.user) {
      const u = m.user;
      const first = u.first_name ?? u.first ?? "";
      const last = u.last_name ?? u.last ?? "";
      const maybeFull = (first || last) ? `${first} ${last}`.trim() : "";
      // prefer full name -> username -> email
      name = maybeFull || (typeof u.get_full_name === "function" ? u.get_full_name() : null) || u.full_name || u.username || null;
      email = email || u.email || null;
    }

    // some backends return a nested profile/person
    if (!name && m.profile) {
      name = m.profile.display_name ?? m.profile.name ?? null;
    }
    if (!name && m.person) {
      name = m.person.name ?? null;
    }

    // fallback to username/email local parts
    if (!name && email) name = email.split("@")[0];
    if (!name && m.username) name = m.username;
    if (!name && id) name = `Member#${id}`;
    if (!email) email = email ?? "";

    return { id: Number(id ?? -1), name: String(name), email: String(email) };
  };

  const findMemberById = (id: number): Member | null => {
    return members.find((m) => Number(m.id) === Number(id)) ?? null;
  };

  // Fetch members
  useEffect(() => {
    if (!token) return;

    fetch(MEMBERS_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        return res.json();
      })
      .then((data: any) => {
        // Support both plain array and paginated responses { results: [...] }
        const items = Array.isArray(data) ? data : data.results ?? [];
        const mapped = items.map(normalizeMember);
        setMembers(mapped);
      })
      .catch((err) => {
        console.error("Error fetching members:", err);
        setMembers([]);
      });
  }, [token, MEMBERS_URL]);

  // Fetch existing teams
  useEffect(() => {
    if (!token) return;

    fetch(TEAMS_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data.results ?? [];
        const teamsMapped = list.map((t: any) => ({
          id: t.id,
          name: t.name,
          members: (t.members ?? []).map((m: any) => normalizeMember(m)),
        }));
        setTeams(teamsMapped);
      })
      .catch((err) => {
        console.error("Failed to load teams", err);
        setTeams([]);
      });
  }, [token, TEAMS_URL]);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || selectedMembers.length === 0 || !token) return;

    const payload = {
      name: teamName.trim(),
      member_ids: selectedMembers, // backend expected field — adjust if different
    };

    try {
      const res = await fetch(TEAMS_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Create failed", res.status, res.statusText, txt);
        return;
      }

      const saved = await res.json();

      // saved.members may be either array of ids or array of objects — normalize accordingly
      const savedMembers = (saved.members ?? []).map((m: any) => {
        if (typeof m === "number") {
          const found = findMemberById(m);
          return found ?? { id: m, name: `Member#${m}`, email: "" };
        }
        // sometimes backend returns nested objects; normalize them
        return normalizeMember(m);
      });

      setTeams((prev) => [
        ...prev,
        {
          id: saved.id,
          name: saved.name,
          members: savedMembers,
        },
      ]);

      // reset form
      setTeamName("");
      setSelectedMembers([]);
    } catch (err) {
      console.error("Failed to create team:", err);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${TEAMS_URL}${id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      if (!res.ok && res.status !== 204) {
        console.error("Delete failed", res.status);
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  };

  return (
    <div className="py-5 container">
      <div className="card p-4 max-w-lg mx-auto">
        <h3>Create Team</h3>

        <input
          type="text"
          className="form-control mb-3"
          placeholder="Team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />

        <MultiSelect
          value={selectedMembers}
          options={members}
          onChange={(e) => setSelectedMembers(e.value)}
          optionLabel="name"
          optionValue="id"
          placeholder="Select team members"
          filter
          display="chip"
          className="w-full mb-3"
        />

        <button className="btn btn-primary" onClick={handleCreateTeam}>
          Create Team
        </button>
      </div>

      <div className="mt-5">
        <h3>Existing Teams</h3>
        {teams.length === 0 && <p>No teams created yet.</p>}
        <ul className="list-group">
          {teams.map((team) => (
            <li key={team.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{team.name}</strong>
                <div style={{ marginTop: 8 }}>
                  {team.members.map((m) => (
                    <span key={m.id} className="badge bg-secondary me-1">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTeam(team.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
