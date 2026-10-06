import type { Metadata } from "next";
import { Observatory } from "@/components/observatorio/Observatory";
import "./observatorio.css";
export const metadata: Metadata = {
  title: "España, en contexto · RegTrack",
  description:
    "Explora España por comunidades, provincias y municipios. Publicaciones oficiales, noticias y análisis con sus fuentes.",
};
export default function ObservatoryPage() {
  return <Observatory />;
}
