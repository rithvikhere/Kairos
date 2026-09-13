/**
 * PLACEHOLDER RISK FORMULAS — Phase 8's 11 new constraint-driven risk dimensions.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IMPORTANT: every function in this file is an UNVALIDATED HEURISTIC, not a
 * proven model like Phase 1's core three risk formulas (scheduleRisk,
 * budgetRisk, staffingRisk), which were derived from Brooks's-Law-style
 * team-efficiency math and tested against known feasibility thresholds.
 *
 * These 11 are grounded in general, publicly documented project-management
 * and software-estimation concepts (COCOMO II's cost-driver philosophy,
 * NASA's software requirements-volatility risk metric, PMI stakeholder-
 * complexity literature) but there is no single universally-agreed formula
 * for any of them — that's true in the literature itself, not just in this
 * codebase. Each function below documents its reasoning and its ASSUMED
 * value domain (since the Phase 8 spec never defined units for these
 * constraints), and should be reviewed/recalibrated against real project
 * data before being trusted the way Phase 1's formulas are.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Clamp a number into [0, 100], the shared risk-score range for this project. */
function clampRisk(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/**
 * teamSeniorityMix — ASSUMED VALUE DOMAIN: 0.0–1.0, the fraction of the team
 * that is senior/experienced (e.g. 0.3 = 30% senior).
 *
 * Reasoning: COCOMO II's personnel-capability and personnel-experience cost
 * drivers treat more experienced teams as producing proportionally less
 * effort/risk, and less experienced teams as proportionally more (see
 * Boehm's COCOMO II cost-driver tables). This is modeled here as a simple
 * inverse-linear relationship: risk rises as the senior fraction falls.
 * PLACEHOLDER — COCOMO's actual multipliers are non-linear and much more
 * granular (5 rating levels per driver); this is a simplified stand-in.
 */
export function teamSeniorityMixRisk(seniorFraction: number): number {
  const clamped = Math.min(1, Math.max(0, seniorFraction));
  return clampRisk((1 - clamped) * 100);
}

/**
 * attritionRisk — ASSUMED VALUE DOMAIN: 0.0–1.0, expected probability/rate
 * of losing at least one team member during the project (e.g. 0.2 = 20%
 * expected attrition risk over the project's duration).
 *
 * Reasoning: analogous to COCOMO II's Personnel Continuity (PCON) cost
 * driver — turnover forces ramp-up time for replacements and causes
 * knowledge loss, both of which compound risk faster than the raw
 * attrition percentage alone. Modeled with a 1.5x amplification factor
 * over a linear mapping to reflect that compounding, capped at 100.
 * PLACEHOLDER — the 1.5x factor is an assumption, not a calibrated constant.
 */
export function attritionRisk(attritionRate: number): number {
  const clamped = Math.min(1, Math.max(0, attritionRate));
  return clampRisk(clamped * 100 * 1.5);
}

/**
 * externalDependencyCount — ASSUMED VALUE DOMAIN: a non-negative integer,
 * the count of external teams/systems/vendors this scenario depends on.
 *
 * Reasoning: risk from external dependencies compounds but with
 * diminishing marginal impact per additional dependency (the first
 * external dependency introduces much more coordination risk than the
 * tenth, since a team already coordinating with several externals has
 * already adapted its process). Modeled as a saturating exponential
 * approach to 100, with a decay constant of 5 dependencies.
 * PLACEHOLDER — the decay constant (5) is an assumption.
 */
export function dependencyRisk(dependencyCount: number): number {
  const n = Math.max(0, dependencyCount);
  return clampRisk(100 * (1 - Math.exp(-n / 5)));
}

/**
 * technicalDebtLevel — ASSUMED VALUE DOMAIN: 0–10 subjective severity
 * rating (0 = clean codebase, 10 = severe, pervasive debt).
 *
 * Reasoning: modeled as a simple linear scaling, reflecting the common
 * "technical debt as interest" framing (debt doesn't just cost once, it
 * continues costing until paid down) — but since this function only scores
 * a point-in-time severity rating rather than modeling the compounding
 * interest over the project's duration, this is a deliberately simplified
 * PLACEHOLDER; a more faithful model would compound this over
 * estimatedTimeWeeks rather than treat it as a flat multiplier.
 */
export function technicalDebtRisk(debtSeverity0to10: number): number {
  const clamped = Math.min(10, Math.max(0, debtSeverity0to10));
  return clampRisk((clamped / 10) * 100);
}

/**
 * scopeVolatility — ASSUMED VALUE DOMAIN: 0–100, the percentage of
 * requirements expected to change during the project (matches the
 * standard industry Requirements Volatility metric: changed requirements /
 * total requirements × 100).
 *
 * Reasoning: NASA's software engineering risk guidance (SWE-200 / R015)
 * flags specific requirements-volatility thresholds as risk milestones —
 * roughly 10%, 20%, and 40% volatility at successive project review
 * gates are treated as escalating risk signals in that guidance. This
 * function uses those same three percentages as anchor points for a
 * piecewise-linear risk curve, rather than inventing arbitrary breakpoints.
 * PLACEHOLDER — NASA's thresholds are tied to specific named review
 * milestones (TRR/SIR/CDR) for safety-critical aerospace software; using
 * them as generic anchor points for an arbitrary project is an
 * approximation, not a like-for-like application of that guidance.
 */
export function scopeVolatilityRisk(volatilityPercent: number): number {
  const v = Math.min(100, Math.max(0, volatilityPercent));
  // Anchor points: (0%, 0) -> (10%, 25) -> (20%, 55) -> (40%, 85) -> (100%, 100)
  const anchors: Array<[number, number]> = [
    [0, 0],
    [10, 25],
    [20, 55],
    [40, 85],
    [100, 100],
  ];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a0 = anchors[i];
    const a1 = anchors[i + 1];
    if (!a0 || !a1) continue;
    const [x0, y0] = a0;
    const [x1, y1] = a1;
    if (v >= x0 && v <= x1) {
      const t = x1 === x0 ? 0 : (v - x0) / (x1 - x0);
      return clampRisk(y0 + t * (y1 - y0));
    }
  }
  return clampRisk(v);
}

