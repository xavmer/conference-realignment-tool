type Region = "West" | "Midwest" | "South" | "Northeast";

type TeamSeed = {
  name: string;
};

type ConferenceSeed = {
  id: string;
  name: string;
  footprint: Region;
  teams: TeamSeed[];
};

type PreparedTeam = {
  id: string;
  name: string;
  region: Region;
};

type PreparedConference = {
  id: string;
  name: string;
  footprint: Region;
  teams: PreparedTeam[];
};

type TeamCoordinate = {
  lat: number;
  lng: number;
};

const conferenceSeeds: ConferenceSeed[] = [
  {
    id: "acc",
    name: "ACC",
    footprint: "Northeast",
    teams: [
      { name: "Boston College" },
      { name: "California" },
      { name: "Clemson" },
      { name: "Duke" },
      { name: "Florida State" },
      { name: "Georgia Tech" },
      { name: "Louisville" },
      { name: "Miami (FL)" },
      { name: "NC State" },
      { name: "North Carolina" },
      { name: "Pitt" },
      { name: "SMU" },
      { name: "Stanford" },
      { name: "Syracuse" },
      { name: "Virginia" },
      { name: "Virginia Tech" },
      { name: "Wake Forest" },
    ],
  },
  {
    id: "big10",
    name: "Big Ten",
    footprint: "Midwest",
    teams: [
      { name: "Illinois" },
      { name: "Indiana" },
      { name: "Iowa" },
      { name: "Maryland" },
      { name: "Michigan" },
      { name: "Michigan State" },
      { name: "Minnesota" },
      { name: "Nebraska" },
      { name: "Northwestern" },
      { name: "Ohio State" },
      { name: "Oregon" },
      { name: "Penn State" },
      { name: "Purdue" },
      { name: "Rutgers" },
      { name: "UCLA" },
      { name: "USC" },
      { name: "Washington" },
      { name: "Wisconsin" },
    ],
  },
  {
    id: "big12",
    name: "Big 12",
    footprint: "Midwest",
    teams: [
      { name: "Arizona" },
      { name: "Arizona State" },
      { name: "Baylor" },
      { name: "BYU" },
      { name: "Cincinnati" },
      { name: "Colorado" },
      { name: "Houston" },
      { name: "Iowa State" },
      { name: "Kansas" },
      { name: "Kansas State" },
      { name: "Oklahoma State" },
      { name: "TCU" },
      { name: "Texas Tech" },
      { name: "UCF" },
      { name: "Utah" },
      { name: "West Virginia" },
    ],
  },
  {
    id: "sec",
    name: "SEC",
    footprint: "South",
    teams: [
      { name: "Alabama" },
      { name: "Arkansas" },
      { name: "Auburn" },
      { name: "Florida" },
      { name: "Georgia" },
      { name: "Kentucky" },
      { name: "LSU" },
      { name: "Mississippi State" },
      { name: "Missouri" },
      { name: "Ole Miss" },
      { name: "Oklahoma" },
      { name: "South Carolina" },
      { name: "Tennessee" },
      { name: "Texas" },
      { name: "Texas A&M" },
      { name: "Vanderbilt" },
    ],
  },
  {
    id: "american",
    name: "American",
    footprint: "South",
    teams: [
      { name: "Army" },
      { name: "Charlotte" },
      { name: "East Carolina" },
      { name: "Florida Atlantic" },
      { name: "Memphis" },
      { name: "Navy" },
      { name: "North Texas" },
      { name: "Rice" },
      { name: "South Florida" },
      { name: "Temple" },
      { name: "Tulane" },
      { name: "Tulsa" },
      { name: "UAB" },
      { name: "UTSA" },
    ],
  },
  {
    id: "cusa",
    name: "Conference USA",
    footprint: "South",
    teams: [
      { name: "Delaware" },
      { name: "FIU" },
      { name: "Jacksonville State" },
      { name: "Kennesaw State" },
      { name: "Liberty" },
      { name: "Louisiana Tech" },
      { name: "Middle Tennessee" },
      { name: "Missouri State" },
      { name: "New Mexico State" },
      { name: "Sam Houston" },
      { name: "UTEP" },
      { name: "Western Kentucky" },
    ],
  },
  {
    id: "mac",
    name: "MAC",
    footprint: "Midwest",
    teams: [
      { name: "Akron" },
      { name: "Ball State" },
      { name: "Bowling Green" },
      { name: "Buffalo" },
      { name: "Central Michigan" },
      { name: "Eastern Michigan" },
      { name: "Kent State" },
      { name: "Miami (OH)" },
      { name: "Northern Illinois" },
      { name: "Ohio" },
      { name: "UMass" },
      { name: "Toledo" },
      { name: "Western Michigan" },
    ],
  },
  {
    id: "mountain-west",
    name: "Mountain West",
    footprint: "West",
    teams: [
      { name: "Air Force" },
      { name: "Hawaii" },
      { name: "Nevada" },
      { name: "New Mexico" },
      { name: "San Jose State" },
      { name: "UNLV" },
      { name: "Wyoming" },
    ],
  },
  {
    id: "pac-12",
    name: "Pac-12",
    footprint: "West",
    teams: [
      { name: "Boise State" },
      { name: "Colorado State" },
      { name: "Fresno State" },
      { name: "Oregon State" },
      { name: "San Diego State" },
      { name: "Texas State" },
      { name: "Utah State" },
      { name: "Washington State" },
    ],
  },
  {
    id: "sun-belt",
    name: "Sun Belt",
    footprint: "South",
    teams: [
      { name: "Appalachian State" },
      { name: "Arkansas State" },
      { name: "Coastal Carolina" },
      { name: "Georgia Southern" },
      { name: "Georgia State" },
      { name: "James Madison" },
      { name: "Louisiana" },
      { name: "Marshall" },
      { name: "Old Dominion" },
      { name: "South Alabama" },
      { name: "Southern Miss" },
      { name: "Troy" },
      { name: "ULM" },
    ],
  },
  {
    id: "independents",
    name: "Independents",
    footprint: "Northeast",
    teams: [
      { name: "Notre Dame" },
      { name: "UConn" },
    ],
  },
];

