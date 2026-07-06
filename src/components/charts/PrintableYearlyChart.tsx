import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Expense } from "../../db";
import "../../Main.css";
import "../../pages/Statistics.css";
import { formatNumberCompact } from "../../utils/chartFunctions";

type Props = {
  expenses: Expense[];
};


const YTDCategoryChart: React.FC<Props> = React.memo(({ expenses }) => {
  const { t, i18n } = useTranslation();

  const data = useMemo(() => {
    if (!expenses.length) return [];

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const ytdExpenses = expenses.filter(
      (e) =>
        new Date(e.expenseDate) >= startOfYear &&
        new Date(e.expenseDate) <= now
    );

    const monthlyTotals: Record<number, number> = {};

    ytdExpenses.forEach((exp) => {
      const monthKey = new Date(exp.expenseDate).getMonth() + 1;
      monthlyTotals[monthKey] =
        (monthlyTotals[monthKey] || 0) + exp.expenseAmountDefault / 100;
    });

    return Object.entries(monthlyTotals)
      .map(([month, total]) => ({ month: parseInt(month, 10), total }))
      .sort((a, b) => a.month - b.month);
  }, [expenses]);

  const tickFormatter = (value: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(2024, value - 1, 1)
    );



  return (
    <div className="mb-60">
      {data.length === 0 ? (
        <p style={{ textAlign: "center", padding: 20 }}>{t('expenses.none_to_display')}</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
                tickFormatter={tickFormatter}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => formatNumberCompact(value)}
              />

              {/* Single bar for total with primary color */}
              <Bar dataKey="total">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="#64A0DB"
                  />
                ))}
              </Bar>      
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

export default YTDCategoryChart;
