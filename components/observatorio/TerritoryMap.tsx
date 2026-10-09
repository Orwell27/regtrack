"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpLeft, Minus, Plus, RotateCcw } from "lucide-react";
import type { MapShape, Story, Territory } from "@/lib/observatorio/model";

type Props = {
  territories: Territory[];
  selected: Territory | undefined;
  stories: Story[];
  onSelect: (id: string) => void;
};
export function TerritoryMap({
  territories,
  selected,
  stories,
  onSelect,
}: Props) {
  const [dataset, setDataset] = useState<{ file: string; shapes: MapShape[] }>({
    file: "",
    shapes: [],
  });
  const [failed, setFailed] = useState(""),
    [hover, setHover] = useState(""),
    [zoom, setZoom] = useState(1);
  const file =
    selected?.level === "province" || selected?.level === "municipality"
      ? `${selected.province}.json`
      : selected
        ? "provinces.json"
        : "regions.json";
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/observatorio/geo/${file}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((shapes) => {
        setDataset({ file, shapes });
        setFailed("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(file);
      });
    return () => controller.abort();
  }, [file]);
  const lookup = useMemo(
    () => new Map(territories.map((t) => [t.id, t])),
    [territories],
  );
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stories)
      for (const id of s.territories) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [stories]);
  const shapes = useMemo(
    () =>
      dataset.file !== file
        ? []
        : dataset.shapes.filter(
            (s) =>
              !selected ||
              selected.level !== "region" ||
              lookup.get(s.id)?.region === selected.id,
          ),
    [dataset, file, selected, lookup],
  );
  const bounds = useMemo(() => {
    const viewed =
      selected?.level === "municipality"
        ? shapes.filter((s) => s.id === selected.id)
        : shapes;
    if (!selected || !viewed.length) return [0, 0, 850, 750];
    const x = Math.min(...viewed.map((s) => s.bounds[0])),
      y = Math.min(...viewed.map((s) => s.bounds[1])),
      right = Math.max(...viewed.map((s) => s.bounds[2])),
      bottom = Math.max(...viewed.map((s) => s.bounds[3]));
    const w = Math.max(right - x, 3),
      h = Math.max(bottom - y, 3),
      pad = Math.max(w, h) * 0.08;
    return [x - pad, y - pad, w + pad * 2, h + pad * 2];
  }, [selected, shapes]);
  const [x, y, w, h] = bounds,
    box = [
      x + (w * (1 - 1 / zoom)) / 2,
      y + (h * (1 - 1 / zoom)) / 2,
      w / zoom,
      h / zoom,
    ].join(" ");
  const max = Math.max(1, ...counts.values()),
    active = hover ? lookup.get(hover) : selected;
  const choose = (id: string) => {
    setZoom(1);
    onSelect(id);
  };
  const parent =
    selected?.level === "municipality"
      ? selected.province
      : selected?.level === "province"
        ? selected.region
        : "";
  return (
    <div className="ob-map-shell">
      <div className="ob-map-bar">
        <span>
          {selected?.name ?? "España"}{" "}
          <small>
            {" "}
            /{" "}
            {selected?.level === "province" ||
            selected?.level === "municipality"
              ? "Municipios"
              : selected
                ? "Provincias"
                : "Comunidades y ciudades autónomas"}
          </small>
        </span>
        {selected ? (
          <button onClick={() => choose(parent)}>
            <ArrowUpLeft size={15} />
            Volver
          </button>
        ) : null}
      </div>
      <div className="ob-map-canvas" aria-busy={dataset.file !== file}>
        {failed === file ? (
          <div className="ob-map-message" role="alert">
            No se pudo cargar esta capa. Puedes seguir usando los selectores de
            territorio.
            <button
              onClick={() => {
                setFailed("");
                setDataset({ file: "", shapes: [] });
                fetch(`/observatorio/geo/${file}`)
                  .then((r) => {
                    if (!r.ok) throw Error();
                    return r.json();
                  })
                  .then((shapes) => setDataset({ file, shapes }))
                  .catch(() => setFailed(file));
              }}
            >
              Reintentar mapa
            </button>
          </div>
        ) : dataset.file !== file ? (
          <div className="ob-map-message" role="status">
            Cargando cartografía…
          </div>
        ) : (
          <svg
            key={selected?.id ?? "spain"}
            viewBox={box}
            aria-label={`Mapa interactivo de ${selected?.name ?? "España"}`}
            className="ob-map"
            preserveAspectRatio="xMidYMid meet"
          >
            {!selected ? (
              <>
                <text x="50" y="335" className="ob-sea">
                  OCÉANO ATLÁNTICO
                </text>
                <text
                  x="663"
                  y="490"
                  className="ob-sea"
                  transform="rotate(-55 663 490)"
                >
                  MAR MEDITERRÁNEO
                </text>
                <rect
                  x="0"
                  y="604"
                  width="220"
                  height="130"
                  rx="3"
                  className="ob-inset"
                />
                <text x="12" y="622" className="ob-sea">
                  CANARIAS · RECUADRO
                </text>
              </>
            ) : null}
            {shapes.map((shape) => {
              const t = lookup.get(shape.id);
              if (!t) return null;
              const count = counts.get(shape.id) ?? 0;
              return (
                <path
                  key={shape.id}
                  d={shape.d}
                  fill={
                    selected?.id === shape.id
                      ? "#bb552f"
                      : count
                        ? `hsl(163 24% ${75 - (40 * count) / max}%)`
                        : "#e3e8df"
                  }
                  fillRule="evenodd"
                  className="ob-map-region"
                  role="button"
                  tabIndex={0}
                  aria-label={`${t.name}: ${count} publicaciones con mención territorial`}
                  aria-pressed={selected?.id === shape.id}
                  onClick={() => choose(shape.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      choose(shape.id);
                    }
                  }}
                  onMouseEnter={() => setHover(shape.id)}
                  onMouseLeave={() => setHover("")}
                  onFocus={() => setHover(shape.id)}
                  onBlur={() => setHover("")}
                >
                  <title>
                    {t.name} · {count} publicaciones
                  </title>
                </path>
              );
            })}
          </svg>
        )}
        <div className="ob-map-tools" aria-label="Controles del mapa">
          <button
            aria-label="Acercar mapa"
            onClick={() => setZoom((z) => Math.min(3, z + 0.4))}
            disabled={zoom >= 3}
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Alejar mapa"
            onClick={() => setZoom((z) => Math.max(1, z - 0.4))}
            disabled={zoom <= 1}
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Restablecer mapa de España"
            onClick={() => choose("")}
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <div className="ob-map-caption">
          <span className="ob-dot" />
          <strong>{active?.name ?? "Explora un territorio"}</strong>
          <span>
            {active
              ? `${counts.get(active.id) ?? 0} publicaciones localizadas`
              : "Selecciona en el mapa o busca un municipio"}
          </span>
        </div>
      </div>
      <div className="ob-map-key">
        <span>
          <i className="ob-swatch ob-zero" />
          Sin menciones recogidas
        </span>
        <span>
          <i className="ob-swatch ob-some" />
          Menos
        </span>
        <span>
          <i className="ob-swatch ob-many" />
          Más publicaciones
        </span>
      </div>
      <p className="ob-map-note">
        El color cuenta menciones territoriales; no mide impacto ni
        aplicabilidad.{" "}
        <a href="https://www.ign.es" target="_blank" rel="noreferrer">
          Cartografía: obra derivada de BDLJE · IGN · CC BY 4.0
        </a>
        .
      </p>
    </div>
  );
}
