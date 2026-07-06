import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Expense, Category } from "../../db";
import { formatPrice, resolveCategoryColor, formatNumberCompact } from "../../utils/chartFunctions";
import { useCurrency } from "../../context/CurrencyContext";
import { useTranslation } from 'react-i18next';


// Styles
import '../../Main.css';
import '../../pages/Statistics.css';


interface TwelveMonthChartProps {
  expenses: Expense[];
  categories: Category[];
  visibleCategoryIds: number[]; // 👈 Updated prop name and type (Category IDs)
}


const TwelveMonthChart: React.FC<TwelveMonthChartProps> = React.memo(({
  expenses,
  categories,
  visibleCategoryIds
}) => {
  const { currency } = useCurrency();
  const { t, i18n } = useTranslation();
  
  // Internal state for toggling categories. Initialize with the prop.
  // We use useState here because the legend allows local toggling,
  // which should override the initial prop value.
  const [currentVisibleIds, setCurrentVisibleIds] = useState<number[]>([]); 
  const [activeIndex, setActiveIndex] = useState<number | null>(null);



  // --- Build chartData for the last 12 months (Oct → Sep) ---
  const chartData = useMemo(() => {
    if (!expenses.length || !categories.length) return [];
  
    // Build month-year points from expenses
    const points: Record<string, any> = {};
  
    // First, create all months with 0 values
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (12 - i));
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${month}`;
      points[key] = { year, month };
      categories.forEach(cat => {
        if (cat.categoryId > 0) points[key][cat.categoryId] = 0;
      });
    }
  
    // Then add expense amounts
    for (const exp of expenses as Expense[]) { // <-- Type assertion here
      const d = new Date(exp.expenseDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!points[key]) continue;
      points[key][exp.categoryId] += exp.expenseAmountDefault / 100;
    }

    // Return array ordered by month
    return Object.values(points);
  }, [expenses, categories]);


    
  // set top 3 as default visible
  useEffect(() => {
    if (visibleCategoryIds.length > 0) {
      setCurrentVisibleIds(visibleCategoryIds);
    }
  }, [visibleCategoryIds]);

  // --- Compute fixed Y-axis max across all categories and months ---
  const maxValue = useMemo(() => {
    const allValues = chartData.flatMap(d =>
      categories
        .filter(cat => cat.categoryId > 1)
        .map(cat => d[cat.categoryId] || 0)
    );
    return allValues.length ? Math.max(...allValues) * 1.1 : 100; // 10% padding
  }, [chartData, categories]);


  // --- Determine categories that actually have expenses in the chartData ---
  const categoriesWithExpenses = useMemo(() => {
    // Start with a Set for quick and unique additions
    const expenseCategoryIds = new Set<number>();

    // The data keys in chartData are category IDs (as strings)
    // We only care about the keys that are numbers (category IDs > 0)
    for (const dataPoint of chartData) {
      for (const key in dataPoint) {
        const categoryId = Number(key);
        // Check if it's a valid category ID (not 'year', 'month', or 0)
        // AND if the value is greater than 0
        if (categoryId > 0 && dataPoint[key] > 0) {
          expenseCategoryIds.add(categoryId);
        }
      }
    }

    // Convert Set back to an array to be used for filtering
    return Array.from(expenseCategoryIds);
  }, [chartData]);


  // Month tick formatter
  const tickFormatter = (value: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: "short" }).format(
      new Date(2024, value - 1, 1)
    );


  // 2. Custom click handler for dots
  const handleClick = (e: any) => {
    if (!e || e.activeTooltipIndex === undefined) return;

    // Toggle: if clicking the same point, hide tooltip
    setActiveIndex((prev) =>
      prev === e.activeTooltipIndex ? null : e.activeTooltipIndex
    );
  };


  
  return (
    <div className="mb-60">
      {expenses.length === 0 || chartData.every(d =>
          categories.every(cat => !d[cat.categoryId])
        ) ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            {t('expenses.none_to_display')}
          </p>
        ) : (
          <>
            {/* Chart */}
            <div style={{ width: "100%", height: 500 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }} onClick={handleClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-color-medium)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={tickFormatter}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatNumberCompact(value)}
                    domain={[0, maxValue]}
                  />
                  
                  <Tooltip
                    active={activeIndex !== null} // control visibility manually
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;

                      // Safely get month and year label
                      const data = chartData.find(d => d.month === label);
                      const labelText =
                        data && typeof data.month === "number"
                          ? new Intl.DateTimeFormat(i18n.language, {
                              month: "long",
                              year: "numeric",
                            }).format(new Date(data.year, data.month - 1, 1))
                          : String(label ?? "");

                      return (
                        <div className="custom-chart-tooltip">
                          {/* Month label */}
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: "6px",
                              color: "var(--ion-text-color)",
                            }}
                          >
                            {labelText}
                          </div>

                          {/* Each category row */}
                          {payload.map((entry, index) => {
                            // 💡 FIX: Cast entry.name to a string safely
                            const nameStr = entry.name ? String(entry.name) : "";

                            return (
                              <div key={index} className="label-row">
                                {/* Category color square */}
                                <span
                                  className="tooltip-dot"
                                  style={{ backgroundColor: entry.color }} 
                                />

                                {/* Category name and value */}
                                <span style={{ fontSize: "0.9rem" }}>
                                  <strong>
                                    {nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : "Unknown"}:
                                  </strong>{" "}
                                  {formatPrice(
                                    entry.value as number,
                                    currency.defaultCurrency.code,
                                    currency.defaultCurrency.locale
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                    cursor={{ stroke: "gray", strokeWidth: 1 }}
                  />


                  {categories
                    .filter(cat => cat.categoryId > 0)
                    .map(cat =>
                      currentVisibleIds.includes(cat.categoryId) ? (
                        <Line
                          key={cat.categoryId}
                          type="monotone"
                          dataKey={cat.categoryId.toString()}
                          name={
                            cat.systemCategory
                              ? t(`categories.${cat.categoryName}`)
                              : cat.categoryName
                          } 
                          stroke={resolveCategoryColor(cat.categoryColor)}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={activeIndex !== null ? { r: 6 } : false} // only show dot if tooltip active
                        />
                      ) : null
                    )}
                </LineChart>
              </ResponsiveContainer>
            </div>
              
            {/* Custom clickable legend */}
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                listStyle: "none",
                padding: 0,
                gap: "1rem",
                marginTop: "12px",
                marginBottom: "30px"
              }}
            >
              {categories
                // 1. Filter out categories that are not in the categoriesWithExpenses array
                .filter(cat => currentVisibleIds.includes(cat.categoryId))
                // 2. Map and render the legend items
                .map(cat => (
                  <li
                    key={cat.categoryId}
                    //onClick={() => handleLegendClick(cat.categoryId)}
                    style={{
                      cursor: "pointer",
                      color: currentVisibleIds.includes(cat.categoryId)
                        ? resolveCategoryColor(cat.categoryColor)
                        : "var(--ion-color-medium)",
                      paddingBottom: "2px",
                      userSelect: "none",
                    }}
                  >
                    {
                      cat.systemCategory
                        ? t(`categories.${cat.categoryName}`)
                        : cat.categoryName
                    } 
                  </li>
                ))}
            </ul>

            <div className="chart-note">
              <strong>{t('common.important')}</strong>{t('categories.showing')}
            </div>
          </>
      )}
    </div>
  );
});

export default TwelveMonthChart;
