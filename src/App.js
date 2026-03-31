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

function Field({ label, value, onChange, step = "1000" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 14 }}>{label}</div>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        style={{ width: "100%", padding: 6 }}
      />
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

  const yearsToRetirement = Math.max(0, safeRetirementAge - safeCurrentAge);

  const projectedSavingsAtRetirement = useMemo(() => {
    let balance = currentSavings;
    for (let i = 0; i < yearsToRetirement; i++) {
      balance = (balance + annualContribution) * (1 + annualReturn);
    }
    return balance;
  }, [currentSavings, annualContribution, annualReturn, yearsToRetirement]);

  const retirementProjection = useMemo(() => {
    let balance = projectedSavingsAtRetirement;
    const rows = [];

    for (let age = safeRetirementAge; age <= safeLifeExpectancy; age++) {
      const years = age - safeCurrentAge;
      const expense = annualRetirementExpense * Math.pow(1 + inflation, years);
      const income = annualRetirementIncome * Math.pow(1 + inflation, years);
      const gap = Math.max(0, expense - income);

      balance = balance * (1 + annualReturn) - gap;

      rows.push({ age, balance: Math.max(0, balance), gap });
    }

    return rows;
  }, [projectedSavingsAtRetirement, safeRetirementAge, safeLifeExpectancy]);

  const finalBalance = retirementProjection[retirementProjection.length - 1]?.balance || 0;
  const firstShortfallAge = retirementProjection.find(r => r.balance === 0)?.age;
  const funded = finalBalance > 0;

  return (
    <div style={{ padding: 20 }}>
      <h2>Basic Retirement Planning App</h2>

      <h3>Summary</h3>
      <div>Savings at retirement: {fmtCurrency(projectedSavingsAtRetirement)}</div>
      <div>Ending balance: {fmtCurrency(finalBalance)}</div>
      <div>Status: {funded ? "Funded" : "Shortfall"}</div>

      <h3>Inputs</h3>
      <Field label="Current Age" value={currentAge} onChange={setCurrentAge} step="1" />
      <Field label="Retirement Age" value={retirementAge} onChange={setRetirementAge} step="1" />
      <Field label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} step="1" />
      <Field label="Savings" value={currentSavings} onChange={setCurrentSavings} />
      <Field label="Contribution" value={annualContribution} onChange={setAnnualContribution} />
      <Field label="Return" value={annualReturn} onChange={setAnnualReturn} step="0.001" />
      <Field label="Inflation" value={inflation} onChange={setInflation} step="0.001" />
      <Field label="Expense" value={annualRetirementExpense} onChange={setAnnualRetirementExpense} />
      <Field label="Income" value={annualRetirementIncome} onChange={setAnnualRetirementIncome} />

      <h3>Recommendation</h3>
      {funded ? (
        <div>✅ You are on track through age {safeLifeExpectancy}</div>
      ) : (
        <div>⚠️ Shortfall around age {firstShortfallAge}</div>
      )}

      <h3>Schedule</h3>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Age</th>
            <th>Gap</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {retirementProjection.map(r => (
            <tr key={r.age}>
              <td>{r.age}</td>
              <td>{fmtCurrency(r.gap)}</td>
              <td>{fmtCurrency(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
