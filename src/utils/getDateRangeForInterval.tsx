import dayjs, { Dayjs } from "dayjs";

export function getDateRangeForInterval(
  interval: "weekly" | "monthly" | "yearly",
  selectedDate: Dayjs,
  upToToday = false,  
  weekStartDay: "sunday" | "monday" = "sunday"
) {

  if (interval === "weekly") {
    const dayOfWeek = selectedDate.day();

    const offset =
      weekStartDay === "sunday"
        ? dayOfWeek
        : (dayOfWeek + 6) % 7;

    const start = selectedDate
      .subtract(offset, "day")
      .startOf("day");

    let end = start
      .add(6, "day")
      .endOf("day");

    if (upToToday) {
      const today = dayjs().endOf("day");
      if (end.isAfter(today)) {
        end = today;
      }
    }

    return { start, end };
  }

  const start =
    interval === "monthly"
      ? selectedDate.startOf("month")
      : selectedDate.startOf("year");

  let end =
    interval === "monthly"
      ? selectedDate.endOf("month")
      : selectedDate.endOf("year");

  if (upToToday) {
    const today = dayjs().endOf("day");
    if (end.isAfter(today)) {
      end = today;
    }
  }

  return { start, end };
}
