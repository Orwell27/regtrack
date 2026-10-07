import type { Metadata } from "next";
import { MandateDashboard } from "@/components/mandate/MandateDashboard";
import { getMandateSnapshot } from "@/lib/mandate/data";
import "./mandato.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Balance de mandato · RegTrack",
  description: "Compromisos, evidencia e indicadores con sus fuentes. Un balance documental para consultar y contrastar.",
};

export default function MandatePage() {
  return <MandateDashboard snapshot={getMandateSnapshot()} nowISO={new Date().toISOString()} />;
}
