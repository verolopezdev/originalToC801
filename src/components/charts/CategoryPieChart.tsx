import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { useTranslation } from 'react-i18next';


interface CategoryPieChartProps {
  groupedExpenses: {
    subcategoryId: number;
    total: number;
  }[];
  parentCategoryColor: string;
}


const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ groupedExpenses, parentCategoryColor }) => {
  const { t } = useTranslation();

  // Load subcategory names and colors
  const subcategories = useLiveQuery(() => db.subcategories.toArray(), []);

  const data = groupedExpenses.map((g, i) => {
    const subcat = subcategories?.find((s) => s.subcategoryId === g.subcategoryId);
    return {
      name: subcat?.subcategoryName || t('categories.no_subcat'),
      value: g.total,
      color: subcat?.subcategoryColor || parentCategoryColor,
    };
  });

  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, name
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentValue = `${(percent * 100).toFixed(1)}%`;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontWeight="bold"
        fontSize="14px"
        style={{
          textShadow: '0 0 5px rgba(0, 0, 0, 0.9)',
          // Ignore all mouse/tap events on the label
          pointerEvents: 'none'
        }}
      >
        {percentValue}
      </text>
    );
  };

  if (!data.length) return null;


  return (
    // 🛑 NEW OUTER WRAPPER for aggressive containment
    <div style={{ position: 'relative', zIndex: 100, overflow: 'visible', width: '100%' }}>
      {/* 💡 RETAIN: Use relative positioning on outer div for Z-index context */}
      <div style={{ width: "100%", height: 240, position: 'relative' }} className="mt-10"> 
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={110}
              labelLine={false}
              paddingAngle={2}
              stroke="none"
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={`var(--${entry.color})`} 
                  style={{ outline: 'none' }} 
                />
              ))}
            </Pie>

            <Tooltip
              cursor={false}
              
              // 1. STABILITY: No changes needed here
              wrapperStyle={{
                zIndex: 9999,
                pointerEvents: 'none',
              }}
              
              // 2. CUSTOM CONTENT: Using CSS classes now
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const entry = payload[0]; 
                const entryData = entry.payload; 

                // The dot color must remain inline since it's dynamic
                const dotColor = entryData.color ? `var(--${entryData.color})` : '#ccc';

                // 💡 FIX: Cast the NameType strictly to a string format
                const nameStr = entry.name ? String(entry.name) : "";

                return (
                  // Apply the main CSS class here
                  <div>
                    {/* Subcategory row with colored dot */}
                    <div>
                      {/* Apply the dot CSS class, but keep the dynamic background style */}
                      <span
                        style={{ backgroundColor: dotColor }} 
                      />
                      <span style={{ fontWeight: 600 }}>
                        {nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : "Unknown"}
                      </span>
                    </div>
                  </div>
                );
              }}
          />  

          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* --- CUSTOM DYNAMIC LEGEND --- */}
      <ul className="legend-list">
        {data.map((entry, index) => {
          // 💡 FIX: Safely convert to a string and handle potential undefined values
          const nameStr = entry.name ? String(entry.name) : "";

          return (
            <li key={index} className="legend-item">
              <span
                className="legend-color-box"
                style={{ backgroundColor: `var(--${entry.color})` }}
              />
              <span>
                {nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : "Unknown"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CategoryPieChart;