"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useMemo, useState } from "react";
import {
  conferenceDefaultColors,
  initialConferences,
  initialTeamCoordinates,
  teamDefaultColors,
} from "./fbsSeed";

type Region = "West" | "Midwest" | "South" | "Northeast";
type SortMode = "name" | "region" | "conference";

type Team = {
  id: string;
  name: string;
  region: Region;
};

type Conference = {
  id: string;
  name: string;
  footprint: Region;
  teams: Team[];
};

type TeamWithConference = Team & {
  conferenceId: string;
  conferenceName: string;
};

type SavedState = {
  conferences?: Conference[];
  conferenceColors?: Record<string, string>;
  teamColors?: Record<string, string>;
  teamCoordinates?: Record<string, { lat: number; lng: number }>;
  visibleConferences?: Record<string, boolean>;
  visibleTeams?: Record<string, boolean>;
  sortMode?: SortMode;
};

const regions: Region[] = ["West", "Midwest", "South", "Northeast"];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ensureUniqueId(base: string, usedIds: string[]): string {
  let id = base;
  let counter = 2;
  while (usedIds.includes(id) || id.length === 0) {
    id = `${base || "item"}-${counter}`;
    counter += 1;
  }
  return id;
}

const ConferenceMap = dynamic(() => import("./components/ConferenceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950/70 text-sm text-slate-300">
      Loading map canvas...
    </div>
  ),
});

const regionDistance: Record<Region, Record<Region, number>> = {
  West: { West: 1, Midwest: 2, South: 3, Northeast: 4 },
  Midwest: { West: 2, Midwest: 1, South: 2, Northeast: 2 },
  South: { West: 3, Midwest: 2, South: 1, Northeast: 2 },
  Northeast: { West: 4, Midwest: 2, South: 2, Northeast: 1 },
};

function conferenceTravelScore(conference: Conference): number {
  return conference.teams.reduce((score, team) => {
    return score + regionDistance[conference.footprint][team.region];
  }, 0);
}

function moveTeamToConference(
  current: Conference[],
  teamId: string,
  destinationConferenceId: string,
): Conference[] {
  let movedTeam: Team | undefined;

  for (const conference of current) {
    const found = conference.teams.find((team) => team.id === teamId);
    if (found) {
      movedTeam = found;
      break;
    }
  }

  if (!movedTeam) return current;

  return current.map((conference) => {
    if (conference.id === destinationConferenceId) {
      if (conference.teams.some((team) => team.id === teamId)) {
        return conference;
      }
      return { ...conference, teams: [...conference.teams, movedTeam] };
    }

    return {
      ...conference,
      teams: conference.teams.filter((team) => team.id !== teamId),
    };
  });
}

