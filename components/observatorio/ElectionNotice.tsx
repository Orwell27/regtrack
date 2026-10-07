"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { electionCountdown, type Election } from "@/lib/mandate/model";

export function ElectionNotice({ election, nowISO }: { election: Election; nowISO: string }) {
  const [now, setNow] = useState(nowISO);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  const countdown = electionCountdown(election, new Date(now));
  const date = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: election.timeZone }).format(new Date(`${election.date}T12:00:00Z`));
  return <section className="ob-election" aria-label="Elecciones y balance de mandato">
    <div className="ob-election-date">
      <span>{countdown.phase === "before" ? "CUENTA ATRÁS ELECTORAL" : "CALENDARIO ELECTORAL"}</span>
      <strong>{countdown.phase === "before" ? `${countdown.days} ${countdown.days === 1 ? "día" : "días"}` : countdown.phase === "today" ? "Hoy" : "Fecha alcanzada"}</strong>
      <time dateTime={election.date}>{date}</time>
      <a href={election.source.url} target="_blank" rel="noreferrer">Convocatoria BOE <ArrowUpRight size={12} /></a>
    </div>
    <div className="ob-election-copy">
      <span className="ob-section-kicker">NUEVO · PILOTO DOCUMENTAL</span>
      <h2>Lo prometido. Lo hecho. <em>Los datos.</em></h2>
      <p>Consulta compromisos, actuaciones documentadas e indicadores del mandato. Con fuentes originales, lenguaje sencillo e interpretación de IA identificada.</p>
      <a className="ob-election-cta" href="/observatorio/mandato">Explorar el balance de mandato <ArrowRight size={17} /></a>
    </div>
  </section>;
}
