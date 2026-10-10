import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TerritorialBalance } from "@/components/mandate/TerritorialBalance";
import { getTerritorialBalance, TERRITORIAL_BALANCE_IDS } from "@/lib/mandate/territorial";
import "../../mandato.css";
import "../../cobertura/cobertura.css";

export const dynamicParams = false;
export function generateStaticParams() { return TERRITORIAL_BALANCE_IDS.map(id => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const balance = getTerritorialBalance((await params).id);
  return { title: balance ? `${balance.mandateLabel} · RegTrack` : "Balance no disponible · RegTrack" };
}
export default async function TerritorialPage({ params }: { params: Promise<{ id: string }> }) {
  const balance = getTerritorialBalance((await params).id);
  if (!balance) notFound();
  return <TerritorialBalance balance={balance} />;
}
