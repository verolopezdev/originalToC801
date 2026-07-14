import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/pt';
import { db, Expense, Category, Subcategory } from '../db';
import { getWeekdayNames } from '../utils/formatDate'; 
import { useCurrency } from '../context/CurrencyContext';
import { getAllExpenses } from '../utils/getAllExpenses';
import { getDayjsLocale } from '../utils/getDayjsLocale';
import { getWeekStart, getWeekEnd } from '../utils/dateUtils';

// Styles
import '../Main.css';
import '../pages/Calendar.css';
import { IonIcon } from '@ionic/react';
import { warningOutline } from 'ionicons/icons';


interface ExpenseCalendarProps {
  currentDate: Dayjs; // Pass currentDate from parent
  weekStartDay: "sunday" | "monday";
  onDayClick?: (date: Dayjs) => void;
}



const ExpenseCalendar: React.FC<ExpenseCalendarProps> = ({ currentDate, weekStartDay, onDayClick }) => {  
  const { t, i18n } = useTranslation();
  const { defaultLocaleRef } = useCurrency();



  const dayjsLocale = getDayjsLocale(defaultLocaleRef.current);

  const currentMonth = currentDate.locale(dayjsLocale);
  const monthKey = `${currentDate.format('YYYY-MM')}-${i18n.language}`;
  
  const startOfMonth = currentMonth.startOf('month');
  const endOfMonth = currentMonth.endOf('month');

  const startDay = getWeekStart(startOfMonth, weekStartDay);
  const endDay = getWeekEnd(endOfMonth, weekStartDay);

  const firstDayOfWeek = getWeekStart(startOfMonth, weekStartDay);

  const daysOfWeek = Array.from({ length: 7 }, (_, i) =>
    firstDayOfWeek.add(i, 'day').locale(dayjsLocale).format('ddd')
  );


  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  

  // Generate calendar weeks
  let date = startDay.clone();
  const calendar: Dayjs[][] = [];

  while (date.isBefore(endDay, 'day')) {
    const week: Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(date.clone());
      date = date.add(1, 'day');
    }
    calendar.push(week);
  }




  // 🔁 Load expenses from Dexie when month changes
  useEffect(() => {
    const loadData = async () => {
      const startDate = getWeekStart(
        currentMonth.startOf('month'),
        weekStartDay
      ).toISOString();
      
      const endDate = getWeekEnd(
        currentMonth.endOf('month'),
        weekStartDay
      )
        .endOf('day')
        .toISOString();

      const [cats, subs] = await Promise.all([
        db.categories.toArray(),
        db.subcategories.toArray(),
      ]);

      // Use the newly calculated 'startDate' and 'endDate' for the query
      getAllExpenses(startDate, endDate).then(setExpenses);    
      
      setCategories(cats);
      setSubcategories(subs);
    };

    loadData();
  }, [monthKey, i18n.language, weekStartDay]); // dependency remains currentMonth
  

  const categoryMap = new Map(categories.map(cat => [cat.categoryId, cat]));
  const subcategoryMap = new Map(subcategories.map(sub => [sub.subcategoryId, sub]));


  const getExpensesForDate = (day: Dayjs) =>
    expenses.filter((e) => dayjs(e.expenseDate).isSame(day, 'day'));

  const getExpenseColor = (expense: Expense) => {
    const sub = subcategoryMap.get(expense.subcategoryId);
    if (sub?.subcategoryColor) return sub.subcategoryColor;
  
    const cat = categoryMap.get(expense.categoryId);
    return cat?.categoryColor ?? '#ccc'; // default gray if none found
  };

  
  return (
    <div className="calendar-container">
      <div className="calendar-header-row">
        {daysOfWeek.map((day) => (
          <div className="calendar-header-cell" key={day}>
            <div className="calendar-day-header">
              {day}
            </div>
        </div>
        ))}
      </div>
      {calendar.map((week, i) => (
        <div className="calendar-row" key={i}>
          {week.map((day) => {
            const isCurrentMonth = day.month() === currentMonth.month();
            const isToday = day.isSame(dayjs(), 'day');
            const dayExpenses = getExpensesForDate(day);

            // Create the list of expenses to RENDER for the cell.
            const expensesToRender = isCurrentMonth 
              ? dayExpenses.filter(expense => expense.isActive !== 2)
              : []; // If outside the month, the list is empty!

            return (
            <div 
              className={`calendar-cell ${isCurrentMonth ? '' : 'outside-month'} ${isToday ? 'today-cell' : ''}`} 
              key={day.toString()}
              // Use expensesToRender.length for the click handler too!
              onClick={expensesToRender.length > 0 ? () => onDayClick?.(day) : undefined}
            >
              <div>
              <div className="calendar-date">{day.date()}</div> 
              {expensesToRender // <--- Using the filtered list here
                .slice(0, 3)
                .map((expense, idx) => {
                  const isPast = dayjs(expense.expenseDate).isBefore(dayjs(), 'day');
                  const isFuture = dayjs(expense.expenseDate).isAfter(dayjs(), 'day');

                  const bgColor =
                    isFuture ||
                    expense.expenseId === '-1' ||
                    expense.isActive === 0
                      ? 'neutral'
                      : getExpenseColor(expense);

                  return (
                    <div
                      key={`${expense.expenseId}-${idx}`}
                      className={`calendar-expense-item ${bgColor}-sbg`}   
                    >
                      <span className='item-text'>
                        {expense.isActive === 0 && isPast && <IonIcon icon={warningOutline} />}
                        {expense.expenseNote ? expense.expenseNote : t('common.no_description')}
                      </span>
                    </div>
                  );
              })}
              </div>
              {expensesToRender.length > 3 && ( // <--- Using the filtered list here
                <div className="more-expenses">. . .</div> 
              )}
            </div>
          )})}
        </div>
      ))}
    </div>
  );
};        

export default ExpenseCalendar;
