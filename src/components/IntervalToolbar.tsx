import React, { useState } from "react";
import { IonToolbar, IonButtons, IonButton, IonIcon } from "@ionic/react";
import { chevronBack, chevronForward } from "ionicons/icons";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek"; // Correct plugin import

// Styles
import './IntervalToolbar.css';
import FormattedDate from "./FormattedDate";

// Extend dayjs with isoWeek functionality
dayjs.extend(isoWeek);

interface IntervalToolbarProps {
  selectedInterval: "weekly" | "monthly" | "yearly";
  currentDate: Dayjs; // Pass currentDate from parent
  setCurrentDate: (date: Dayjs) => void; // Function to update date in parent 
  weekStartDay: "sunday" | "monday";
}

const IntervalToolbar: React.FC<IntervalToolbarProps> = ({ selectedInterval, currentDate, setCurrentDate, weekStartDay }) => {

  const changeDate = (direction: "prev" | "next") => {
    let newDate;
    const directionValue = direction === "next" ? 1 : -1;

    if (selectedInterval === "weekly") {
      newDate = currentDate.add(directionValue, "week");
    } else if (selectedInterval === "monthly") {
      // 💡 THE CHANGE IS HERE:
      newDate = currentDate
        .add(directionValue, "month")
        .startOf('month'); // <-- Sets the day to the 1st of the new month
    } else {
      newDate = currentDate.add(directionValue, "year");
    }
    setCurrentDate(newDate);
  };


  const getWeekRange = (date: Dayjs) => {
    const dayOfWeek = date.day(); // 0=Sunday, 1=Monday...
  
    const offset =
      weekStartDay === "sunday"
        ? dayOfWeek
        : (dayOfWeek + 6) % 7;
  
    const start = date.subtract(offset, "day").startOf("day");
    const end = start.add(6, "day").endOf("day");
  
    return { start, end };
  };

  const weekRange =
    selectedInterval === "weekly"
      ? getWeekRange(currentDate)
      : null;


  return (
    <IonToolbar className="interval-toolbar mb-20">
      <IonButtons slot="start">
        <IonButton onClick={() => changeDate("prev")}>
          <IonIcon icon={chevronBack} />
        </IonButton>
      </IonButtons>
      <div style={{ flexGrow: 1, textAlign: "center", fontSize: "1.2em" }}>
        {selectedInterval === 'weekly' ? (
          <>
            <FormattedDate
              date={weekRange!.start.toDate()}
              format="dayMonth"
            />
            {' - '}
            <FormattedDate
              date={weekRange!.end.toDate()}
              format="dayMonth"
            />
          </>
        ) : selectedInterval === 'monthly' ? (
          <FormattedDate date={currentDate.toDate()} format="monthYear" />
        ) : (
          <FormattedDate date={currentDate.toDate()} format="yearOnly" />
        )}
      </div>
      <IonButtons slot="end">
        <IonButton onClick={() => changeDate("next")}>
          <IonIcon icon={chevronForward} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

export default IntervalToolbar;
