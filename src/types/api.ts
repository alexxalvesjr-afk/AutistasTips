export type EntryResult =
  | "PENDING"
  | "WIN"
  | "LOSS"
  | "VOID"
  | "HALF_WIN"
  | "HALF_LOSS";

export type Sport = { id: string; name: string; icon?: string | null };
export type Bookmaker = { id: string; name: string };
export type Tag = { id: string; name: string; color: string };

export type Entry = {
  id: string;
  date: string;
  sport: Sport | null;
  bookmaker: Bookmaker | null;
  competition: string | null;
  game: string;
  market: string | null;
  selection: string | null;
  odd: number;
  stake: number;
  result: EntryResult;
  status: "OPEN" | "SETTLED";
  profit: number;
  notes: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type EntriesResponse = { items: Entry[]; pagination: Pagination };

export type Me = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  currency: string;
  locale: string;
  decimalFormat: string;
  theme: string;
  initialBankroll: number;
  createdAt: string;
  subscription: {
    status: string;
    plan: { name: string; slug: string; maxEntries: number | null };
  } | null;
};

export type DashboardData = {
  cards: {
    totalBalance: number;
    totalProfit: number;
    roi: number;
    totalEntries: number;
    pendingEntries: number;
    winRate: number;
    avgStake: number;
    monthProfit: number;
    weekProfit: number;
  };
  charts: {
    evolution: { date: string; balance: number }[];
    bySport: { sport: string; profit: number; entries: number }[];
    byMonth: { month: string; roi: number; profit: number }[];
    dailyProfit: { date: string; profit: number }[];
  };
};

export type ReportRow = {
  label: string;
  entries: number;
  staked: number;
  profit: number;
  roi: number;
  winRate: number;
};

export type ReportsData = {
  summary: {
    totalEntries: number;
    settledEntries: number;
    pendingEntries: number;
    totalStaked: number;
    totalProfit: number;
    roi: number;
    yield: number;
    winRate: number;
    avgStake: number;
    avgOdd: number;
    wins: number;
    losses: number;
    voids: number;
    halfWins: number;
    halfLosses: number;
    maxWinStreak: number;
    maxLossStreak: number;
    yearProfit: number;
  };
  byDay: ReportRow[];
  byWeek: ReportRow[];
  byMonth: ReportRow[];
  byYear: ReportRow[];
};

export type StatsData = {
  resultDistribution: { result: EntryResult; count: number }[];
  profitLine: { date: string; profit: number }[];
  byBookmaker: { bookmaker: string; profit: number; entries: number }[];
  heatmap: { weekday: number; entries: number; profit: number }[];
  calendar: { date: string; profit: number; entries: number }[];
  oddsDistribution: { bucket: string; count: number; profit: number }[];
  stakeDistribution: { bucket: string; count: number; profit: number }[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  lastLoginAt: string | null;
  createdAt: string;
  plan: string;
  planStatus: string | null;
  entriesCount: number;
};

export type SessionInfo = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};
