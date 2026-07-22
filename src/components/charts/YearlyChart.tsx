import React, { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { Expense } from "../../db";
import "../../Main.css";
import "../../pages/Statistics.css";
import { formatNumberCompact } from "../../utils/chartFunctions";

type Props = {
  expenses: Expense[];
  year: number; // the year you want to display
};



const YTDCategoryChart: React.FC<Props> = React.memo(({ expenses, year }) => {
  const { t, i18n } = useTranslation();
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
          new Date(2024, i, 1)
        )
      ),
    [i18n.language]
  );
  
  const monthFullNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
          new Date(2024, i, 1)
        )
      ),
    [i18n.language]
  );

  const data = useMemo(() => {
    if (!year || !expenses.length) {
      // Always return 12 months with zero totals
      return Array.from({ length: 12 }, (_, i) => ({  
        month: i + 1,
        total: 0,
      }));
    }
  
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
  
    const filtered = expenses.filter((e) => {
      const d = new Date(e.expenseDate);
      return d >= start && d <= end;
    });
  
    const monthlyTotals: Record<number, number> = {};
  
    // Sum totals for months that have expenses
    filtered.forEach((exp) => {
      const monthIndex = new Date(exp.expenseDate).getMonth(); // 0–11
      monthlyTotals[monthIndex] =
        (monthlyTotals[monthIndex] || 0) + exp.expenseAmountDefault / 100;
    });
  
    // Always return 12 months
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: monthlyTotals[i] || 0,
    }));
  }, [expenses, year]);
  

  const tickFormatter = (value: number) => monthNames[value - 1];

  const handleBarClick = (_: any, index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index)); // toggle same bar
  };

  const handleChartClick = (e: any) => {
    if (!e?.activeLabel) setActiveIndex(null);
  };



  return (
    <div className="mb-60">
      {data.length === 0 ? (
        <p style={{ textAlign: "center", padding: 20 }}>{t('expenses.none_to_display')}</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={550}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              onClick={handleChartClick}
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

              {/* 🟢 Tooltip with Ionic theme-based style */}
              <Tooltip
                active={activeIndex !== null}
                contentStyle={{
                  backgroundColor: "rgba(var(--ion-tooltip-background-rgb), 0.5)",
                  borderRadius: "8px",
                  border: "none",
                  color: "var(--ion-text-color)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  backdropFilter: "blur(6px)",
                  padding: "8px 12px",
                }}
                itemStyle={{
                  color: "var(--ion-text-color)",
                }}
                labelStyle={{
                  color: "var(--ion-text-color)",
                  fontWeight: 600,
                }}
                formatter={(value, name) => {
                  const numValue = typeof value === 'number' ? value : Number(value) || 0;
                  const nameStr = name ? String(name) : "";
                  return [
                    formatNumberCompact(numValue),
                    nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : "Total",
                  ];
                }}
                labelFormatter={(month: any) => {
                  const monthIdx = Number(month) - 1;
                  return monthFullNames[monthIdx] || "";
                }}
                cursor={false}
              />
              {/* Single bar for total with primary color */}
              <Bar dataKey="total" onClick={handleBarClick}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="var(--ion-color-primary)"
                    stroke={index === activeIndex ? "var(--ion-bar-color)" : "none"}
                    strokeWidth={index === activeIndex ? 1 : 0}
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
