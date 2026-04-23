const WEEKDAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAY_SHORT = {
  Sunday: "Sun",
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

function parseDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfToday(fromDate = new Date()) {
  return new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
}

export function getNormalizedTimeSlots(event) {
  if (Array.isArray(event?.timeSlots) && event.timeSlots.length > 0) {
    return event.timeSlots.filter(
      (slot) => slot && (slot.startTime || slot.endTime)
    );
  }

  if (event?.time || event?.endTime) {
    return [
      {
        startTime: event.time || "",
        endTime: event.endTime || "",
      },
    ];
  }

  return [];
}

export function formatTimeSlotLabel(slot) {
  if (!slot) return "";

  if (slot.startTime && slot.endTime) {
    return `${slot.startTime} - ${slot.endTime}`;
  }

  if (slot.startTime) {
    return slot.startTime;
  }

  if (slot.endTime) {
    return `Until ${slot.endTime}`;
  }

  return "";
}

export function formatEventTimeLabel(event) {
  if (event?.isAllDay) {
    return "All day";
  }

  const labels = getNormalizedTimeSlots(event)
    .map((slot) => formatTimeSlotLabel(slot))
    .filter(Boolean);

  if (!labels.length) {
    return "Time TBA";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return labels.join(" and ");
}

export function getRecurrenceLabel(event) {
  const frequency = event?.recurrence?.frequency;
  const weekdays = Array.isArray(event?.recurrence?.weekdays)
    ? event.recurrence.weekdays
    : [];

  if (frequency === "daily") {
    return "Daily";
  }

  if (frequency === "weekly") {
    return "Weekly";
  }

  if (frequency === "selected_weekdays" && weekdays.length > 0) {
    return weekdays
      .slice()
      .sort(
        (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
      )
      .map((day) => WEEKDAY_SHORT[day] || day)
      .join(", ");
  }

  return "Recurring";
}

function getScheduleStartDate(event) {
  return parseDateOnly(event?.date);
}

function getScheduleUntilDate(event) {
  return parseDateOnly(event?.recurrence?.untilDate);
}

export function getNextOccurrenceDate(event, fromDate = new Date()) {
  const today = startOfToday(fromDate);
  const startDate = getScheduleStartDate(event);
  const untilDate = getScheduleUntilDate(event);
  const scheduleType = event?.scheduleType || "single";

  if (scheduleType !== "recurring") {
    return startDate;
  }

  if (!startDate) {
    return null;
  }

  let candidate = startDate > today ? startDate : today;

  if (untilDate && candidate > untilDate) {
    return null;
  }

  const frequency = event?.recurrence?.frequency || "daily";

  if (frequency === "daily") {
    return candidate;
  }

  if (frequency === "weekly") {
    const startWeekday = startDate.getDay();
    const candidateWeekday = candidate.getDay();
    const daysToAdd = (startWeekday - candidateWeekday + 7) % 7;
    const next = new Date(candidate);
    next.setDate(candidate.getDate() + daysToAdd);
    if (untilDate && next > untilDate) {
      return null;
    }
    return next;
  }

  if (frequency === "selected_weekdays") {
    const weekdays = Array.isArray(event?.recurrence?.weekdays)
      ? event.recurrence.weekdays
      : [];

    if (!weekdays.length) {
      return candidate;
    }

    for (let offset = 0; offset < 370; offset += 1) {
      const next = new Date(candidate);
      next.setDate(candidate.getDate() + offset);

      if (untilDate && next > untilDate) {
        return null;
      }

      const weekdayName = WEEKDAY_ORDER[next.getDay()];
      if (weekdays.includes(weekdayName)) {
        return next;
      }
    }

    return null;
  }

  return candidate;
}

export function getNextOccurrenceDateString(event, fromDate = new Date()) {
  const next = getNextOccurrenceDate(event, fromDate);
  return next ? formatDateOnly(next) : null;
}

export function isEventUpcoming(event, fromDate = new Date()) {
  const next = getNextOccurrenceDate(event, fromDate);
  if (!next) return false;
  return next >= startOfToday(fromDate);
}

export function formatDateShort(dateString) {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return dateString || "Date TBA";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(dateString) {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return dateString || "Date TBA";

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function getCardScheduleLabels(event) {
  if ((event?.scheduleType || "single") === "recurring") {
    const recurrenceLabel = getRecurrenceLabel(event);
    const untilDate = event?.recurrence?.untilDate;
    const timeLabel = formatEventTimeLabel(event);
    const secondary =
      untilDate && timeLabel !== "Time TBA"
        ? `${timeLabel} • Until ${formatDateShort(untilDate)}`
        : untilDate
        ? `Until ${formatDateShort(untilDate)}`
        : timeLabel;

    return {
      primary: recurrenceLabel,
      secondary,
    };
  }

  return {
    primary: formatDateShort(event?.date),
    secondary: formatEventTimeLabel(event),
  };
}

export function getListScheduleLabel(event) {
  if ((event?.scheduleType || "single") === "recurring") {
    const recurrenceLabel = getRecurrenceLabel(event);
    const timeLabel = formatEventTimeLabel(event);
    const untilDate = event?.recurrence?.untilDate;

    let label = recurrenceLabel;

    if (timeLabel && timeLabel !== "Time TBA") {
      label += ` • ${timeLabel}`;
    } else if (event?.isAllDay) {
      label += " • All day";
    }

    if (untilDate) {
      label += ` • Until ${untilDate}`;
    }

    return label;
  }

  const timeLabel = formatEventTimeLabel(event);
  if (event?.date && timeLabel && timeLabel !== "Time TBA") {
    return `${event.date} • ${timeLabel}`;
  }

  if (event?.date) {
    return event.date;
  }

  return timeLabel || "Date & time TBA";
}

export function getDetailScheduleLabels(event) {
  if ((event?.scheduleType || "single") === "recurring") {
    const recurrenceLabel = getRecurrenceLabel(event);
    const untilDate = event?.recurrence?.untilDate;
    return {
      dateLabel: untilDate
        ? `${recurrenceLabel} until ${formatDateLong(untilDate)}`
        : recurrenceLabel,
      timeLabel: formatEventTimeLabel(event),
    };
  }

  return {
    dateLabel: formatDateLong(event?.date),
    timeLabel: formatEventTimeLabel(event),
  };
}
