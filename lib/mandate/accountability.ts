import type { Commitment } from "./model";

/** Review coverage is measurable; the current archive has no fulfilment assessments. */
export function getMandateAccountability(commitments: Commitment[]) {
  const total = commitments.length;
  const documented = commitments.filter((item) => item.review.status === "documented").length;
  const partial = commitments.filter((item) => item.review.status === "partial").length;
  const pending = commitments.filter((item) => item.review.status === "pending").length;
  const contrasted = documented + partial;
  return {
    total, documented, partial, pending, contrasted,
    coveragePercent: total ? Math.round(contrasted / total * 1000) / 10 : null,
    // An action or partial documentary review cannot be scored as a fulfilled promise.
    fulfilmentPercent: null,
  };
}
