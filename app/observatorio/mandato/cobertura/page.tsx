import type { Metadata } from "next";
import { MandateCoverage } from "@/components/mandate/MandateCoverage";
import { getCoverage, getPublicInventory } from "@/lib/mandate/coverage";
import "../mandato.css";
import "./cobertura.css";
export const metadata: Metadata = {
  title: "Cobertura del balance · RegTrack",
  description: "Inventario nacional y estado de revisión de España, comunidades, ciudades autónomas y capitales de provincia. Fuentes y carencias a la vista.",
};
export default function CoveragePage() {
  return <MandateCoverage jurisdictions={getCoverage()} inventory={getPublicInventory()} />;
}