function sortTeams(teams: TeamWithConference[], mode: SortMode): TeamWithConference[] {
  return [...teams].sort((a, b) => {
    if (mode === "region") {
      return a.region.localeCompare(b.region) || a.name.localeCompare(b.name);
    }
    if (mode === "conference") {
      return a.conferenceName.localeCompare(b.conferenceName) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

function getTeamColor(
  teamId: string,
  conferenceId: string,
  teamColors: Record<string, string>,
  conferenceColors: Record<string, string>,
): string {
  return teamColors[teamId] ?? conferenceColors[conferenceId] ?? "#64748b";
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[24px] border border-white/10 bg-[var(--panel-strong)] p-4"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {badge && <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{badge}</span>}
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition group-open:bg-white/10">
          <span className="group-open:hidden">Expand</span>
          <span className="hidden group-open:inline">Collapse</span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export default function Home() {
  const [conferences, setConferences] = useState<Conference[]>(initialConferences);
  const [sortMode, setSortMode] = useState<SortMode>("conference");
  const [draggingTeamId, setDraggingTeamId] = useState<string | null>(null);
  const [conferenceColors, setConferenceColors] =
    useState<Record<string, string>>(conferenceDefaultColors);
  const [teamColors, setTeamColors] = useState<Record<string, string>>(teamDefaultColors);
  const [teamCoordinates, setTeamCoordinates] =
    useState<Record<string, { lat: number; lng: number }>>(initialTeamCoordinates);
  const [visibleConferences, setVisibleConferences] = useState<Record<string, boolean>>(
    Object.fromEntries(initialConferences.map((conference) => [conference.id, true])),
  );
  const [visibleTeams, setVisibleTeams] = useState<Record<string, boolean>>(
    Object.fromEntries(
      initialConferences
        .flatMap((conference) => conference.teams)
        .map((team) => [team.id, true]),
    ),
  );
  const [newConferenceName, setNewConferenceName] = useState("");
  const [newConferenceFootprint, setNewConferenceFootprint] = useState<Region>("Midwest");
  const [newConferenceColor, setNewConferenceColor] = useState("#334155");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamRegion, setNewTeamRegion] = useState<Region>("Midwest");
  const [newTeamConferenceId, setNewTeamConferenceId] = useState(initialConferences[0].id);
  const [newTeamLat, setNewTeamLat] = useState("39.8");
  const [newTeamLng, setNewTeamLng] = useState("-98.5");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const teams = useMemo<TeamWithConference[]>(() => {
    return conferences.flatMap((conference) =>
      conference.teams.map((team) => ({
        ...team,
        conferenceId: conference.id,
        conferenceName: conference.name,
      })),
    );
  }, [conferences]);

  const sortedTeams = useMemo(() => sortTeams(teams, sortMode), [teams, sortMode]);

  const mapTeams = useMemo(() => {
    return teams
      .filter((team) => (visibleConferences[team.conferenceId] ?? true) && (visibleTeams[team.id] ?? true))
      .map((team) => {
        const coordinates = teamCoordinates[team.id];
        if (!coordinates) return null;
        return {
          id: team.id,
          name: team.name,
          conferenceId: team.conferenceId,
          lat: coordinates.lat,
          lng: coordinates.lng,
          color: getTeamColor(team.id, team.conferenceId, teamColors, conferenceColors),
        };
      })
      .filter((team): team is NonNullable<typeof team> => Boolean(team));
  }, [conferenceColors, teamColors, teamCoordinates, teams, visibleConferences, visibleTeams]);

  const totals = useMemo(() => {
    const travelScore = conferences.reduce((sum, conference) => sum + conferenceTravelScore(conference), 0);
    return {
      conferenceCount: conferences.length,
      teamCount: teams.length,
      travelScore,
    };
  }, [conferences, teams.length]);

  function onDragTeamStart(teamId: string) {
    setDraggingTeamId(teamId);
  }

  function onDropTeam(destinationConferenceId: string) {
    if (!draggingTeamId) return;
    setConferences((current) => moveTeamToConference(current, draggingTeamId, destinationConferenceId));
    setDraggingTeamId(null);
  }

  function resetAll() {
    setConferences(initialConferences);
    setSortMode("conference");
    setDraggingTeamId(null);
    setConferenceColors(conferenceDefaultColors);
    setTeamColors(teamDefaultColors);
    setTeamCoordinates(initialTeamCoordinates);
    setVisibleConferences(Object.fromEntries(initialConferences.map((conference) => [conference.id, true])));
    setVisibleTeams(
      Object.fromEntries(
        initialConferences
          .flatMap((conference) => conference.teams)
          .map((team) => [team.id, true]),
      ),
    );
    setNewConferenceName("");
    setNewConferenceFootprint("Midwest");
    setNewConferenceColor("#334155");
    setNewTeamName("");
    setNewTeamRegion("Midwest");
    setNewTeamConferenceId(initialConferences[0].id);
    setNewTeamLat("39.8");
    setNewTeamLng("-98.5");
  }

  function addConference() {
    if (!newConferenceName.trim()) return;
    const conferenceId = ensureUniqueId(
      slugify(newConferenceName),
      conferences.map((conference) => conference.id),
    );

    const newConference: Conference = {
      id: conferenceId,
      name: newConferenceName.trim(),
      footprint: newConferenceFootprint,
      teams: [],
    };

    setConferences((current) => [...current, newConference]);
    setConferenceColors((current) => ({ ...current, [conferenceId]: newConferenceColor }));
    setVisibleConferences((current) => ({ ...current, [conferenceId]: true }));
    setNewTeamConferenceId(conferenceId);
    setNewConferenceName("");
  }

  function deleteConference(conferenceId: string) {
    const conference = conferences.find((item) => item.id === conferenceId);
    if (!conference) return;

    const teamIds = conference.teams.map((team) => team.id);

    setConferences((current) => current.filter((item) => item.id !== conferenceId));
    setConferenceColors((current) => {
      const next = { ...current };
      delete next[conferenceId];
      return next;
    });
    setVisibleConferences((current) => {
      const next = { ...current };
      delete next[conferenceId];
      return next;
    });
    setTeamColors((current) => {
      const next = { ...current };
      for (const teamId of teamIds) delete next[teamId];
      return next;
    });
    setVisibleTeams((current) => {
      const next = { ...current };
      for (const teamId of teamIds) delete next[teamId];
      return next;
    });
    setTeamCoordinates((current) => {
      const next = { ...current };
      for (const teamId of teamIds) delete next[teamId];
      return next;
    });
    if (newTeamConferenceId === conferenceId) {
      const fallback = conferences.find((item) => item.id !== conferenceId)?.id ?? "";
      setNewTeamConferenceId(fallback);
    }
  }

  function addTeam() {
    if (!newTeamName.trim() || !newTeamConferenceId) return;
    const lat = Number(newTeamLat);
    const lng = Number(newTeamLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const teamId = ensureUniqueId(
      slugify(newTeamName),
      teams.map((team) => team.id),
    );

    const newTeam: Team = {
      id: teamId,
      name: newTeamName.trim(),
      region: newTeamRegion,
    };

    setConferences((current) =>
      current.map((conference) =>
        conference.id === newTeamConferenceId
          ? { ...conference, teams: [...conference.teams, newTeam] }
          : conference,
      ),
    );
    setVisibleTeams((current) => ({ ...current, [teamId]: true }));
    setTeamCoordinates((current) => ({ ...current, [teamId]: { lat, lng } }));
    setNewTeamName("");
  }

  function deleteTeam(teamId: string) {
    setConferences((current) =>
      current.map((conference) => ({
        ...conference,
        teams: conference.teams.filter((team) => team.id !== teamId),
      })),
    );
    setTeamColors((current) => {
      const next = { ...current };
      delete next[teamId];
      return next;
    });
    setVisibleTeams((current) => {
      const next = { ...current };
      delete next[teamId];
      return next;
    });
    setTeamCoordinates((current) => {
      const next = { ...current };
      delete next[teamId];
      return next;
    });
    if (draggingTeamId === teamId) setDraggingTeamId(null);
  }

  function downloadState() {
    const payload = {
      exportedAt: new Date().toISOString(),
      conferences,
      conferenceColors,
      teamColors,
      teamCoordinates,
      visibleConferences,
      visibleTeams,
      sortMode,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "conference-realignment-state.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function onMapClick(lat: number, lng: number) {
    setNewTeamLat(lat.toFixed(4));
    setNewTeamLng(lng.toFixed(4));
  }

  async function uploadStateFromFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SavedState;
      if (!Array.isArray(parsed.conferences)) {
        throw new Error("Invalid save file: missing conferences array.");
      }

      setConferences(parsed.conferences);
      setConferenceColors(parsed.conferenceColors ?? {});
      setTeamColors(parsed.teamColors ?? {});
      setTeamCoordinates(parsed.teamCoordinates ?? {});
      setVisibleConferences(parsed.visibleConferences ?? {});
      setVisibleTeams(parsed.visibleTeams ?? {});
      setSortMode(
        parsed.sortMode === "conference" || parsed.sortMode === "name" || parsed.sortMode === "region"
          ? parsed.sortMode
          : "conference",
      );

      const firstConferenceId = parsed.conferences[0]?.id ?? "";
      setNewTeamConferenceId(firstConferenceId);
      setUploadMessage("State loaded successfully.");
    } catch {
      setUploadMessage("Unable to load file. Please use a valid exported JSON state.");
    } finally {
      event.target.value = "";
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-slate-50 outline-none transition placeholder:text-slate-400 focus:border-sky-300/70 focus:bg-white/10";
  const actionButtonClass =
    "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5";
  const panelClass =
    "rounded-[28px] border border-white/12 bg-[var(--panel)] shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl";

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
        <section className={`${panelClass} relative overflow-hidden px-6 py-6 md:px-8`}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-sky-200">
                NCAA Scenario Builder
              </span>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  Design cleaner conference maps with a dashboard that feels built for strategy.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Drag teams between leagues, tune colors and visibility, and pressure-test travel alignment from one
                  calmer control surface.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Conferences</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totals.conferenceCount}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/7 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Teams</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totals.teamCount}</p>
              </div>
              <div className="rounded-[24px] border border-amber-300/20 bg-amber-300/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-amber-100/70">Travel Score</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totals.travelScore}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_1fr]">
          <aside className={`${panelClass} p-4 md:p-5`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Control Center</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Lower travel scores are better. Click the map to fill new team coordinates instantly.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                Live
              </div>
            </div>

            <div className="space-y-4">
              <CollapsibleSection title="Quick Actions" defaultOpen>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                  Sort teams
                </label>
                <select
                  className={inputClass}
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="conference">By Conference</option>
                  <option value="name">By Name</option>
                  <option value="region">By Region</option>
                </select>

                <div className="mt-3 grid gap-2">
                  <button
                    className={`${actionButtonClass} border-white/12 bg-white/6 text-slate-100 hover:bg-white/10`}
                    onClick={resetAll}
                  >
                    Reset Scenario + Styling
                  </button>
                  <button
                    className={`${actionButtonClass} border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16`}
                    onClick={downloadState}
                  >
                    Download Save State
                  </button>
                  <label
                    className={`${actionButtonClass} cursor-pointer border-sky-300/25 bg-sky-400/10 text-sky-100 hover:bg-sky-400/16`}
                  >
                    Upload Save State
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={uploadStateFromFile}
                    />
                  </label>
                  {uploadMessage && <p className="text-xs text-slate-300">{uploadMessage}</p>}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Add Conference" badge="Custom League" defaultOpen>
                <div className="grid gap-3">
                  <input
                    className={inputClass}
                    placeholder="Conference name"
                    value={newConferenceName}
                    onChange={(event) => setNewConferenceName(event.target.value)}
                  />
                  <select
                    className={inputClass}
                    value={newConferenceFootprint}
                    onChange={(event) => setNewConferenceFootprint(event.target.value as Region)}
                  >
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
                    Accent color
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded-xl border border-white/12 bg-transparent"
                      value={newConferenceColor}
                      onChange={(event) => setNewConferenceColor(event.target.value)}
                    />
                  </label>
                  <button
                    className={`${actionButtonClass} border-emerald-300/25 bg-emerald-400/14 text-emerald-100 hover:bg-emerald-400/20`}
                    onClick={addConference}
                  >
                    Add Conference
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Add Team" badge="Map-Aware" defaultOpen>
                <div className="grid gap-3">
                  <input
                    className={inputClass}
                    placeholder="Team name"
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                  />
                  <select
                    className={inputClass}
                    value={newTeamConferenceId}
                    onChange={(event) => setNewTeamConferenceId(event.target.value)}
                  >
                    {conferences.map((conference) => (
                      <option key={conference.id} value={conference.id}>
                        {conference.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={newTeamRegion}
                    onChange={(event) => setNewTeamRegion(event.target.value as Region)}
                  >
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={inputClass}
                      placeholder="Latitude"
                      value={newTeamLat}
                      onChange={(event) => setNewTeamLat(event.target.value)}
                    />
                    <input
                      className={inputClass}
                      placeholder="Longitude"
                      value={newTeamLng}
                      onChange={(event) => setNewTeamLng(event.target.value)}
                    />
                  </div>
                  <p className="text-xs leading-5 text-slate-400">
                    Tip: click anywhere on the map and the latitude/longitude fields will update automatically.
                  </p>
                  <button
                    className={`${actionButtonClass} border-sky-300/25 bg-sky-400/14 text-sky-100 hover:bg-sky-400/20`}
                    onClick={addTeam}
                  >
                    Add Team
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Conferences" badge={`${conferences.length} total`} defaultOpen={false}>
                <div className="max-h-[30vh] space-y-3 overflow-y-auto pr-1">
                  {conferences.map((conference) => (
                    <div
                      key={conference.id}
                      className="rounded-[22px] border border-white/10 bg-white/5 p-3 transition hover:bg-white/7"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => onDropTeam(conference.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-100">
                          <input
                            type="checkbox"
                            checked={visibleConferences[conference.id] ?? true}
                            onChange={(event) =>
                              setVisibleConferences((current) => ({
                                ...current,
                                [conference.id]: event.target.checked,
                              }))
                            }
                          />
                          <span>{conference.name}</span>
                        </label>
                        <input
                          type="color"
                          className="h-10 w-14 cursor-pointer rounded-xl border border-white/12 bg-transparent"
                          value={conferenceColors[conference.id] ?? "#1d4ed8"}
                          onChange={(event) =>
                            setConferenceColors((current) => ({
                              ...current,
                              [conference.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <span className="rounded-full bg-white/6 px-2.5 py-1">{conference.footprint} footprint</span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1">
                          Score {conferenceTravelScore(conference)}
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1">{conference.teams.length} teams</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          className="rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-400/10"
                          onClick={() => deleteConference(conference.id)}
                        >
                          Delete conference
                        </button>
                        {draggingTeamId && <p className="text-xs text-emerald-200">Drop dragged team here</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Teams" badge="Drag Enabled" defaultOpen={false}>
                <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                  {sortedTeams.map((team) => (
                    <div
                      key={team.id}
                      className="cursor-grab rounded-[22px] border border-white/10 bg-white/5 p-3 transition hover:bg-white/7 active:cursor-grabbing"
                      draggable
                      onDragStart={() => onDragTeamStart(team.id)}
                      onDragEnd={() => setDraggingTeamId(null)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-100">
                          <input
                            type="checkbox"
                            checked={visibleTeams[team.id] ?? true}
                            onChange={(event) =>
                              setVisibleTeams((current) => ({
                                ...current,
                                [team.id]: event.target.checked,
                              }))
                            }
                          />
                          <span>{team.name}</span>
                        </label>
                        <input
                          type="color"
                          className="h-10 w-14 cursor-pointer rounded-xl border border-white/12 bg-transparent"
                          value={getTeamColor(team.id, team.conferenceId, teamColors, conferenceColors)}
                          onChange={(event) =>
                            setTeamColors((current) => ({
                              ...current,
                              [team.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <span className="rounded-full bg-white/6 px-2.5 py-1">{team.conferenceName}</span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1">{team.region}</span>
                      </div>
                      <button
                        className="mt-3 rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-400/10"
                        onClick={() => deleteTeam(team.id)}
                      >
                        Delete team
                      </button>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            </div>
          </aside>

          <section className={`${panelClass} relative overflow-hidden p-4 md:p-5`}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">National View</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Conference footprint map</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Team markers inherit conference colors unless you set a custom team color. Use the controls on the
                  left to test cleaner regional alignments.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Leaflet</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Click to place</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Drag to realign</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-slate-950/40 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="relative h-[720px] w-full overflow-hidden rounded-[22px] border border-white/8">
                <ConferenceMap teams={mapTeams} onMapClick={onMapClick} />

                <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/76 px-4 py-3 text-xs leading-5 text-slate-200 backdrop-blur">
                  National map view
                  <br />
                  Team locations are plotted from saved coordinates.
                </div>

                {draggingTeamId && (
                  <div className="pointer-events-none absolute bottom-4 right-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/12 px-4 py-2 text-xs text-emerald-100 backdrop-blur">
                    Dragging team: {teams.find((team) => team.id === draggingTeamId)?.name}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
