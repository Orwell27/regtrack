import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/observatorio/DocumentLibrary";
import { publishedLibrary } from "@/lib/observatorio/published-library";
import "./biblioteca.css";

export const metadata: Metadata = {
  title: "Biblioteca documental · RegTrack",
  description:
    "Consulta documentos y datos de origen, su versión conservada y las fuentes que sustentan el observatorio.",
};

export default function DocumentLibraryPage() {
  return <DocumentLibrary library={publishedLibrary} />;
}
