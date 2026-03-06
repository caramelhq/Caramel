export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  modulesEnabled: number;
  modulesTotal: number;
}

export const MOCK_GUILDS: Guild[] = [
  {
    id: "927361845012",
    name: "Caramel HQ",
    icon: null,
    memberCount: 4521,
    modulesEnabled: 5,
    modulesTotal: 5,
  },
  {
    id: "831204756123",
    name: "Gaming Lounge",
    icon: null,
    memberCount: 1234,
    modulesEnabled: 3,
    modulesTotal: 5,
  },
  {
    id: "745098321456",
    name: "Study Group",
    icon: null,
    memberCount: 312,
    modulesEnabled: 2,
    modulesTotal: 5,
  },
  {
    id: "658012345789",
    name: "Art Community",
    icon: null,
    memberCount: 8903,
    modulesEnabled: 4,
    modulesTotal: 5,
  },
  {
    id: "512345678901",
    name: "Dev Server",
    icon: null,
    memberCount: 56,
    modulesEnabled: 1,
    modulesTotal: 5,
  },
];

export function getGuild(id: string): Guild | undefined {
  return MOCK_GUILDS.find((g) => g.id === id);
}