/**
 * distributedTeamOverhead — ASSUMED VALUE DOMAIN: a positive integer, the
 * number of distinct sites/locations the team is split across (1 = fully
 * co-located).
 *
 * Reasoning: analogous to COCOMO II's multisite development (SITE) cost
 * driver — coordination overhead increases with site count but each
 * additional site matters less than the jump from 1 (co-located) to 2
 * (any distribution at all). Modeled as a saturating curve anchored so a
 * single site produces zero risk.
 * PLACEHOLDER — does not account for time-zone distance or communication
 * tooling quality, both of which materially affect real multisite risk.
 */
export function distributedTeamOverheadRisk(siteCount: number): number {
  const n = Math.max(1, siteCount);
  return clampRisk(100 * (1 - 1 / n));
}

/**
 * vendorLeadTimeWeeks — ASSUMED VALUE DOMAIN: non-negative number of weeks
 * of vendor/procurement lead time this scenario depends on.
 *
 * Reasoning: modeled as a saturating exponential, same shape as
 * dependencyRisk, on the assumption that short lead times (under ~2 weeks)
 * are usually absorbable within normal schedule buffer, while long lead
 * times (several months) approach a ceiling of risk regardless of exactly
 * how much longer they get, since the project is already effectively
 * blocked either way.
 * PLACEHOLDER — the decay constant (6 weeks) is an assumption, and this
 * has no awareness of the scenario's own deadlineWeeks, which a more
 * complete model would compare lead time against directly.
 */
export function vendorLeadTimeRisk(leadTimeWeeks: number): number {
  const w = Math.max(0, leadTimeWeeks);
  return clampRisk(100 * (1 - Math.exp(-w / 6)));
}

