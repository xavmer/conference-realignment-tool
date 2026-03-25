"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useMemo, useState } from "react";
import {
  conferenceDefaultColors,
  initialLeagues,
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

type League = {
  id: string;
  name: string;
  conferences: Conference[];
};

type TeamWithConference = Team & {
  conferenceId: string;
  conferenceName: string;
  leagueId: string;
  leagueName: string;
};

type SavedState = {
  leagues?: League[];
  conferences?: Conference[];
  conferenceColors?: Record<string, string>;
  teamColors?: Record<string, string>;
  teamCoordinates?: Record<string, { lat: number; lng: number }>;
  visibleConferences?: Record<string, boolean>;
  visibleTeams?: Record<string, boolean>;
  sortMode?: SortMode;
};

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

function buildConferenceVisibility(leagues: League[]): Record<string, boolean> {
  return Object.fromEntries(
    leagues.flatMap((league) => league.conferences).map((conference) => [conference.id, true]),
  );
}

function buildTeamVisibility(leagues: League[]): Record<string, boolean> {
  return Object.fromEntries(
    leagues
      .flatMap((league) => league.conferences)
      .flatMap((conference) => conference.teams)
      .map((team) => [team.id, true]),
  );
}

function buildLeagueExpansion(leagues: League[], value: boolean): Record<string, boolean> {
  return Object.fromEntries(leagues.map((league) => [league.id, value]));
}

function buildConferenceExpansion(leagues: League[], value: boolean): Record<string, boolean> {
  return Object.fromEntries(
    leagues.flatMap((league) => league.conferences).map((conference) => [conference.id, value]),
  );
}

function conferenceIds(leagues: League[]): string[] {
  return leagues.flatMap((league) => league.conferences).map((conference) => conference.id);
}

function teamIds(leagues: League[]): string[] {
  return leagues.flatMap((league) => league.conferences).flatMap((conference) => conference.teams).map((team) => team.id);
}

function inferRegionFromCoordinates(lat: number, lng: number): Region {
  if (lng <= -105) return "West";
  if (lng <= -90) return "Midwest";
  if (lat >= 39 && lng > -90) return "Northeast";
  return "South";
}

function inferLeagueFootprint(league: League | undefined): Region {
  const footprints = league?.conferences.map((conference) => conference.footprint) ?? [];
  if (footprints.length === 0) return "Midwest";

  const counts = footprints.reduce<Record<Region, number>>(
    (accumulator, footprint) => ({
      ...accumulator,
      [footprint]: (accumulator[footprint] ?? 0) + 1,
    }),
    { West: 0, Midwest: 0, South: 0, Northeast: 0 },
  );

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Region) ?? "Midwest";
}

const ConferenceMap = dynamic(() => import("./components/ConferenceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-950/70 text-sm text-slate-300">
      Loading map canvas...
    </div>
  ),
});

