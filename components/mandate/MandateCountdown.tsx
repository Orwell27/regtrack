"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { electionCountdown, type Election } from "@/lib/mandate/model";

export function MandateCountdown({ election, nowISO }: { election: Election; nowISO: string }) {
  const [current, setCurrent] = useState(nowISO);
  useEffect(() => {
    const update = () => setCurrent(new Date().toISOString());
    const first = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, []);
  const countdown = electionCountdown(election, new Date(current));
  const electionDate = new Intl.DateTimeFormat("es-ES", {
    day: "numeric", month: "long", year: "numeric", timeZone: election.timeZone,
  }).format(new Date(`${election.date}T12:00:00Z`));
  return <aside className="mn-countdown" aria-label="Calendario electoral" data-phase={countdown.phase}>
    <p className="mn-eyebrow">La próxima cita electoral</p>
    {countdown.phase === "before" ? <div className="mn-countdown-display">
      <strong className="mn-countdown-value">{countdown.days}</strong>
      <span>{countdown.days === 1 ? "día hasta la jornada electoral" : "días hasta la jornada electoral"}</span>
    </div> : <h2>{countdown.phase === "today" ? "Jornada electoral" : "Fecha electoral alcanzada"}</h2>}
    <p className="mn-countdown-date"><time dateTime={election.date}>{electionDate}</time></p>
    <div className="mn-countdown-source">
      <a href={election.source.url} target="_blank" rel="noreferrer">Convocatoria publicada en el BOE <ArrowUpRight size={12} aria-hidden="true" /></a>
      <p className="mn-countdown-note">{countdown.phase === "after" ? "Mandato en revisión. Esta vista no incorpora resultados electorales." : `Días naturales según ${election.timeZone}.`}</p>
    </div>
  </aside>;
}
