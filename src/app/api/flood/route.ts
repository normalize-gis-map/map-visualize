import { NextResponse } from "next/server";
import { getFloodGeoJson } from "@/src/services/flood/flood.service";

export async function GET() {
  const data = await getFloodGeoJson();
  return NextResponse.json(data, { status: 200 });
}
