import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { IndicatorTrend } from "@/components/mandate/IndicatorTrend";
import type { Indicator, Observation } from "@/lib/mandate/model";

function indicator(observations: Observation[], frequency = "quarterly"): Indicator {
  return {
    id: "trend-test",
    label: "Serie de prueba del gráfico",
    topic: "economia",
    unit: "unidades de prueba",
    geography: "España",
    frequency,
    observations,
    baseline: observations[0],
    latest: observations.at(-1)!,
    source: {
      id: "trend-source-test",
      title: "Fuente de prueba",
      url: "https://www.ine.es/",
      producer: "Fuente de prueba",
      publishedAt: null,
      retrievedAt: "2026-10-07T10:00:00Z",
      locator: "Solo prueba unitaria, sin descarga",
      excerpt: "Datos sintéticos para verificar huecos y ceros.",
      role: "indicator",
    },
    caveats: [],
    explanation: "Solo prueba de representación.",
  };
}

function linePaths(html: string) {
  return [...html.matchAll(/<path\b[^>]*class="mn-trend-line"[^>]*\bd="([^"]*)"[^>]*>/g)].map((match) => match[1]);
}
function pointTags(html: string) {
  return [...html.matchAll(/<circle\b[^>]*class="mn-trend-point"[^>]*>/g)].map((match) => match[0]);
}

describe("gráficos de evolución del mandato", () => {
  it("representa [1, null, 3] con dos tramos sin puente y solo dos puntos", () => {
    const html = renderToStaticMarkup(<IndicatorTrend indicator={indicator([
      { period: "2024-Q1", value: 1 },
      { period: "2024-Q2", value: null },
      { period: "2024-Q3", value: 3 },
    ])} />);
    const paths = linePaths(html);
    expect(paths).toHaveLength(2);
    expect(paths.every((path) => path.startsWith("M") && !path.includes("L"))).toBe(true);
    expect(pointTags(html)).toHaveLength(2);
    expect(html).toContain("Los huecos no se conectan");
    expect(html).toContain("unidades de prueba");
  });

  it("corta un periodo mensual ausente y mantiene unidos los meses consecutivos", () => {
    const html = renderToStaticMarkup(<IndicatorTrend indicator={indicator([
      { period: "2024-01", value: 1 },
      { period: "2024-03", value: 3 },
      { period: "2024-04", value: 4 },
    ], "monthly")} />);
    const paths = linePaths(html);
    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toContain("L");
    expect(paths[1].match(/L/g)).toHaveLength(1);
    expect(pointTags(html)).toHaveLength(3);
  });

  it("una serie de ceros conserva tres observaciones finitas a la misma altura", () => {
    const html = renderToStaticMarkup(<IndicatorTrend indicator={indicator([
      { period: "2023", value: 0 },
      { period: "2024", value: 0 },
      { period: "2025", value: 0 },
    ], "annual")} />);
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(linePaths(html)).toHaveLength(1);
    const points = pointTags(html);
    expect(points).toHaveLength(3);
    const heights = points.map((point) => Number(/\bcy="([^"]+)"/.exec(point)![1]));
    expect(heights.every(Number.isFinite)).toBe(true);
    expect(new Set(heights).size).toBe(1);
    expect(html).not.toContain("No hay valores disponibles");
    expect(html).toContain("2025: 0 unidades de prueba");
  });
});
