import React, { useMemo } from "react";
import { Expense, Category } from "../../db";
import { useCurrency } from "../../context/CurrencyContext";
import { formatPrice, formatNumberCompact } from "../../utils/chartFunctions";
import { useTranslation } from 'react-i18next';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from "recharts";

import '../../pages/Statistics.css';

interface TwoMonthsChartProps {
  expenses: (Expense & { category: Category | null })[];
  sortOption: "thisMonth" | "change" | "alphabetical";
}

const TwoMonthsChart: React.FC<TwoMonthsChartProps> = React.memo(({ expenses, sortOption }) => {
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const barHeight = 7;
  const labelHeight = 35;
  const padding = 90;

  const data = useMemo(() => {
    const now = new Date();

    // --- Define calendar month ranges ---
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthEnd = new Date(now);
    thisMonthEnd.setHours(23, 59, 59, 999);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevMonthStart.setHours(0, 0, 0, 0);

    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    prevMonthEnd.setHours(23, 59, 59, 999);

    // --- Aggregate expenses per category ---
    const sums: Record<string, { name: string; thisMonth: number; prevMonth: number }> = {};

    expenses.forEach((exp) => {
      const categoryName = exp.category?.categoryName || t('categories.uncategorized');
      const date = new Date(exp.expenseDate);

      if (!sums[categoryName]) {
        sums[categoryName] = { name: categoryName, thisMonth: 0, prevMonth: 0 };
      }

      const amount = exp.expenseAmountDefault / 100;

      if (date >= thisMonthStart && date <= thisMonthEnd) {
        sums[categoryName].thisMonth += amount;
      } else if (date >= prevMonthStart && date <= prevMonthEnd) {
        sums[categoryName].prevMonth += amount;
      }
    });

    const sorted = Object.values(sums);

    if (sortOption === "thisMonth") {
      sorted.sort((a, b) => b.thisMonth - a.thisMonth);
    } else if (sortOption === "change") {
      sorted.sort((a, b) => (b.thisMonth - b.prevMonth) - (a.thisMonth - a.prevMonth));
    } else if (sortOption === "alphabetical") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [expenses, sortOption]);

  const chartHeight = useMemo(() => {
    return Math.max(
      data.length * (barHeight + labelHeight) + padding,
      barHeight + labelHeight + padding
    );
  }, [data.length]);


  // --- Custom Bar background ---
  const CustomBar = (props: any) => {
    const { x = 0, y = 0, width = 0, height = 0, fill } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={props.background?.width ?? width}
          height={height}
          fill="var(--ion-color-light-shade)"
        />
        <rect x={x} y={y} width={width} height={height} fill={fill} />
      </g>
    );
  };

  // --- Get month names for legend ---
  const now = new Date();
  const thisMonthName = now.toLocaleString("default", { month: "long" });
  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString(
    "default",
    { month: "long" }
  );

  return (
    <div className="two_month_chart">
      {data.length === 0 ? (
        <p style={{ textAlign: "center", padding: 20 }}>
          {t('expenses.none_to_display')}
        </p>
      ) : (
        <div
          style={{
            width: "100%",
            height: chartHeight + 50,
            minHeight: barHeight + labelHeight + padding,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barSize={barHeight}
              layout="vertical"
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value) => formatNumberCompact(value)}
              />
              <YAxis type="category" dataKey="name" hide />

              {/* This Month */}
              <Bar
                dataKey="thisMonth"
                fill="var(--ion-color-primary)"
                name={`This Month (${thisMonthName})`}
                shape={CustomBar}
              >
                <LabelList
                  content={(props) => {
                    const { y = 0, index } = props;
                    if (index === undefined) return null;
                    const numericY = typeof y === "number" ? y : Number(y);
                    const item = data[index];
                    if (!item) return null;

                    const formattedValue = formatPrice(
                      item.thisMonth,
                      currency.defaultCurrency.code,
                      currency.defaultCurrency.locale
                    );

                    return (
                      <text
                        x={10}
                        y={numericY - 5}
                        textAnchor="start"
                        fill="var(--ion-text-color)"
                        fontSize={14}
                      >
                        {item.name}: {formattedValue}
                      </text>
                    );
                  }}
                />
              </Bar>

              {/* Previous Month */}
              <Bar
                dataKey="prevMonth"
                fill="var(--medGray)"
                name={`Previous Month (${prevMonthName})`}
                shape={CustomBar}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <ul className="legend-list">
            <li className="legend-item">
              <span
                className="legend-color-box"
                style={{ backgroundColor: "var(--medGray)" }}
              />
              <span>{`Previous Month (${prevMonthName})`}</span>
            </li>

            <li className="legend-item">
              <span
                className="legend-color-box"
                style={{ backgroundColor: "var(--ion-color-primary)" }}
              />
              <span>{`This Month (${thisMonthName})`}</span>
            </li>
          </ul>

          <div className="chart-note">
            <strong>{t('common.important')}</strong>{t('categories.showing')}
          </div>

        </div>
      )}


    </div>
  );
});

export default TwoMonthsChart;
