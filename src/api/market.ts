import { api } from "./client";

export type FxRange = "Today" | "Weekly" | "10Days" | "Monthly" | "All";

export interface FxPoint {
  date: string;
  rate: number;
}

export interface FxResponse {
  latestRate: number | null;
  points: FxPoint[];
}

// Expected backend shape:
// { latestRate: number, points: [{ date: string, rate: number }, ...] }
export async function fetchFx(pair: string, range: FxRange): Promise<FxResponse> {
  const res = await api.get<any>("/api/market/fx", { params: { pair, range } });

  const pointsRaw = Array.isArray(res.data?.points) ? res.data.points : [];
  const points: FxPoint[] = pointsRaw
    .map((p: any) => ({
      date: String(p?.date ?? p?.Date ?? ""),
      rate: Number(p?.rate ?? p?.Rate ?? NaN),
    }))
    .filter((p: FxPoint) => p.date && Number.isFinite(p.rate));

  const latestFromApi = Number(res.data?.latestRate ?? res.data?.LatestRate ?? NaN);
  const latestRate = Number.isFinite(latestFromApi)
    ? latestFromApi
    : points.length
      ? points[points.length - 1].rate
      : null;

  return { latestRate, points };
}