/**
 * regulatoryComplexity — ASSUMED VALUE DOMAIN: 0–10 subjective rating of
 * compliance/regulatory burden (0 = none, 10 = multiple overlapping
 * heavily-audited regimes, e.g. combined data-privacy + financial +
 * healthcare compliance).
 *
 * Reasoning: modeled as linear scaling, same shape as technicalDebtRisk.
 * PLACEHOLDER — real regulatory risk is typically closer to a step
 * function (crossing into "requires a formal audit" is a much bigger
 * jump than one more point of subjective complexity) than a smooth line;
 * this is a simplification pending real calibration data.
 */
export function regulatoryComplexityRisk(complexity0to10: number): number {
  const clamped = Math.min(10, Math.max(0, complexity0to10));
  return clampRisk((clamped / 10) * 100);
}

/**
 * qualityRigor — ASSUMED VALUE DOMAIN: 0–10 subjective rating of the
 * required quality/testing rigor bar (0 = minimal, 10 = extremely rigorous
 * — e.g. formal verification, extensive regression suites, compliance
 * sign-off testing).
 *
 * Reasoning (documented judgment call, not settled either way in the
 * source spec): higher required rigor is a RISK CONTRIBUTOR here, on the
 * assumption that a high rigor bar is a real project constraint that
 * consumes schedule/budget if not separately resourced for — this
 * function scores the risk of the requirement itself being demanding, not
 * the (separate, protective) benefit of actually meeting it. A dampening
 * factor of 0.8 reflects that rigor is only partially a pure risk (some
 * of its cost is presumably already accounted for elsewhere, e.g. in
 * scope/effort), unlike a pure risk-only dimension like dependency count.
 * PLACEHOLDER — this directionality (higher rigor = higher risk) is a
 * judgment call flagged explicitly in the Phase 8 master prompt; an
 * alternative model could instead treat qualityRigor as RISK-REDUCING for
 * defect-related outcomes not currently modeled in this project at all.
 */
export function qualityRigorRisk(rigor0to10: number): number {
  const clamped = Math.min(10, Math.max(0, rigor0to10));
  return clampRisk((clamped / 10) * 100 * 0.8);
}

/**
 * stakeholderCount — ASSUMED VALUE DOMAIN: a non-negative integer, the
 * count of distinct stakeholder groups/approvers whose sign-off or input
 * this scenario depends on.
 *
 * Reasoning: PMI stakeholder-management literature consistently treats a
 * larger number of stakeholder groups as increasing project complexity
 * and risk (more parties, more potential for conflicting priorities,
 * slower approvals) without prescribing a specific universal formula —
 * this is a genuinely qualitative finding in that literature, not a
 * numeric model. Modeled here as a saturating exponential, same shape as
 * dependencyRisk, on the assumption that the jump from 1 to a handful of
 * stakeholders matters more than the jump from a dozen to two dozen.
 * PLACEHOLDER — does not distinguish stakeholder INFLUENCE/alignment
 * (which the literature treats as at least as important as raw count)
 * from raw count.
 */
export function stakeholderCountRisk(stakeholderCount: number): number {
  const n = Math.max(0, stakeholderCount);
  return clampRisk(100 * (1 - Math.exp(-n / 8)));
}

/**
 * teamFamiliarity — ASSUMED VALUE DOMAIN: 0.0–1.0, the fraction of the
 * team already familiar with the relevant technology/domain (e.g. 0.7 =
 * 70% of the team has worked in this stack/domain before).
 *
 * Reasoning: analogous to COCOMO II's Application Experience (APEX),
 * Platform Experience (PLEX), and Language & Tool Experience (LTEX) cost
 * drivers, which each treat lower experience/familiarity as increasing
 * effort and risk. Modeled as a direct inverse-linear relationship,
 * same shape as teamSeniorityMixRisk (a deliberately distinct constraint
 * from seniority — a senior team can still be unfamiliar with a new
 * domain, and vice versa).
 * PLACEHOLDER — as with teamSeniorityMixRisk, COCOMO's real multipliers
 * are non-linear and multi-driver; this is a simplified stand-in.
 */
export function teamFamiliarityRisk(familiarFraction: number): number {
  const clamped = Math.min(1, Math.max(0, familiarFraction));
  return clampRisk((1 - clamped) * 100);
}
