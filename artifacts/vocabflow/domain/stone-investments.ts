export type StoneInvestmentPlan = "safe" | "balanced" | "risky";
export type StoneInvestmentStatus = "active" | "succeeded" | "failed";
export type StoneInvestmentDuration = 7 | 14;
export type StoneInvestmentCapitalInvite = "low" | "high" | null;
export const MAX_STONE_INVESTMENT_PRINCIPAL = 900_000_000;

export interface StoneInvestment {
  investmentId: string;
  plan: StoneInvestmentPlan;
  principal: number;
  durationDays: StoneInvestmentDuration;
  startDay: string;
  endDay: string;
  status: StoneInvestmentStatus;
  settlementAmount: number | null;
  lowInsuranceUsed: boolean;
  capitalInvite: StoneInvestmentCapitalInvite;
  collateralUsed: boolean;
  createdAt: string;
  settledAt: string | null;
}

export interface InvestmentStudyDay {
  day: string;
  reviewed: boolean;
  studiedCourse: boolean;
  updatedAt: string;
}

export const STONE_INVESTMENT_PLANS: Record<
  StoneInvestmentPlan,
  { title: string; ratePercent: number; failedSettlementPercent: number }
> = {
  safe: {
    title: "Đầu tư an toàn",
    ratePercent: 5,
    failedSettlementPercent: 99,
  },
  balanced: {
    title: "Đầu tư trung cấp",
    ratePercent: 10,
    failedSettlementPercent: 70,
  },
  risky: {
    title: "Đầu tư có rủi ro",
    ratePercent: 40,
    failedSettlementPercent: -20,
  },
};

export function investmentRate(
  plan: StoneInvestmentPlan,
  durationDays: StoneInvestmentDuration,
  capitalInvite: StoneInvestmentCapitalInvite = null,
): number {
  const inviteMultiplier =
    capitalInvite === "low" ? 1.15 : capitalInvite === "high" ? 1.3 : 1;
  return (
    STONE_INVESTMENT_PLANS[plan].ratePercent *
    (durationDays === 14 ? 3 : 1) *
    inviteMultiplier
  );
}

