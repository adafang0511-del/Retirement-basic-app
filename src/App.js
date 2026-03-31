import React, { useMemo, useState } from "react";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

function clamp(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function Field({ label, value, onChange, step = "1000", helper }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
      />
      {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
    </label>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-slate-900";

  return (
    <Card title={label}>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </Card>
  );
}

function MiniBar({ value, max, colorClass = "bg-slate-900" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function RetirementPlanningBasicAppPolished() {
  const [currentAge, setCurrentAge] = useState(50);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [currentSavings, setCurrentSavings] = useState(800000);
  const [annualContribution, setAnnualContribution] = useState(25000);
  const [annualReturn, setAnnualReturn] = useState(0.06);
  const [inflation, setInflation] = useState(0.025);
  const [annualRetirementExpense, setAnnualRetirementExpense] = useState(80000);
  const [annualRetirementIncome, setAnnualRetirementIncome] = useState(35000);

  const safeCurrentAge = clamp(currentAge);
  const safeRetirementAge = Math.max(safeCurrentAge, clamp(retirementAge));
  const safeLifeExpectancy = Math.max(safeRetirementAge, clamp(lifeExpectancy));
  const safeCurrentSavings = clamp(currentSavings);
  const safeAnnualContribution = clamp(annualContribution);
  const safeAnnualReturn = clamp(annualReturn);
  const safeInflation = clamp(inflation);
  const safeAnnualRetirementExpense = clamp(annualRetirementExpense);
  const safeAnnualRetirementIncome = clamp(annualRetirementIncome);

  const yearsToRetirement = Math.max(0, safeRetirementAge - safeCurrentAge);
  const yearsInRetirement = Math.max(0, safeLifeExpectancy - safeRetirementAge);

  const projectedSavingsAtRetirement = useMemo(() => {
    let balance = safeCurrentSavings;
    for (let i = 0; i < yearsToRetirement; i += 1) {
      balance = (balance + safeAnnualContribution) * (1 + safeAnnualReturn);
    }
    return balance;
  }, [safeCurrentSavings, safeAnnualContribution, safeAnnualReturn, yearsToRetirement]);

  const retirementProjection = useMemo(() => {
    const rows = [];
    let balance = projectedSavingsAtRetirement;

    for (let age = safeRetirementAge; age <= safeLifeExpectancy; age += 1) {
      const yearsFromToday = age - safeCurrentAge;
      const inflatedExpense = safeAnnualRetirementExpense * Math.pow(1 + safeInflation, yearsFromToday);
      const inflatedIncome = safeAnnualRetirementIncome * Math.pow(1 + safeInflation, yearsFromToday);
      const gap = Math.max(0, inflatedExpense - inflatedIncome);

      balance = balance * (1 + safeAnnualReturn) - gap;

      rows.push({
        age,
        balance: Math.max(0, balance),
        gap,
        depleted: balance <= 0,
      });
    }

    return rows;
  }, [
    projectedSavingsAtRetirement,
    safeRetirementAge,
    safeLifeExpectancy,
    safeAnnualReturn,
    safeAnnualRetirementExpense,
    safeAnnualRetirementIncome,
    safeInflation,
    safeCurrentAge,
  ]);

  const firstYearGap = retirementProjection[0]?.gap ?? 0;
  const finalBalance = retirementProjection[retirementProjection.length - 1]?.balance ?? projectedSavingsAtRetirement;
  const firstShortfallAge = retirementProjection.find((row) => row.depleted)?.age ?? null;
  const funded = finalBalance > 0;

  // --- Scenario helpers (simple what-ifs) ---
  const simulate = (override = {}) => {
    const retAge = override.retirementAge ?? safeRetirementAge;
    const contrib = override.annualContribution ?? safeAnnualContribution;

    // grow to retirement
    let bal = safeCurrentSavings;
    const yrs = Math.max(0, retAge - safeCurrentAge);
    for (let i = 0; i < yrs; i++) {
      bal = (bal + contrib) * (1 + safeAnnualReturn);
    }

    // retirement drawdown
    let firstGapAge = null;
    for (let age = retAge; age <= safeLifeExpectancy; age++) {
      const yearsFromToday = age - safeCurrentAge;
      const exp = safeAnnualRetirementExpense * Math.pow(1 + safeInflation, yearsFromToday);
      const inc = safeAnnualRetirementIncome * Math.pow(1 + safeInflation, yearsFromToday);
      const gap = Math.max(0, exp - inc);
      bal = bal * (1 + safeAnnualReturn) - gap;
      if (bal <= 0 && firstGapAge === null) firstGapAge = age;
    }
    return { firstGapAge, ending: Math.max(0, bal) };
  };

  const scenarioDelay2 = useMemo(() => simulate({ retirementAge: safeRetirementAge + 2 }), [
    safeRetirementAge, safeCurrentAge, safeCurrentSavings, safeAnnualContribution, safeAnnualReturn,
    safeAnnualRetirementExpense, safeAnnualRetirementIncome, safeInflation, safeLifeExpectancy
  ]);

  const scenarioMoreSave = useMemo(() => simulate({ annualContribution: safeAnnualContribution + 10000 }), [
    safeRetirementAge, safeCurrentAge, safeCurrentSavings, safeAnnualContribution, safeAnnualReturn,
    safeAnnualRetirementExpense, safeAnnualRetirementIncome, safeInflation, safeLifeExpectancy
  ]);

  const chartRows = retirementProjection.slice(0, 16);
  const chartMax = Math.max(projectedSavingsAtRetirement, ...chartRows.map((row) => row.balance), 1);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Basic Retirement Planning App</h1>
            <p className="mt-1 text-sm text-slate-600">
              Now includes inflation-adjusted retirement spending for a more realistic quick estimate.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Savings at retirement" value={fmtCurrency(projectedSavingsAtRetirement)} />
          <MetricCard label="First-year retirement gap" value={fmtCurrency(firstYearGap)} tone={firstYearGap === 0 ? "good" : "warn"} />
          <MetricCard label="Ending balance" value={fmtCurrency(finalBalance)} tone={funded ? "good" : "bad"} />
          <MetricCard label="Status" value={funded ? "Funded" : "Shortfall"} tone={funded ? "good" : "bad"} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Inputs" subtitle="Now includes inflation for more realistic results.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current age" value={currentAge} onChange={setCurrentAge} step="1" />
              <Field label="Retirement age" value={retirementAge} onChange={setRetirementAge} step="1" />
              <Field label="Life expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} step="1" />
              <Field label="Current savings" value={currentSavings} onChange={setCurrentSavings} />
              <Field label="Annual contribution" value={annualContribution} onChange={setAnnualContribution} />
              <Field label="Annual return" value={annualReturn} onChange={setAnnualReturn} step="0.001" helper={`Currently ${fmtPct(safeAnnualReturn)}`} />
              <Field label="Inflation rate" value={inflation} onChange={setInflation} step="0.001" helper={`Currently ${fmtPct(safeInflation)}`} />
              <Field label="Annual retirement expense (today)" value={annualRetirementExpense} onChange={setAnnualRetirementExpense} />
              <Field label="Annual retirement income (today)" value={annualRetirementIncome} onChange={setAnnualRetirementIncome} />
            </div>
          </Card>

          <Card title="Recommendation" subtitle="Clear takeaway and suggested actions.">
            <div className="space-y-3 text-sm">
              {funded ? (
                <>
                  <div className="text-emerald-700 font-medium">✅ You are on track</div>
                  <div className="text-slate-700">
                    Your current plan appears sustainable through age <strong>{safeLifeExpectancy}</strong>, even after accounting for inflation.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-red-600 font-medium">⚠️ Potential shortfall detected</div>
                  <div className="text-slate-700">
                    Shortfall{firstShortfallAge ? ` starting around age ${firstShortfallAge}` : ""} after accounting for inflation.
                  </div>
                </>
              )}

              <div className="rounded-xl bg-slate-50 p-3">
                <div className="font-medium text-slate-800 mb-1">What-if scenarios</div>
                <ul className="list-disc ml-5 space-y-1 text-slate-700">
                  <li>
                    <strong>Retire 2 years later:</strong>{" "}
                    {scenarioDelay2.firstGapAge
                      ? `shortfall moves to ~age ${scenarioDelay2.firstGapAge}`
                      : `no shortfall through age ${safeLifeExpectancy}`}
                  </li>
                  <li>
                    <strong>Save +$10,000/year:</strong>{" "}
                    {scenarioMoreSave.firstGapAge
                      ? `shortfall moves to ~age ${scenarioMoreSave.firstGapAge}`
                      : `no shortfall through age ${safeLifeExpectancy}`}
                  </li>
                </ul>
              </div>

              <div className="text-slate-600">
                Suggested actions: delay retirement, increase savings, reduce expenses, or improve returns (with risk awareness).
              </div>
            </div>
          </Card>
        </div>

        <Card title="Retirement by age (inflation adjusted)">
          <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Age</th>
                  <th className="px-3 py-2 text-right">Gap</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {retirementProjection.map((row) => (
                  <tr key={row.age} className="border-b border-slate-100">
                    <td className="px-3 py-2">{row.age}</td>
                    <td className="px-3 py-2 text-right">{fmtCurrency(row.gap)}</td>
                    <td className={`px-3 py-2 text-right ${row.depleted ? "text-red-600 font-semibold" : ""}`}>
                      {fmtCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
