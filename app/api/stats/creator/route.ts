import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/getApiSession";
import { queryDatabase } from "@/lib/postgres";
import {
  analyticsPeriod,
  type AnalyticsFormat,
} from "@/lib/creatorAnalytics/model";
import { creatorAnalyticsStatement } from "@/lib/creatorAnalytics/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id)
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401, headers }
      );
    const params = new URL(request.url).searchParams;
    let period;
    try {
      period = analyticsPeriod(params);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400, headers }
      );
    }
    const format = params.get("format") || "all";
    const track = params.get("track") || null;
    if (
      !["all", "track", "ai"].includes(format) ||
      (track && track.length > 160)
    )
      return NextResponse.json(
        { error: "Filtre invalide" },
        { status: 400, headers }
      );
    const statement = creatorAnalyticsStatement(
      session.user.id,
      period,
      format as AnalyticsFormat,
      track
    );
    const { rows } = await queryDatabase(statement.text, statement.values);
    const report = rows[0]?.report;
    if (!report) throw new Error("Missing report");
    if (!report.selectionFound)
      return NextResponse.json(
        { error: "Morceau introuvable dans cette sélection" },
        { status: 404, headers }
      );
    const { selectionFound: _, ...data } = report;
    return NextResponse.json(
      {
        ...data,
        period,
        generatedAt: period.now,
        selectedTrack: track,
        format,
      },
      { headers }
    );
  } catch {
    // No SQL, host, identifiers or query parameters in the public error.
    return NextResponse.json(
      { error: "Statistiques indisponibles. Réessaie dans un instant." },
      { status: 503, headers }
    );
  }
}