export function investmentEndDay(startDay: string, durationDays: number): string {
  if (!isInvestmentDay(startDay) || (durationDays !== 7 && durationDays !== 14)) {
    throw new Error("Thời hạn đầu tư không hợp lệ.");
  }
  const date = new Date(`${startDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + durationDays - 1);
  return date.toISOString().slice(0, 10);
}

export function investmentSuccessSettlement(
  plan: StoneInvestmentPlan,
  principal: number,
  durationDays: StoneInvestmentDuration,
  capitalInvite: StoneInvestmentCapitalInvite = null,
): number {
  assertPrincipal(principal);
  const interest = Math.round(
    (principal * investmentRate(plan, durationDays, capitalInvite)) / 100,
  );
  return principal + interest;
}

export function investmentFailureSettlement(
  plan: StoneInvestmentPlan,
  principal: number,
  capitalInvite: StoneInvestmentCapitalInvite = null,
  lowInsuranceUsed = false,
): number {
  assertPrincipal(principal);
  if (lowInsuranceUsed) return principal;
  const lossMultiplier =
    capitalInvite === "low" ? 1.3 : capitalInvite === "high" ? 1.4 : 1;
  const baseNetLossPercent =
    100 - STONE_INVESTMENT_PLANS[plan].failedSettlementPercent;
  return Math.round(
    (principal * (100 - baseNetLossPercent * lossMultiplier)) / 100,
  );
}

export function investmentNetResult(
  settlementAmount: number,
  principal: number,
): number {
  return settlementAmount - principal;
}

export function studyDaysRequired(
  startDay: string,
  durationDays: StoneInvestmentDuration,
): string[] {
  if (!isInvestmentDay(startDay) || (durationDays !== 7 && durationDays !== 14)) {
    throw new Error("Thời hạn đầu tư không hợp lệ.");
  }
  return Array.from({ length: durationDays }, (_, index) => {
    const date = new Date(`${startDay}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function evaluateStoneInvestment(
  investment: Pick<
    StoneInvestment,
    "plan" | "principal" | "durationDays" | "startDay" | "endDay" | "status"
  > &
    Partial<
      Pick<
        StoneInvestment,
        "lowInsuranceUsed" | "capitalInvite" | "collateralUsed"
      >
    >,
  completedStudyDays: ReadonlySet<string>,
  today: string,
): { status: StoneInvestmentStatus; settlementAmount: number | null } {
  if (
    investment.status !== "active" ||
    !isInvestmentDay(today) ||
    investmentEndDay(investment.startDay, investment.durationDays) !==
      investment.endDay
  ) {
    return { status: investment.status, settlementAmount: null };
  }

  const requiredDays = studyDaysRequired(
    investment.startDay,
    investment.durationDays,
  );
  const missedPastDay = requiredDays.some(
    (day) => day < today && !completedStudyDays.has(day),
  );
  if (missedPastDay) {
    return {
      status: "failed",
      settlementAmount: investmentFailureSettlement(
        investment.plan,
        investment.principal,
        investment.capitalInvite ?? null,
        investment.lowInsuranceUsed ?? false,
      ),
    };
  }

  const allDaysCompleted = requiredDays.every((day) =>
    completedStudyDays.has(day),
  );
  if (allDaysCompleted && today >= investment.endDay) {
    return {
      status: "succeeded",
      settlementAmount: investmentSuccessSettlement(
        investment.plan,
        investment.principal,
        investment.durationDays,
        investment.capitalInvite ?? null,
      ),
    };
  }

  if (today > investment.endDay) {
    return {
      status: "failed",
      settlementAmount: investmentFailureSettlement(
        investment.plan,
        investment.principal,
        investment.capitalInvite ?? null,
        investment.lowInsuranceUsed ?? false,
      ),
    };
  }

  return { status: "active", settlementAmount: null };
}

export function isValidInvestmentStudyDay(
  value: unknown,
): value is InvestmentStudyDay {
  if (!isRecord(value)) return false;
  return (
    isInvestmentDay(value.day) &&
    typeof value.reviewed === "boolean" &&
    typeof value.studiedCourse === "boolean" &&
    (value.reviewed || value.studiedCourse) &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}

export function isValidStoneInvestment(
  value: unknown,
): value is StoneInvestment {
  if (!isRecord(value)) return false;
  const {
    investmentId,
    plan,
    principal,
    durationDays,
    startDay,
    endDay,
    status,
    settlementAmount,
    createdAt,
    settledAt,
    lowInsuranceUsed = false,
    capitalInvite = null,
    collateralUsed = false,
  } = value;
  if (
    typeof investmentId !== "string" ||
    !/^investment:[a-z0-9-]{1,120}$/i.test(investmentId) ||
    !(plan === "safe" || plan === "balanced" || plan === "risky") ||
    typeof lowInsuranceUsed !== "boolean" ||
    !(capitalInvite === null || capitalInvite === "low" || capitalInvite === "high") ||
    typeof collateralUsed !== "boolean" ||
    (lowInsuranceUsed && plan !== "risky") ||
    (collateralUsed &&
      (plan !== "risky" || lowInsuranceUsed || status !== "failed")) ||
    typeof principal !== "number" ||
    !Number.isSafeInteger(principal) ||
    principal <= 0 ||
    principal > MAX_STONE_INVESTMENT_PRINCIPAL ||
    (durationDays !== 7 && durationDays !== 14) ||
    !isInvestmentDay(startDay) ||
    !isInvestmentDay(endDay) ||
    investmentEndDay(startDay, durationDays) !== endDay ||
    !(status === "active" || status === "succeeded" || status === "failed") ||
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt)) ||
    (settledAt !== null &&
      (typeof settledAt !== "string" || !Number.isFinite(Date.parse(settledAt))))
  ) {
    return false;
  }
  if (status === "active") {
    return (
      settlementAmount === null &&
      settledAt === null &&
      !collateralUsed
    );
  }
  if (
    typeof settlementAmount !== "number" ||
    !Number.isSafeInteger(settlementAmount) ||
    settledAt === null
  ) {
    return false;
  }
  return status === "succeeded"
    ? !collateralUsed &&
        settlementAmount ===
          investmentSuccessSettlement(plan, principal, durationDays, capitalInvite)
    : settlementAmount ===
        investmentFailureSettlement(
          plan,
          principal,
          capitalInvite,
          lowInsuranceUsed || collateralUsed,
        );
}

export function isInvestmentDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function assertPrincipal(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_STONE_INVESTMENT_PRINCIPAL
  ) {
    throw new Error("Số Stone đầu tư phải là số nguyên dương.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