function haversineMiles(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): number {
  const earthRadiusMiles = 3958.8;
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;
  const startLat = (start.lat * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function conferenceTravelScore(
  conference: Conference,
  teamCoordinates: Record<string, { lat: number; lng: number }>,
): number {
  const locatedTeams = conference.teams
    .map((team) => teamCoordinates[team.id])
    .filter((coordinates): coordinates is { lat: number; lng: number } => Boolean(coordinates));

  if (locatedTeams.length <= 1) return 0;

  const centroid = locatedTeams.reduce(
    (accumulator, coordinates) => ({
      lat: accumulator.lat + coordinates.lat / locatedTeams.length,
      lng: accumulator.lng + coordinates.lng / locatedTeams.length,
    }),
    { lat: 0, lng: 0 },
  );

  const totalMiles = locatedTeams.reduce((sum, coordinates) => {
    return sum + haversineMiles(coordinates, centroid);
  }, 0);

  return Math.round(totalMiles / locatedTeams.length);
}

function moveTeamToConference(current: League[], teamId: string, destinationConferenceId: string): League[] {
  let movedTeam: Team | undefined;

  for (const league of current) {
    for (const conference of league.conferences) {
      const found = conference.teams.find((team) => team.id === teamId);
      if (found) {
        movedTeam = found;
        break;
      }
    }
    if (movedTeam) break;
  }

  if (!movedTeam) return current;

  return current.map((league) => ({
    ...league,
    conferences: league.conferences.map((conference) => {
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
    }),
  }));
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
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>(
    buildLeagueExpansion(initialLeagues, true),
  );
  const [expandedConferences, setExpandedConferences] = useState<Record<string, boolean>>(
    buildConferenceExpansion(initialLeagues, false),
  );
  const [sortMode, setSortMode] = useState<SortMode>("conference");
  const [draggingTeamId, setDraggingTeamId] = useState<string | null>(null);
  const [conferenceColors, setConferenceColors] =
    useState<Record<string, string>>(conferenceDefaultColors);
  const [teamColors, setTeamColors] = useState<Record<string, string>>(teamDefaultColors);
  const [teamCoordinates, setTeamCoordinates] =
    useState<Record<string, { lat: number; lng: number }>>(initialTeamCoordinates);
  const [visibleConferences, setVisibleConferences] = useState<Record<string, boolean>>(
    buildConferenceVisibility(initialLeagues),
  );
  const [visibleTeams, setVisibleTeams] = useState<Record<string, boolean>>(buildTeamVisibility(initialLeagues));
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newConferenceName, setNewConferenceName] = useState("");
  const [newConferenceLeagueId, setNewConferenceLeagueId] = useState(initialLeagues[0]?.id ?? "");
  const [newConferenceColor, setNewConferenceColor] = useState("#334155");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeagueId, setNewTeamLeagueId] = useState(initialLeagues[0]?.id ?? "");
  const [newTeamConferenceId, setNewTeamConferenceId] = useState(
    initialLeagues[0]?.conferences[0]?.id ?? "",
  );
  const [newTeamLat, setNewTeamLat] = useState("39.8");
  const [newTeamLng, setNewTeamLng] = useState("-98.5");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const conferences = useMemo(() => leagues.flatMap((league) => league.conferences), [leagues]);
  const availableTeamConferences = useMemo(() => {
    return leagues.find((league) => league.id === newTeamLeagueId)?.conferences ?? [];
  }, [leagues, newTeamLeagueId]);

  const teams = useMemo<TeamWithConference[]>(() => {
    return leagues.flatMap((league) =>
      league.conferences.flatMap((conference) =>
        conference.teams.map((team) => ({
          ...team,
          conferenceId: conference.id,
          conferenceName: conference.name,
          leagueId: league.id,
          leagueName: league.name,
        })),
      ),
    );
  }, [leagues]);

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
    const travelScore = conferences.reduce((sum, conference) => {
      return sum + conferenceTravelScore(conference, teamCoordinates);
    }, 0);
    return {
      leagueCount: leagues.length,
      conferenceCount: conferences.length,
      teamCount: teams.length,
      travelScore,
    };
  }, [conferences, leagues.length, teamCoordinates, teams.length]);

  function onDragTeamStart(teamId: string) {
    setDraggingTeamId(teamId);
  }

  function onDropTeam(destinationConferenceId: string) {
    if (!draggingTeamId) return;
    setLeagues((current) => moveTeamToConference(current, draggingTeamId, destinationConferenceId));
    setDraggingTeamId(null);
  }

  function resetAll() {
    setLeagues(initialLeagues);
    setExpandedLeagues(buildLeagueExpansion(initialLeagues, true));
    setExpandedConferences(buildConferenceExpansion(initialLeagues, false));
    setSortMode("conference");
    setDraggingTeamId(null);
    setConferenceColors(conferenceDefaultColors);
    setTeamColors(teamDefaultColors);
    setTeamCoordinates(initialTeamCoordinates);
    setVisibleConferences(buildConferenceVisibility(initialLeagues));
    setVisibleTeams(buildTeamVisibility(initialLeagues));
    setNewLeagueName("");
    setNewConferenceName("");
    setNewConferenceLeagueId(initialLeagues[0]?.id ?? "");
    setNewConferenceColor("#334155");
    setNewTeamName("");
    setNewTeamLeagueId(initialLeagues[0]?.id ?? "");
    setNewTeamConferenceId(initialLeagues[0]?.conferences[0]?.id ?? "");
    setNewTeamLat("39.8");
    setNewTeamLng("-98.5");
  }

  function clearAllTeams() {
    setLeagues((current) =>
      current.map((league) => ({
        ...league,
        conferences: league.conferences.map((conference) => ({
          ...conference,
          teams: [],
        })),
      })),
    );
    setDraggingTeamId(null);
    setTeamColors({});
    setTeamCoordinates({});
    setVisibleTeams({});
  }

  function addLeague() {
    if (!newLeagueName.trim()) return;
    const leagueId = ensureUniqueId(
      slugify(newLeagueName),
      leagues.map((league) => league.id),
    );

    const newLeague: League = {
      id: leagueId,
      name: newLeagueName.trim(),
      conferences: [],
    };

    setLeagues((current) => [...current, newLeague]);
    setExpandedLeagues((current) => ({ ...current, [leagueId]: true }));
    setNewConferenceLeagueId(leagueId);
    setNewTeamLeagueId(leagueId);
    setNewLeagueName("");
  }

  function deleteLeague(leagueId: string) {
    const league = leagues.find((item) => item.id === leagueId);
    if (!league) return;

    const conferenceIdsToDelete = league.conferences.map((conference) => conference.id);
    const teamIdsToDelete = league.conferences.flatMap((conference) => conference.teams).map((team) => team.id);

    setLeagues((current) => current.filter((item) => item.id !== leagueId));
    setExpandedLeagues((current) => {
      const next = { ...current };
      delete next[leagueId];
      return next;
    });
    setExpandedConferences((current) => {
      const next = { ...current };
      for (const conferenceId of conferenceIdsToDelete) delete next[conferenceId];
      return next;
    });
    setConferenceColors((current) => {
      const next = { ...current };
      for (const conferenceId of conferenceIdsToDelete) delete next[conferenceId];
      return next;
    });
    setVisibleConferences((current) => {
      const next = { ...current };
      for (const conferenceId of conferenceIdsToDelete) delete next[conferenceId];
      return next;
    });
    setTeamColors((current) => {
      const next = { ...current };
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    setVisibleTeams((current) => {
      const next = { ...current };
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    setTeamCoordinates((current) => {
      const next = { ...current };
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    if (newConferenceLeagueId === leagueId) {
      const fallbackLeagueId = leagues.find((item) => item.id !== leagueId)?.id ?? "";
      setNewConferenceLeagueId(fallbackLeagueId);
    }
    if (newTeamLeagueId === leagueId) {
      const fallbackLeagueId = leagues.find((item) => item.id !== leagueId)?.id ?? "";
      setNewTeamLeagueId(fallbackLeagueId);
    }
    if (league.conferences.some((conference) => conference.id === newTeamConferenceId)) {
      const fallbackConferenceId =
        leagues
          .filter((item) => item.id !== leagueId)
          .flatMap((item) => item.conferences)[0]?.id ?? "";
      setNewTeamConferenceId(fallbackConferenceId);
    }
  }

  function addConference() {
    if (!newConferenceName.trim() || !newConferenceLeagueId) return;
    const conferenceId = ensureUniqueId(slugify(newConferenceName), conferenceIds(leagues));
    const targetLeague = leagues.find((league) => league.id === newConferenceLeagueId);

    const newConference: Conference = {
      id: conferenceId,
      name: newConferenceName.trim(),
      footprint: inferLeagueFootprint(targetLeague),
      teams: [],
    };

    setLeagues((current) =>
      current.map((league) =>
        league.id === newConferenceLeagueId
          ? { ...league, conferences: [...league.conferences, newConference] }
          : league,
      ),
    );
    setExpandedLeagues((current) => ({ ...current, [newConferenceLeagueId]: true }));
    setExpandedConferences((current) => ({ ...current, [conferenceId]: true }));
    setConferenceColors((current) => ({ ...current, [conferenceId]: newConferenceColor }));
    setVisibleConferences((current) => ({ ...current, [conferenceId]: true }));
    setNewTeamLeagueId(newConferenceLeagueId);
    setNewTeamConferenceId(conferenceId);
    setNewConferenceName("");
  }

  function deleteConference(conferenceId: string) {
    const conference = conferences.find((item) => item.id === conferenceId);
    if (!conference) return;

    const teamIdsToDelete = conference.teams.map((team) => team.id);

    setLeagues((current) =>
      current.map((league) => ({
        ...league,
        conferences: league.conferences.filter((conferenceItem) => conferenceItem.id !== conferenceId),
      })),
    );
    setExpandedConferences((current) => {
      const next = { ...current };
      delete next[conferenceId];
      return next;
    });
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
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    setVisibleTeams((current) => {
      const next = { ...current };
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    setTeamCoordinates((current) => {
      const next = { ...current };
      for (const teamId of teamIdsToDelete) delete next[teamId];
      return next;
    });
    if (newTeamConferenceId === conferenceId) {
      const fallbackConferenceId = conferences.find((item) => item.id !== conferenceId)?.id ?? "";
      setNewTeamConferenceId(fallbackConferenceId);
    }
  }

  function addTeam() {
    if (!newTeamName.trim() || !newTeamConferenceId) return;
    const lat = Number(newTeamLat);
    const lng = Number(newTeamLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    const teamId = ensureUniqueId(slugify(newTeamName), teamIds(leagues));

    const newTeam: Team = {
      id: teamId,
      name: newTeamName.trim(),
      region: inferRegionFromCoordinates(lat, lng),
    };

    setLeagues((current) =>
      current.map((league) => ({
        ...league,
        conferences: league.conferences.map((conference) =>
          conference.id === newTeamConferenceId
            ? { ...conference, teams: [...conference.teams, newTeam] }
            : conference,
        ),
      })),
    );
    setVisibleTeams((current) => ({ ...current, [teamId]: true }));
    setTeamCoordinates((current) => ({ ...current, [teamId]: { lat, lng } }));
    setNewTeamName("");
  }

  function deleteTeam(teamId: string) {
    setLeagues((current) =>
      current.map((league) => ({
        ...league,
        conferences: league.conferences.map((conference) => ({
          ...conference,
          teams: conference.teams.filter((team) => team.id !== teamId),
        })),
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
      leagues,
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

  function migrateSavedState(parsed: SavedState): League[] | null {
    if (Array.isArray(parsed.leagues)) {
      return parsed.leagues;
    }

    if (Array.isArray(parsed.conferences)) {
      return [
        {
          id: "imported-league",
          name: "Imported League",
          conferences: parsed.conferences,
        },
      ];
    }

    return null;
  }

  async function uploadStateFromFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SavedState;
      const nextLeagues = migrateSavedState(parsed);

      if (!nextLeagues) {
        throw new Error("Invalid save file: missing leagues or conferences array.");
      }

      setLeagues(nextLeagues);
      setExpandedLeagues(buildLeagueExpansion(nextLeagues, true));
      setExpandedConferences(buildConferenceExpansion(nextLeagues, false));
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

      setNewConferenceLeagueId(nextLeagues[0]?.id ?? "");
      setNewTeamLeagueId(nextLeagues[0]?.id ?? "");
      setNewTeamConferenceId(nextLeagues[0]?.conferences[0]?.id ?? "");
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
    <main className="min-h-screen px-3 py-3 text-slate-100 md:px-4 md:py-4">
      <section className="relative mx-auto min-h-[calc(100vh-1.5rem)] w-full max-w-[1780px] overflow-hidden rounded-[32px] border border-white/12 bg-slate-950/35 shadow-[0_30px_120px_rgba(2,6,23,0.42)] md:min-h-[calc(100vh-2rem)]">
        <div className="absolute inset-0">
          <ConferenceMap teams={mapTeams} onMapClick={onMapClick} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/72 via-slate-950/28 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950/78 via-slate-950/38 to-transparent xl:w-[48rem]" />

        <div className="pointer-events-none relative z-[1100] min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-2rem)]">
          <div className="flex justify-end p-3 md:p-4 xl:p-6">
            <div className="rounded-[24px] border border-white/10 bg-slate-950/62 px-4 py-3 backdrop-blur">
              <div className="flex flex-col items-end gap-3 text-right">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-sky-200">
                    NCAA Scenario Builder
                  </span>
                  <h1 className="text-lg font-semibold tracking-tight text-white md:text-xl">
                    Conference Realignment Map
                  </h1>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="min-w-[78px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Leagues</p>
                    <p className="mt-1 text-lg font-semibold text-white">{totals.leagueCount}</p>
                  </div>
                  <div className="min-w-[78px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Teams</p>
                    <p className="mt-1 text-lg font-semibold text-white">{totals.teamCount}</p>
                  </div>
                  <div className="min-w-[90px] rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/70">Avg Miles</p>
                    <p className="mt-1 text-lg font-semibold text-white">{totals.travelScore}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="pointer-events-auto absolute left-3 right-3 top-3 z-[1200] md:left-4 md:right-auto md:top-4 md:w-[420px] md:max-w-[calc(100vw-2rem)] xl:left-6 xl:top-6 xl:w-[430px] xl:max-w-[calc(100vw-3rem)]">
            <div className={`${panelClass} max-h-[calc(100vh-8rem)] overflow-hidden p-4 md:p-5 xl:max-h-[calc(100vh-3rem)]`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Control Center</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Travel scores reflect average miles from each team to its conference&apos;s geographic center.
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                  Live
                </div>
              </div>

              <div className="max-h-[calc(100vh-14rem)] space-y-4 overflow-y-auto pr-1 pb-6 xl:max-h-[calc(100vh-9.5rem)] xl:pb-8">
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
                      className={`${actionButtonClass} border-rose-300/25 bg-rose-400/10 text-rose-100 hover:bg-rose-400/16`}
                      onClick={clearAllTeams}
                    >
                      Clear All Teams
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

                <CollapsibleSection title="Add League" badge="Top Level" defaultOpen>
                  <div className="grid gap-3">
                    <input
                      className={inputClass}
                      placeholder="League name"
                      value={newLeagueName}
                      onChange={(event) => setNewLeagueName(event.target.value)}
                    />
                    <button
                      className={`${actionButtonClass} border-cyan-300/25 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/18`}
                      onClick={addLeague}
                    >
                      Add League
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Add Conference" badge="Middle Level" defaultOpen>
                  <div className="grid gap-3">
                    <input
                      className={inputClass}
                      placeholder="Conference name"
                      value={newConferenceName}
                      onChange={(event) => setNewConferenceName(event.target.value)}
                    />
                    <select
                      className={inputClass}
                      value={newConferenceLeagueId}
                      onChange={(event) => setNewConferenceLeagueId(event.target.value)}
                    >
                      {leagues.map((league) => (
                        <option key={league.id} value={league.id}>
                          {league.name}
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
                      value={newTeamLeagueId}
                      onChange={(event) => {
                        const nextLeagueId = event.target.value;
                        const nextConferenceId =
                          leagues.find((league) => league.id === nextLeagueId)?.conferences[0]?.id ?? "";
                        setNewTeamLeagueId(nextLeagueId);
                        setNewTeamConferenceId(nextConferenceId);
                      }}
                    >
                      {leagues.map((league) => (
                        <option key={league.id} value={league.id}>
                          {league.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass}
                      value={newTeamConferenceId}
                      onChange={(event) => setNewTeamConferenceId(event.target.value)}
                    >
                      {availableTeamConferences.map((conference) => (
                        <option key={conference.id} value={conference.id}>
                          {conference.name}
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

                <CollapsibleSection title="Leagues" badge={`${leagues.length} total`} defaultOpen={false}>
                  <p className="mb-3 text-xs leading-5 text-slate-400">
                    Teams live inside conferences, and conferences live inside leagues. Drag teams between conferences
                    to realign them. Conference scores show average team miles to that conference center.
                  </p>
                  <div className="space-y-3">
                    {leagues.map((league) => (
                      <div key={league.id} className="rounded-[24px] border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-semibold text-white">{league.name}</h4>
                              <button
                                type="button"
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10"
                                onClick={() =>
                                  setExpandedLeagues((current) => ({
                                    ...current,
                                    [league.id]: !(current[league.id] ?? true),
                                  }))
                                }
                              >
                                {expandedLeagues[league.id] ? "Collapse" : "Expand"}
                              </button>
                            </div>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              {league.conferences.length} conferences
                            </p>
                          </div>
                          <button
                            className="rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-400/10"
                            onClick={() => deleteLeague(league.id)}
                          >
                            Delete league
                          </button>
                        </div>

                        {expandedLeagues[league.id] && (
                          <div className="mt-3 space-y-3">
                            {league.conferences.map((conference) => (
                              <div
                                key={conference.id}
                                className="rounded-[22px] border border-white/10 bg-slate-950/28 p-3 transition hover:bg-white/7"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => onDropTeam(conference.id)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3">
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
                                      <button
                                        type="button"
                                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10"
                                        onClick={() =>
                                          setExpandedConferences((current) => ({
                                            ...current,
                                            [conference.id]: !(current[conference.id] ?? false),
                                          }))
                                        }
                                      >
                                        {expandedConferences[conference.id] ? "Collapse" : "Expand"}
                                      </button>
                                    </div>
                                  </div>
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
                                  <span className="rounded-full bg-white/6 px-2.5 py-1">{conference.footprint}</span>
                                  <span className="rounded-full bg-white/6 px-2.5 py-1">
                                    {conferenceTravelScore(conference, teamCoordinates)} mi
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

                                {expandedConferences[conference.id] && (
                                  <div className="mt-3 space-y-2">
                                    {sortTeams(
                                      conference.teams.map((team) => ({
                                        ...team,
                                        conferenceId: conference.id,
                                        conferenceName: conference.name,
                                        leagueId: league.id,
                                        leagueName: league.name,
                                      })),
                                      sortMode === "conference" ? "name" : sortMode,
                                    ).map((team) => (
                                      <div
                                        key={team.id}
                                        className="cursor-grab rounded-[18px] border border-white/10 bg-slate-950/35 p-3 transition hover:bg-white/7 active:cursor-grabbing"
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
                                            className="h-9 w-12 cursor-pointer rounded-xl border border-white/12 bg-transparent"
                                            value={getTeamColor(team.id, team.conferenceId, teamColors, conferenceColors)}
                                            onChange={(event) =>
                                              setTeamColors((current) => ({
                                                ...current,
                                                [team.id]: event.target.value,
                                              }))
                                            }
                                          />
                                        </div>
                                        <button
                                          className="mt-3 rounded-full border border-rose-300/20 px-3 py-1.5 text-xs text-rose-100 transition hover:bg-rose-400/10"
                                          onClick={() => deleteTeam(team.id)}
                                        >
                                          Delete team
                                        </button>
                                      </div>
                                    ))}

                                    {conference.teams.length === 0 && (
                                      <div className="rounded-[18px] border border-dashed border-white/12 bg-slate-950/20 px-3 py-4 text-center text-xs text-slate-400">
                                        No teams here yet. Drag a team into this conference to assign it.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}

                            {league.conferences.length === 0 && (
                              <div className="rounded-[18px] border border-dashed border-white/12 bg-slate-950/20 px-3 py-4 text-center text-xs text-slate-400">
                                No conferences in this league yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            </div>
          </aside>

          <div className="pointer-events-none absolute bottom-4 right-4 z-[1150] flex justify-end p-0 md:bottom-6 md:right-6">
            <div className="flex max-w-3xl flex-col items-end gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 backdrop-blur">
                  Leaflet
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 backdrop-blur">
                  Click to place
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 backdrop-blur">
                  Drag to realign
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/68 px-4 py-3 text-right text-xs leading-5 text-slate-200 backdrop-blur">
                National map view
                <br />
                Team locations are plotted from saved coordinates.
              </div>
            </div>
          </div>

          {draggingTeamId && (
            <div className="pointer-events-none absolute bottom-4 right-4 z-[1250] rounded-2xl border border-emerald-300/20 bg-emerald-400/12 px-4 py-2 text-xs text-emerald-100 backdrop-blur">
              Dragging team: {teams.find((team) => team.id === draggingTeamId)?.name}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
