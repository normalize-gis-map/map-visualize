import { NextResponse } from "next/server";
import floodData from "@/data/geojson/flood-sample.json";

export async function GET() {
  return NextResponse.json(floodData, { status: 200 });
}