const conferenceDefaultColors: Record<string, string> = {
  acc: "#7c3aed",
  big10: "#1d4ed8",
  big12: "#0f766e",
  sec: "#14532d",
  american: "#ef4444",
  cusa: "#f59e0b",
  mac: "#8b5cf6",
  "mountain-west": "#0284c7",
  "pac-12": "#dc2626",
  "sun-belt": "#f97316",
  independents: "#64748b",
};

const teamDefaultColors: Record<string, string> = {};

const teamCoordinatesByName: Record<string, TeamCoordinate> = {
  "Boston College": { lat: 42.335104, lng: -71.1664413 },
  California: { lat: 37.8710434, lng: -122.2507729 },
  Clemson: { lat: 34.6787737, lng: -82.8432428 },
  Duke: { lat: 35.9953688, lng: -78.9417564 },
  "Florida State": { lat: 30.4381692, lng: -84.3044032 },
  "Georgia Tech": { lat: 33.7724449, lng: -84.3928054 },
  Louisville: { lat: 38.2057621, lng: -85.7588141 },
  "Miami (FL)": { lat: 25.9579665, lng: -80.2388604 },
  "NC State": { lat: 35.8008001, lng: -78.7195655 },
  "North Carolina": { lat: 35.9069294, lng: -79.0478889 },
  Pitt: { lat: 40.4467648, lng: -80.0157603 },
  SMU: { lat: 32.8377223, lng: -96.7827859 },
  Stanford: { lat: 37.4345556, lng: -122.1611271 },
  Syracuse: { lat: 43.0362269, lng: -76.1363161 },
  Virginia: { lat: 38.0311801, lng: -78.5137897 },
  "Virginia Tech": { lat: 37.2199873, lng: -80.4180643 },
  "Wake Forest": { lat: 36.1305507, lng: -80.2545851 },
  Illinois: { lat: 40.0993268, lng: -88.2359569 },
  Indiana: { lat: 39.1808959, lng: -86.5256217 },
  Iowa: { lat: 41.6586045, lng: -91.5510829 },
  Maryland: { lat: 38.9903332, lng: -76.9473792 },
  Michigan: { lat: 42.2658365, lng: -83.7486956 },
  "Michigan State": { lat: 42.7281474, lng: -84.4848526 },
  Minnesota: { lat: 44.976525, lng: -93.2245462 },
  Nebraska: { lat: 40.820682, lng: -96.705594 },
  Northwestern: { lat: 42.0653994, lng: -87.6924751 },
  "Ohio State": { lat: 40.0016447, lng: -83.0197266 },
  Oregon: { lat: 44.0582712, lng: -123.0684883 },
  "Penn State": { lat: 40.8121958, lng: -77.8561023 },
  Purdue: { lat: 40.4352253, lng: -86.9186843 },
  Rutgers: { lat: 40.5462553, lng: -74.4660408 },
  UCLA: { lat: 34.1613284, lng: -118.1676462 },
  USC: { lat: 34.014167, lng: -118.287778 },
  Washington: { lat: 47.6503235, lng: -122.3015746 },
  Wisconsin: { lat: 43.06994, lng: -89.4126943 },
  Arizona: { lat: 32.2288054, lng: -110.9488677 },
  "Arizona State": { lat: 33.4264471, lng: -111.9325005 },
  Baylor: { lat: 31.5582015, lng: -97.1156702 },
  BYU: { lat: 40.2575347, lng: -111.6545247 },
  Cincinnati: { lat: 39.1312495, lng: -84.5161913 },
  Colorado: { lat: 40.0094746, lng: -105.266905 },
  Houston: { lat: 29.7219885, lng: -95.3491623 },
  "Iowa State": { lat: 42.0139977, lng: -93.6357716 },
  Kansas: { lat: 38.9629418, lng: -95.2463686 },
  "Kansas State": { lat: 39.2020096, lng: -96.5938395 },
  "Oklahoma State": { lat: 36.125673, lng: -97.066513 },
  TCU: { lat: 32.7096604, lng: -97.3680835 },
  "Texas Tech": { lat: 33.5910518, lng: -101.8728824 },
  UCF: { lat: 28.6079765, lng: -81.1927233 },
  Utah: { lat: 40.7599724, lng: -111.8488255 },
  "West Virginia": { lat: 39.6502744, lng: -79.9551873 },
  Alabama: { lat: 33.2082752, lng: -87.5503836 },
  Arkansas: { lat: 36.0680662, lng: -94.1789534 },
  Auburn: { lat: 32.6025532, lng: -85.4897479 },
  Florida: { lat: 29.6499357, lng: -82.3485788 },
  Georgia: { lat: 33.9498197, lng: -83.3733813 },
  Kentucky: { lat: 38.0220905, lng: -84.5053408 },
  LSU: { lat: 30.412035, lng: -91.1838163 },
  "Mississippi State": { lat: 33.4563403, lng: -88.7933652 },
  Missouri: { lat: 38.9358491, lng: -92.3332009 },
  "Ole Miss": { lat: 34.3619837, lng: -89.5342076 },
  Oklahoma: { lat: 35.2058537, lng: -97.4423145 },
  "South Carolina": { lat: 33.9730239, lng: -81.0191726 },
  Tennessee: { lat: 35.9550131, lng: -83.9250128 },
  Texas: { lat: 30.2836813, lng: -97.7325345 },
  "Texas A&M": { lat: 30.6098891, lng: -96.3403828 },
  Vanderbilt: { lat: 36.1440455, lng: -86.8088942 },
  Army: { lat: 41.3874924, lng: -73.9640891 },
  Charlotte: { lat: 35.3105033, lng: -80.7401194 },
  "East Carolina": { lat: 35.5968486, lng: -77.364564 },
  "Florida Atlantic": { lat: 26.3763763, lng: -80.1015759 },
  Memphis: { lat: 35.1209429, lng: -89.977147 },
  Navy: { lat: 38.9846985, lng: -76.5076335 },
  "North Texas": { lat: 33.203899, lng: -97.159245 },
  Rice: { lat: 29.7163297, lng: -95.4093261 },
  "South Florida": { lat: 27.9758691, lng: -82.5033344 },
  Temple: { lat: 39.9007995, lng: -75.1675414 },
  Tulane: { lat: 29.944616, lng: -90.116692 },
  Tulsa: { lat: 36.1489175, lng: -95.9437853 },
  UAB: { lat: 33.5206824, lng: -86.8024326 },
  UTSA: { lat: 29.4169834, lng: -98.4788143 },
  Delaware: { lat: 39.6617428, lng: -75.7488224 },
  FIU: { lat: 25.7525014, lng: -80.3778912 },
  "Jacksonville State": { lat: 33.8201052, lng: -85.76647 },
  "Kennesaw State": { lat: 34.0289318, lng: -84.5676234 },
  Liberty: { lat: 37.3544305, lng: -79.1750239 },
  "Louisiana Tech": { lat: 32.5321487, lng: -92.6560019 },
  "Middle Tennessee": { lat: 35.8511463, lng: -86.3681649 },
  "Missouri State": { lat: 37.1976229, lng: -93.2798119 },
  "New Mexico State": { lat: 32.2796202, lng: -106.7411148 },
  "Sam Houston": { lat: 30.713926, lng: -95.5419802 },
  UTEP: { lat: 31.7733353, lng: -106.507957 },
  "Western Kentucky": { lat: 36.9847901, lng: -86.4594041 },
  Akron: { lat: 41.0725534, lng: -81.5083408 },
  "Ball State": { lat: 40.2159422, lng: -85.4161148 },
  "Bowling Green": { lat: 41.3780114, lng: -83.6225 },
  Buffalo: { lat: 42.9991334, lng: -78.7775113 },
  "Central Michigan": { lat: 43.5777313, lng: -84.7709904 },
  "Eastern Michigan": { lat: 42.256126, lng: -83.647285 },
  "Kent State": { lat: 41.1390935, lng: -81.31346 },
  "Miami (OH)": { lat: 39.5197009, lng: -84.7330255 },
  "Northern Illinois": { lat: 41.9339586, lng: -88.7778357 },
  Ohio: { lat: 39.3212794, lng: -82.1034315 },
  UMass: { lat: 42.3773244, lng: -72.5360595 },
  Toledo: { lat: 41.6574777, lng: -83.6135652 },
  "Western Michigan": { lat: 42.2860064, lng: -85.6007573 },
  "Air Force": { lat: 38.9969701, lng: -104.8436165 },
  Hawaii: { lat: 21.294294, lng: -157.819338 },
  Nevada: { lat: 39.5469459, lng: -119.8175435 },
  "New Mexico": { lat: 35.0669479, lng: -106.6283225 },
  "San Jose State": { lat: 37.3196675, lng: -121.8682962 },
  UNLV: { lat: 36.1672559, lng: -115.1485163 },
  Wyoming: { lat: 41.31161, lng: -105.5681384 },
  "Boise State": { lat: 43.6028839, lng: -116.1958882 },
  "Colorado State": { lat: 40.570015, lng: -105.088435 },
  "Fresno State": { lat: 36.8143527, lng: -119.7580092 },
  "Oregon State": { lat: 44.5594559, lng: -123.2814341 },
  "San Diego State": { lat: 32.784444, lng: -117.122833 },
  "Texas State": { lat: 29.8910008, lng: -97.9255735 },
  "Utah State": { lat: 41.7517394, lng: -111.8116007 },
  "Washington State": { lat: 46.731831, lng: -117.1604991 },
  "Appalachian State": { lat: 36.2114267, lng: -81.6854278 },
  "Arkansas State": { lat: 35.8488977, lng: -90.6677436 },
  "Coastal Carolina": { lat: 33.7928506, lng: -79.0166946 },
  "Georgia Southern": { lat: 32.4122471, lng: -81.7849296 },
  "Georgia State": { lat: 33.735267, lng: -84.389949 },
  "James Madison": { lat: 38.4352919, lng: -78.8729349 },
  Louisiana: { lat: 30.2158434, lng: -92.0417371 },
  Marshall: { lat: 38.4247042, lng: -82.4214412 },
  "Old Dominion": { lat: 36.8889533, lng: -76.3049175 },
  "South Alabama": { lat: 30.6943566, lng: -88.0430541 },
  "Southern Miss": { lat: 31.3289321, lng: -89.3318118 },
  Troy: { lat: 31.7995565, lng: -85.9518328 },
  ULM: { lat: 32.5308089, lng: -92.0660602 },
  "Notre Dame": { lat: 41.698378, lng: -86.2339425 },
  UConn: { lat: 41.7595675, lng: -72.6187728 },
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildInitialConferences(): PreparedConference[] {
  return conferenceSeeds.map((conference) => ({
    ...conference,
    teams: conference.teams.map((team) => ({
      ...team,
      id: slugify(team.name),
      region: conference.footprint,
    })),
  }));
}

function buildInitialTeamCoordinates(conferences: PreparedConference[]): Record<string, TeamCoordinate> {
  const coordinates: Record<string, TeamCoordinate> = {};
  for (const conference of conferences) {
    for (const team of conference.teams) {
      coordinates[team.id] = teamCoordinatesByName[team.name] ?? { lat: 39.8283, lng: -98.5795 };
    }
  }
  return coordinates;
}

export const initialConferences = buildInitialConferences();
export const initialTeamCoordinates = buildInitialTeamCoordinates(initialConferences);
export { conferenceDefaultColors, teamDefaultColors };
