import React, { useState, useEffect } from "react";

export function getMeetingStatus(meeting) {
  if (meeting?.menteeApproved && meeting?.mentorApproved) {
    return { status: "Confirmed", color: "#4caf50" };
  } else if (meeting?.menteeApproved && !meeting?.mentorApproved) {
    return { status: "Waiting for Mentor", color: "#ff9800" };
  } else if (!meeting?.menteeApproved && meeting?.mentorApproved) {
    return { status: "Waiting for You", color: "#ff9800" };
  } else {
    return { status: "Pending", color: "#f44336" };
  }
}

export default function Rescheduling({ open, onClose, onSubmit, meeting }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
  });
  const [availability, setAvailability] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Seed initial selection from meeting
    try {
      if (meeting?.meetingDate) setSelectedDate(new Date(meeting.meetingDate));
      if (meeting?.meetingTime) setSelectedTime(meeting.meetingTime);
    } catch {}
  }, [open, meeting]);

  useEffect(() => {
    if (!open || !meeting?.mentorId) return;
    const fetchAvailability = async () => {
      setLoadingAvail(true);
      try {
        const res = await fetch("http://localhost:3001/api/mentors");
        const data = await res.json();
        if (data?.success) {
          const m = (data.mentors || []).find((x) => x.id === meeting.mentorId);
          if (m?.availability) {
            setAvailability(m.availability);
          }
        }
      } catch (e) {
        console.error("Failed to load mentor availability", e);
      } finally {
        setLoadingAvail(false);
      }
    };
    fetchAvailability();
  }, [open, meeting]);

  if (!open) return null;

  // Calendar functions - Week view
  const getCurrentWeekStart = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const getWeekDays = (weekStart) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate() + i
        )
      );
    }
    return days;
  };

  const getWeekDisplayName = (weekStart) => {
    const weekEnd = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 6
    );
    return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const navigateWeek = (direction) => {
    setCurrentMonth((prev) => {
      const newWeek = new Date(prev);
      newWeek.setDate(prev.getDate() + direction * 7);

      // Limit navigation to current week and next week only
      const currentDate = new Date();
      const currentWeekStart = getCurrentWeekStart(currentDate);
      const nextWeekStart = new Date(
        currentWeekStart.getFullYear(),
        currentWeekStart.getMonth(),
        currentWeekStart.getDate() + 7
      );

      if (newWeek < currentWeekStart) {
        return currentWeekStart;
      }

      if (newWeek >= nextWeekStart) {
        return nextWeekStart;
      }

      return newWeek;
    });
  };

  const isDateAvailable = (date) => {
    if (!availability) return false;
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dayAvailability = availability[dayName];
    return (
      dayAvailability &&
      Array.isArray(dayAvailability) &&
      dayAvailability.length > 0
    );
  };

  const getAvailableTimesForDate = (date) => {
    if (!availability) return [];
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dayAvailability = availability[dayName];
    return Array.isArray(dayAvailability) ? dayAvailability : [];
  };

  const isValid = Boolean(selectedDate) && Boolean(selectedTime);

  const handleSubmit = () => {
    if (!isValid) return;
    const prettyDate = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    onSubmit({ meetingDate: prettyDate, meetingTime: selectedTime });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: 0, color: "#007CA6" }}>Propose a New Time</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {loadingAvail ? (
          <div>Loading availability...</div>
        ) : !availability ? (
          <div>No availability found for this mentor.</div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => navigateWeek(-1)}
                disabled={(() => {
                  const currentDate = new Date();
                  const currentWeekStart = getCurrentWeekStart(currentDate);
                  return currentMonth.getTime() <= currentWeekStart.getTime();
                })()}
                style={{
                  background: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    return currentMonth.getTime() <= currentWeekStart.getTime()
                      ? "#ccc"
                      : "#f0f0f0";
                  })(),
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 4,
                  cursor: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    return currentMonth.getTime() <= currentWeekStart.getTime()
                      ? "not-allowed"
                      : "pointer";
                  })(),
                }}
              >
                ← Previous Week
              </button>
              <h5 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {getWeekDisplayName(currentMonth)}
              </h5>
              <button
                onClick={() => navigateWeek(1)}
                disabled={(() => {
                  const currentDate = new Date();
                  const currentWeekStart = getCurrentWeekStart(currentDate);
                  const nextWeekStart = new Date(
                    currentWeekStart.getFullYear(),
                    currentWeekStart.getMonth(),
                    currentWeekStart.getDate() + 7
                  );
                  return currentMonth.getTime() >= nextWeekStart.getTime();
                })()}
                style={{
                  background: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    const nextWeekStart = new Date(
                      currentWeekStart.getFullYear(),
                      currentWeekStart.getMonth(),
                      currentWeekStart.getDate() + 7
                    );
                    return currentMonth.getTime() >= nextWeekStart.getTime()
                      ? "#ccc"
                      : "#f0f0f0";
                  })(),
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 4,
                  cursor: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    const nextWeekStart = new Date(
                      currentWeekStart.getFullYear(),
                      currentWeekStart.getMonth(),
                      currentWeekStart.getDate() + 7
                    );
                    return currentMonth.getTime() >= nextWeekStart.getTime()
                      ? "not-allowed"
                      : "pointer";
                  })(),
                }}
              >
                Next Week →
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
                marginBottom: 16,
                border: "1px solid #ddd",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  style={{
                    background: "#f5f5f5",
                    padding: "8px 4px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  {day}
                </div>
              ))}
              {(() => {
                const weekDays = getWeekDays(currentMonth);
                const cells = [];

                weekDays.forEach((date, index) => {
                  const now = new Date();
                  const isAvailable = isDateAvailable(date);
                  const isToday = date.toDateString() === now.toDateString();
                  const isSelected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();
                  const isPastDate =
                    date <
                    new Date(now.getFullYear(), now.getMonth(), now.getDate());

                  cells.push(
                    <div
                      key={index}
                      onClick={() => {
                        if (isAvailable && !isPastDate) {
                          setSelectedDate(date);
                          setSelectedTime(""); // Clear previous time selection
                        }
                      }}
                      style={{
                        padding: "8px 4px",
                        textAlign: "center",
                        fontSize: "14px",
                        cursor:
                          isAvailable && !isPastDate ? "pointer" : "default",
                        background: isPastDate
                          ? "#f0f0f0"
                          : isAvailable
                            ? "#e3f2fd"
                            : "#f5f5f5",
                        color: isPastDate
                          ? "#ccc"
                          : isAvailable
                            ? "#1976d2"
                            : "#999",
                        border: isSelected
                          ? "3px solid #007CA6"
                          : isToday
                            ? "2px solid #007CA6"
                            : "1px solid transparent",
                        borderRadius: isSelected
                          ? "6px"
                          : isToday
                            ? "4px"
                            : "0",
                        fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                      }}
                    >
                      {date.getDate()}
                    </div>
                  );
                });

                return cells;
              })()}
            </div>

            {selectedDate && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{ fontWeight: 600, marginBottom: 8, color: "#00212C" }}
                >
                  Available times
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {getAvailableTimesForDate(selectedDate).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      style={{
                        background: selectedTime === t ? "#007CA6" : "#e0e0e0",
                        color: selectedTime === t ? "#fff" : "#333",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && selectedTime && (
              <div
                style={{
                  background: "#e8f5e8",
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #4caf50",
                  marginTop: 12,
                }}
              >
                <strong>Selected Meeting:</strong>{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                at {selectedTime}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "#e0e0e0",
              color: "#333",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              background: isValid ? "#007CA6" : "#9ec9d6",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: isValid ? "pointer" : "not-allowed",
              fontWeight: 700,
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
