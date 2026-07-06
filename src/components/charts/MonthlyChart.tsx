import React, { useMemo } from "react";
import { Expense, Category } from "../../db";
import { useCurrency } from '../../context/CurrencyContext';
import { useIonRouter } from "@ionic/react";
import { resolveCategoryColor, formatPrice, formatNumberCompact, formatPercentage } from "../../utils/chartFunctions";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts";
import { useTranslation } from 'react-i18next';

import '../../Main.css';
import '../../pages/Statistics.css';

interface MonthlyChartProps {
  expenses: Expense[];
  categories?: Category[];
  sortOption: "thisMonth" | "change" | "alphabetical";
  exporting?: boolean; // 👈 When true, renders hidden chart for image capture
  onExportImageReady?: (dataUrl: string) => void; // 👈 Returns PNG once ready
  year: number;
  month: number;
}


const MonthlyChart: React.FC<MonthlyChartProps> = React.memo(({ expenses, categories, sortOption, year, month, exporting = false, onExportImageReady }) => {  
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const router = useIonRouter();

  const barHeight = 10;
  const labelHeight = 35;
  const padding = 50;
  const percentageLabelFontSize = 12;


  // Memoize aggregated data and calculate percentage
  const { data, maxExpenseValue } = useMemo(() => { // 👈 Renamed to simplify
    if (!expenses || !expenses.length) return { data: [], maxExpenseValue: 0 };
    
    const totals: Record<number, number> = {};
    let totalExpenses = 0;
    let maxExpense = 0; // 👈 Track the largest expense value
    
    expenses.forEach(exp => {
      const amount = exp.expenseAmountDefault / 100;
      totals[exp.categoryId] = (totals[exp.categoryId] || 0) + amount;
      totalExpenses += amount;
    });

    const chartData = Object.entries(totals).map(([categoryId, total]) => {
      const category = categories?.find(c => c.categoryId === Number(categoryId));
    
      maxExpense = Math.max(maxExpense, total);
    
      const name = !category
        ? t("categories.category_fallback", { id: categoryId })
        : category.systemCategory
          ? t(`categories.${category.categoryName}`)
          : category.categoryName;
    
      return {
        categoryId: Number(categoryId),
        name,
        value: total,
        color: resolveCategoryColor(category?.categoryColor || "#8884d8"),
        percentage: formatPercentage(total, totalExpenses, 1),
      };
    });

    
    // 👇 Sorting logic
    if (sortOption === "thisMonth") {
      chartData.sort((a, b) => b.value - a.value);
    } else if (sortOption === "alphabetical") {
      chartData.sort((a, b) => a.name.localeCompare(b.name));
    }

    return { data: chartData, maxExpenseValue: maxExpense };
}, [expenses, categories, sortOption]);

  // Use the max value and buffer to set the X-axis domain (the highest number on the axis)
  // This is a rough calculation. You may need to fine-tune the scaleFactor.
  const chartDomainMax = useMemo(() => {
    if (maxExpenseValue === 0) return 1;
    
    // Scale Factor: Represents the ratio of required pixel space (for the label) 
    // to the total chart width. A common value for `ResponsiveContainer` is 1.2-1.3 
    // to give some space past the max bar.
    // We'll calculate a dynamic factor:
    // This is the most complex part: The `percentageBufferInPixels` is the space we *need*.
    // The `maxExpenseValue` is the space the largest bar *takes*.
    // We want: (Max Bar Space) / (Total Chart Space) = (Max Expense Value) / (Domain Max)
    // To solve for Domain Max, we must estimate the chart's pixel width. 
    
    // Simpler, less dynamic approach (which often works): 
    // Use a fixed scaling factor to ensure the bars don't take up the full width.
    const scaleFactor = 1.15; // 15% extra space for the label
    return Math.ceil(maxExpenseValue * scaleFactor);
    
  }, [maxExpenseValue]);
  
  // Memoize chart height
  const chartHeight = useMemo(() => {
    return Math.max(data.length * (barHeight + labelHeight) + padding, barHeight + labelHeight + padding);
  }, [data.length]);

  // ... (renderNameValueLabel and CustomBar remain the same) ...
  
  // Memoized label renderer for Category Name and Value
  const renderNameValueLabel = useMemo(() => (props: any) => {
    // ... (unchanged) ...
    const { x = 0, y = 0, index } = props;
    if (index === undefined) return null;
    const item = data[index];
    if (!item) return null;

    const numericY = typeof y === "number" ? y : Number(y);
    const formattedValue = formatPrice(item.value, currency.defaultCurrency.code, currency.defaultCurrency.locale);

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
  }, [data, currency]);

  // Memoized label renderer for Percentage
  const renderPercentageLabel = useMemo(() => (props: any) => {
    const { x = 0, y = 0, width = 0, index } = props;
    if (index === undefined) return null;
    const item = data[index];
    if (!item) return null;

    const numericY = typeof y === "number" ? y : Number(y);
    const numericX = typeof x === "number" ? x : Number(x);
    const numericWidth = typeof width === "number" ? width : Number(width);

    return (
      <text
        x={numericX + numericWidth + 5} // 5 units of padding after the bar
        y={numericY + barHeight / 2 + (percentageLabelFontSize / 3)} // Center vertically within the bar
        textAnchor="start"
        fill="var(--ion-text-color)"
        fontSize={percentageLabelFontSize}
        opacity={0.7} 
      >
        {item.percentage}
      </text>
    );
  }, [data, barHeight]);

  const handleBarClick = (entry: any) => {
    if (!entry) return;
    router.push(`/statisticscategory/${entry.categoryId}/${year}/${month + 1}`);
  };

  const CustomBar = (props: any) => {
    const { x = 0, y = 0, width = 0, height = 0, payload = {} } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={props.background?.width ?? width}
          height={height}
          fill="var(--ion-color-light-shade)"
          style={{ cursor: "pointer" }}
          onClick={() => handleBarClick(payload)}
        />
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload.color || "#8884d8"}
          style={{ cursor: "pointer" }}
          onClick={() => handleBarClick(payload)}
        />
      </g>
    );
  };


  return (
    <div className="mb-60">
      {data.length === 0 ? (
        <p style={{ textAlign: "center", padding: 20 }}>{t('expenses.none_to_display')}</p>
        ) : (
        <div 
          style={{ width: "100%", height: chartHeight, minHeight: barHeight + labelHeight + padding }}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              barSize={barHeight}
              layout="vertical"
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <XAxis type="number" tickFormatter={formatNumberCompact} domain={[0, chartDomainMax]}  />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="value" shape={CustomBar}>
                <LabelList dataKey="name" content={renderNameValueLabel} position="top" /> 
                <LabelList dataKey="percentage" content={renderPercentageLabel} position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="chart-note">
        <strong>{t('common.important')}</strong>{t('categories.showing')}
      </div>

    </div>
  );
});

export default MonthlyChart;
