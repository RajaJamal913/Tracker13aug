"use client";
import { useEffect, useState } from "react";
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

export default function TeamsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);

  // fetch all members
  useEffect(() => {
    fetch("/api/members/") // adjust API endpoint
      .then((res) => res.json())
      .then((data) => setMembers(data))
      .catch((err) => console.error("Failed to load members", err));
  }, []);

  // fetch existing teams
  useEffect(() => {
    fetch("/api/teams/") // adjust API endpoint
      .then((res) => res.json())
      .then((data) => setTeams(data))
      .catch((err) => console.error("Failed to load teams", err));
  }, []);

  const handleCreateTeam = async () => {
    if (!teamName.trim() || selectedMembers.length === 0) return;

    const newTeam = {
      name: teamName,
      member_ids: selectedMembers.map((m) => m.id),
    };

    try {
      const res = await fetch("/api/teams/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeam),
      });

      if (res.ok) {
        const savedTeam = await res.json();
        setTeams((prev) => [...prev, savedTeam]);
        setTeamName("");
        setSelectedMembers([]);
      }
    } catch (error) {
      console.error("Failed to create team:", error);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    try {
      await fetch(`/api/teams/${id}/`, { method: "DELETE" });
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete team:", error);
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
            <li
              key={team.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <strong>{team.name}</strong>
                <div>
                  {team.members.map((m) => (
                    <span key={m.id} className="badge bg-secondary me-1">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDeleteTeam(team.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
