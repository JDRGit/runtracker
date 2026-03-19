"use client";

import { useState } from "react";
import { RUN_LIMITS, formatPace, getTodayDateInputValue } from "@/lib/runs";

function createInitialFormState() {
  return {
    date: getTodayDateInputValue(),
    distance: "",
    durationMinutes: "",
    notes: "",
  };
}

export default function LogRunForm({ onCreateRun }) {
  const [formData, setFormData] = useState(createInitialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedPace =
    Number(formData.distance) > 0 && Number(formData.durationMinutes) > 0
      ? formatPace(Number(formData.durationMinutes) / Number(formData.distance))
      : "--";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await onCreateRun(formData);
      setFormData(createInitialFormState());
    } catch (error) {
      setErrorMessage(error.message || "Could not save that run.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="field-label" htmlFor="date">
          Date
        </label>
        <input
          className="field-input"
          id="date"
          name="date"
          onChange={handleChange}
          required
          type="date"
          value={formData.date}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="distance">
            Distance (km)
          </label>
          <input
            className="field-input"
            id="distance"
            max={RUN_LIMITS.maxDistanceKm}
            min="0.1"
            name="distance"
            onChange={handleChange}
            placeholder="8.5"
            required
            step="0.1"
            type="number"
            value={formData.distance}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="durationMinutes">
            Time (minutes)
          </label>
          <input
            className="field-input"
            id="durationMinutes"
            max={RUN_LIMITS.maxDurationMinutes}
            min="1"
            name="durationMinutes"
            onChange={handleChange}
            placeholder="46"
            required
            step="1"
            type="number"
            value={formData.durationMinutes}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800/80">
          Pace preview
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-950">{estimatedPace}</p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label className="field-label mb-0" htmlFor="notes">
            Notes
          </label>
          <span className="text-xs text-slate-500">
            {formData.notes.length}/{RUN_LIMITS.maxNotesLength}
          </span>
        </div>
        <textarea
          className="field-input field-textarea"
          id="notes"
          maxLength={RUN_LIMITS.maxNotesLength}
          name="notes"
          onChange={handleChange}
          placeholder="Optional details: easy effort, intervals, trail route..."
          value={formData.notes}
        />
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <button className="primary-button w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save run"}
      </button>
    </form>
  );
}
