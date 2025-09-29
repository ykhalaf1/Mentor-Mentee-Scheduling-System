import React, { useState, useEffect } from "react";
import { findTopMentors, TOTAL_POSSIBLE_SCORE } from "./initialPairing";
import { sendMeetingEmails } from "./emailService";

const MentorMatchesModal = ({ menteeData, onClose, onSubmit }) => {
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
  });

  // Fetch mentors on component mount
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/mentors");
        const data = await response.json();
        if (data.success) {
          console.log("Fetched mentors data:", data.mentors);
          setMentors(data.mentors);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
      } finally {
        setLoadingMentors(false);
      }
    };

    fetchMentors();
  }, []);

  // Get top 3 mentors
  const topMentors = findTopMentors(menteeData, mentors);

  const handleMentorSelect = (mentor) => {
    setSelectedMentor(mentor);
    setSelectedTime("");
    setSelectedDate(null);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handleSubmit = async () => {
    if (!selectedMentor || !selectedTime || !selectedDate) return;

    setLoading(true);
    try {
      const meetingData = {
        menteeId: menteeData.uid,
        menteeName: `${menteeData.firstName} ${menteeData.lastName}`,
        menteeEmail: menteeData.email,
        mentorId: selectedMentor.mentor.id,
        mentorName: selectedMentor.mentor.name,
        mentorEmail: selectedMentor.mentor.email,
        meetingTime: selectedTime,
        meetingDate: selectedDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        menteeApproved: true,
        mentorApproved: false,
        status: "pending",
        createdAt: new Date(),
      };

      // Send emails using EmailJS and notify user
      const emailResult = await sendMeetingEmails(meetingData, selectedDate);
      if (emailResult?.success) {
        window.alert("Emails have been sent to both the mentee and mentor.");
      } else {
        window.alert(
          `Email sending failed: ${emailResult?.error || "Unknown error"}`
        );
      }

      await onSubmit(meetingData);
      onClose();
    } catch (error) {
      console.error("Error scheduling meeting:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format experience to show ranges instead of exact years
  const formatExperience = (years) => {
    if (!years) return "Not specified";
    const numYears = parseInt(years);
    if (numYears < 5) return "< 5 years";
    if (numYears < 10) return "5+ years";
    if (numYears < 15) return "10+ years";
    if (numYears < 20) return "15+ years";
    return "20+ years";
  };

  // Calculate percentage score
  const calculatePercentage = (score, total) => {
    return Math.round((score / total) * 100);
  };

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

  // Check if a date is available for the selected mentor
  const isDateAvailable = (date) => {
    if (!selectedMentor || !selectedMentor.mentor.availability) return false;

    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dayAvailability = selectedMentor.mentor.availability[dayName];

    // Debug logging
    console.log("Checking availability for date:", date.toDateString());
    console.log("Day name:", dayName);
    console.log("Mentor availability:", selectedMentor.mentor.availability);
    console.log("Day availability:", dayAvailability);

    // Check if the day has availability data and it's an array with content
    return (
      dayAvailability &&
      Array.isArray(dayAvailability) &&
      dayAvailability.length > 0
    );
  };

  // Get available times for a specific date
  const getAvailableTimesForDate = (date) => {
    if (!selectedMentor || !selectedMentor.mentor.availability) return [];

    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dayAvailability = selectedMentor.mentor.availability[dayName];

    // Return the array of available times for that day
    return Array.isArray(dayAvailability) ? dayAvailability : [];
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#4caf50";
    if (score >= 60) return "#ff9800";
    return "#f44336";
  };

  if (loadingMentors) {
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
            padding: 40,
            textAlign: "center",
          }}
        >
          <h3>Finding your best mentor matches...</h3>
          <p>
            Please wait while we analyze your profile and find the perfect
            mentors for you.
          </p>
        </div>
      </div>
    );
  }

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
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#007CA6",
              margin: 0,
            }}
          >
            Your Top Mentor Matches
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        {topMentors.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 18, color: "#666", marginBottom: 16 }}>
              No matching mentors found at this time.
            </p>
            <p style={{ fontSize: 14, color: "#888" }}>
              Please try again later or contact support.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {topMentors.map((match, index) => (
              <div
                key={match.mentor.id}
                style={{
                  border:
                    selectedMentor?.mentor.id === match.mentor.id
                      ? "2px solid #007CA6"
                      : "1px solid #ddd",
                  borderRadius: 8,
                  padding: 20,
                  background:
                    selectedMentor?.mentor.id === match.mentor.id
                      ? "#f0f8ff"
                      : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => handleMentorSelect(match)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "#007CA6",
                      }}
                    >
                      {match.mentor.name} #{index + 1}
                    </h3>
                    <div
                      style={{
                        background: getScoreColor(
                          calculatePercentage(
                            match.totalScore,
                            TOTAL_POSSIBLE_SCORE
                          )
                        ),
                        color: "#fff",
                        padding: "4px 12px",
                        borderRadius: 16,
                        fontSize: 14,
                        fontWeight: 600,
                        display: "inline-block",
                      }}
                    >
                      Match Score:{" "}
                      {calculatePercentage(
                        match.totalScore,
                        TOTAL_POSSIBLE_SCORE
                      )}
                      %
                    </div>
                  </div>
                  <button
                    style={{
                      background:
                        selectedMentor?.mentor.id === match.mentor.id
                          ? "#007CA6"
                          : "#e0e0e0",
                      color:
                        selectedMentor?.mentor.id === match.mentor.id
                          ? "#fff"
                          : "#666",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {selectedMentor?.mentor.id === match.mentor.id
                      ? "Selected"
                      : "Select"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <strong>Experience:</strong>{" "}
                    {formatExperience(match.mentor.yearsOfExperience)}
                  </div>
                  <div>
                    <strong>Companies:</strong> {match.mentor.companies}
                  </div>
                  <div>
                    <strong>Major:</strong>{" "}
                    {match.mentor.major || "Not specified"}
                  </div>
                  <div>
                    <strong>Industry:</strong>{" "}
                    {Array.isArray(match.mentor.industry)
                      ? match.mentor.industry.join(", ")
                      : match.mentor.industry || "Not specified"}
                  </div>
                  <div>
                    <strong>Skills:</strong> {match.mentor.skills}
                  </div>
                  <div>
                    <strong>Can Help With:</strong> {match.mentor.helpIn}
                  </div>
                </div>

                {/* Score Breakdown with Percentages */}
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: "#333",
                    }}
                  >
                    Why This Match?
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <div>
                      Major: {calculatePercentage(match.breakdown.major, 40)}%
                    </div>
                    <div>
                      Industry:{" "}
                      {calculatePercentage(match.breakdown.industry, 35)}%
                    </div>
                    <div>
                      Skills: {calculatePercentage(match.breakdown.skills, 20)}%
                    </div>
                    <div>
                      Services: {calculatePercentage(match.breakdown.helpIn, 5)}
                      %
                    </div>
                    <div>
                      Company Size:{" "}
                      {calculatePercentage(match.breakdown.companySize, 5)}%
                    </div>
                  </div>
                </div>

                {/* Calendar View for Availability */}
                {selectedMentor?.mentor.id === match.mentor.id &&
                  match.mentor.availability && (
                    <div style={{ marginTop: 16 }}>
                      <h4
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 12,
                          color: "#333",
                        }}
                      >
                        Available Times:
                      </h4>

                      {/* Calendar Navigation */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateWeek(-1);
                          }}
                          disabled={(() => {
                            const currentDate = new Date();
                            const currentWeekStart =
                              getCurrentWeekStart(currentDate);
                            return (
                              currentMonth.getTime() <=
                              currentWeekStart.getTime()
                            );
                          })()}
                          style={{
                            background: (() => {
                              const currentDate = new Date();
                              const currentWeekStart =
                                getCurrentWeekStart(currentDate);
                              return currentMonth.getTime() <=
                                currentWeekStart.getTime()
                                ? "#ccc"
                                : "#f0f0f0";
                            })(),
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 4,
                            cursor: (() => {
                              const currentDate = new Date();
                              const currentWeekStart =
                                getCurrentWeekStart(currentDate);
                              return currentMonth.getTime() <=
                                currentWeekStart.getTime()
                                ? "not-allowed"
                                : "pointer";
                            })(),
                          }}
                        >
                          ← Previous Week
                        </button>
                        <h5
                          style={{ margin: 0, fontSize: 18, fontWeight: 600 }}
                        >
                          {getWeekDisplayName(currentMonth)}
                        </h5>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateWeek(1);
                          }}
                          disabled={(() => {
                            const currentDate = new Date();
                            const currentWeekStart =
                              getCurrentWeekStart(currentDate);
                            const nextWeekStart = new Date(
                              currentWeekStart.getFullYear(),
                              currentWeekStart.getMonth(),
                              currentWeekStart.getDate() + 7
                            );
                            return (
                              currentMonth.getTime() >= nextWeekStart.getTime()
                            );
                          })()}
                          style={{
                            background: (() => {
                              const currentDate = new Date();
                              const currentWeekStart =
                                getCurrentWeekStart(currentDate);
                              const nextWeekStart = new Date(
                                currentWeekStart.getFullYear(),
                                currentWeekStart.getMonth(),
                                currentWeekStart.getDate() + 7
                              );
                              return currentMonth.getTime() >=
                                nextWeekStart.getTime()
                                ? "#ccc"
                                : "#f0f0f0";
                            })(),
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 4,
                            cursor: (() => {
                              const currentDate = new Date();
                              const currentWeekStart =
                                getCurrentWeekStart(currentDate);
                              const nextWeekStart = new Date(
                                currentWeekStart.getFullYear(),
                                currentWeekStart.getMonth(),
                                currentWeekStart.getDate() + 7
                              );
                              return currentMonth.getTime() >=
                                nextWeekStart.getTime()
                                ? "not-allowed"
                                : "pointer";
                            })(),
                          }}
                        >
                          Next Week →
                        </button>
                      </div>

                      {/* Calendar Grid */}
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
                        {/* Day headers */}
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
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
                          )
                        )}

                        {/* Calendar days - Week view */}
                        {(() => {
                          const weekDays = getWeekDays(currentMonth);
                          const days = [];

                          weekDays.forEach((date, index) => {
                            const currentDate = new Date();
                            const isAvailable = isDateAvailable(date);
                            const isToday =
                              date.toDateString() ===
                              currentDate.toDateString();
                            const isSelected =
                              selectedDate &&
                              date.toDateString() ===
                                selectedDate.toDateString();
                            const isPastDate =
                              date <
                              new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth(),
                                currentDate.getDate()
                              );

                            days.push(
                              <div
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                    isAvailable && !isPastDate
                                      ? "pointer"
                                      : "default",
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
                                  fontWeight: isSelected
                                    ? 700
                                    : isToday
                                      ? 600
                                      : 400,
                                }}
                              >
                                {date.getDate()}
                              </div>
                            );
                          });

                          return days;
                        })()}
                      </div>

                      {/* Available times for selected date */}
                      {selectedDate && (
                        <div style={{ marginTop: "12px" }}>
                          <h5
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              marginBottom: 8,
                              color: "#333",
                            }}
                          >
                            Available Times for{" "}
                            {selectedDate.toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                            :
                          </h5>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(120px, 1fr))",
                              gap: "8px",
                              marginBottom: "12px",
                            }}
                          >
                            {getAvailableTimesForDate(selectedDate).map(
                              (time, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTime(time);
                                  }}
                                  style={{
                                    background:
                                      selectedTime === time
                                        ? "#007CA6"
                                        : "#f0f0f0",
                                    color:
                                      selectedTime === time ? "#fff" : "#333",
                                    border: "1px solid #ddd",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight:
                                      selectedTime === time ? 600 : 400,
                                    transition: "all 0.2s",
                                  }}
                                >
                                  {time}
                                </button>
                              )
                            )}
                          </div>

                          {/* Selected meeting display */}
                          {selectedTime && (
                            <div
                              style={{
                                background: "#e8f5e8",
                                padding: "12px",
                                borderRadius: "6px",
                                border: "1px solid #4caf50",
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
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {selectedMentor && selectedDate && selectedTime && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: "#4caf50",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Scheduling..."
                : `Schedule Meeting with ${selectedMentor.mentor.name}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorMatchesModal;
