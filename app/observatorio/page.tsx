import type { Metadata } from "next";
import { Observatory } from "@/components/observatorio/Observatory";
import election from "@/data/mandate/election.json";
import type { Election } from "@/lib/mandate/model";
import "./observatorio.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "España, en contexto · RegTrack",
  description:
    "Explora España por comunidades, provincias y municipios. Publicaciones oficiales, noticias y análisis con sus fuentes.",
};
export default function ObservatoryPage() {
  return <Observatory election={election as Election} nowISO={new Date().toISOString()} />;
}
