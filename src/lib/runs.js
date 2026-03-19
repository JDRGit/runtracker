const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const RUN_LIMITS = {
  maxDistanceKm: 200,
  maxDurationMinutes: 1440,
  maxNotesLength: 160,
};

const distanceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function toDateTimestamp(dateString) {
  return new Date(`${dateString}T12:00:00`).getTime();
}

export function getRunDurationMinutes(run) {
  return Number(run?.durationMinutes ?? run?.time ?? 0);
}

export function validateRunInput(input) {
  const errors = [];
  const date = typeof input?.date === "string" ? input.date.trim() : "";
  const distance = Number(input?.distance);
  const durationMinutes = Number(input?.durationMinutes ?? input?.time);
  const notes = typeof input?.notes === "string" ? input.notes.trim() : "";

  if (!ISO_DATE_PATTERN.test(date) || Number.isNaN(toDateTimestamp(date))) {
    errors.push("Choose a valid run date.");
  }

  if (!Number.isFinite(distance) || distance < 0.1 || distance > RUN_LIMITS.maxDistanceKm) {
    errors.push(`Distance must be between 0.1 and ${RUN_LIMITS.maxDistanceKm} km.`);
  }

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > RUN_LIMITS.maxDurationMinutes
  ) {
    errors.push(`Time must be between 1 and ${RUN_LIMITS.maxDurationMinutes} minutes.`);
  }

  if (notes.length > RUN_LIMITS.maxNotesLength) {
    errors.push(`Notes must be ${RUN_LIMITS.maxNotesLength} characters or fewer.`);
  }

  return {
    errors,
    isValid: errors.length === 0,
    value: {
      date,
      distance: Number.isFinite(distance) ? Number(distance.toFixed(1)) : 0,
      durationMinutes: Number.isFinite(durationMinutes) ? Math.round(durationMinutes) : 0,
      ...(notes ? { notes } : {}),
    },
  };
}

export function normalizeStoredRun(run) {
  if (!run || typeof run.id !== "string" || run.id.trim() === "") {
    return null;
  }

  const normalized = validateRunInput(run);

  if (!normalized.isValid) {
    return null;
  }

  return {
    id: run.id,
    createdAt: typeof run.createdAt === "string" ? run.createdAt : "",
    ...normalized.value,
  };
}

export function sortRunsByDate(runs) {
  return [...runs].sort((left, right) => {
    const dateDifference = toDateTimestamp(right.date) - toDateTimestamp(left.date);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });
}

export function getRunPace(run) {
  const distance = Number(run?.distance);
  const durationMinutes = getRunDurationMinutes(run);

  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(durationMinutes)) {
    return null;
  }

  return durationMinutes / distance;
}

export function getRunStats(runs) {
  const totals = runs.reduce(
    (summary, run) => {
      const distance = Number(run.distance);
      const durationMinutes = getRunDurationMinutes(run);
      const pace = getRunPace(run);

      if (!Number.isFinite(distance) || !Number.isFinite(durationMinutes)) {
        return summary;
      }

      return {
        runCount: summary.runCount + 1,
        totalDistance: summary.totalDistance + distance,
        totalDurationMinutes: summary.totalDurationMinutes + durationMinutes,
        bestPace:
          summary.bestPace === null || (pace !== null && pace < summary.bestPace)
            ? pace
            : summary.bestPace,
        longestDistance: distance > summary.longestDistance ? distance : summary.longestDistance,
      };
    },
    {
      runCount: 0,
      totalDistance: 0,
      totalDurationMinutes: 0,
      bestPace: null,
      longestDistance: 0,
    },
  );

  return {
    ...totals,
    averagePace:
      totals.totalDistance > 0 ? totals.totalDurationMinutes / totals.totalDistance : null,
    mostRecentRunDate: runs[0]?.date ?? null,
  };
}

export function formatRunDate(dateString) {
  if (!ISO_DATE_PATTERN.test(dateString)) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatDistance(distance) {
  return `${distanceFormatter.format(Number(distance) || 0)} km`;
}

export function formatDuration(totalMinutes) {
  const minutes = Number(totalMinutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder}m`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

export function formatPace(paceMinutes) {
  if (!Number.isFinite(paceMinutes) || paceMinutes <= 0) {
    return "--";
  }

  const totalSeconds = Math.round(paceMinutes * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function getTodayDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}
