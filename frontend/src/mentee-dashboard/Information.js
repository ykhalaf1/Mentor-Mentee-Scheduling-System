import React, { useState, useEffect } from "react";
import { auth } from "../firebase";

const Information = () => {
  const [meetings, setMeetings] = useState([]);
  const [mentorDetails, setMentorDetails] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch only from endMeeting collection
      const response = await fetch(
        `http://localhost:4000/api/meetings/mentee/${user.uid}/past`
      );
      const data = await response.json();

      if (data.success) {
        setMeetings(data.meetings);

        // Fetch mentor details from mentors collection
        const mentorIds = [
          ...new Set(
            data.meetings.map((meeting) => meeting.mentorId).filter(Boolean)
          ),
        ];
        const mentorDetailsMap = {};

        try {
          const allMentorsResponse = await fetch(
            "http://localhost:3001/api/mentors"
          );

          if (allMentorsResponse.ok) {
            const allMentorsData = await allMentorsResponse.json();

            if (allMentorsData.success && allMentorsData.mentors) {
              mentorIds.forEach((mentorId) => {
                const foundMentor = allMentorsData.mentors.find(
                  (mentor) => mentor.id === mentorId
                );
                if (foundMentor) {
                  mentorDetailsMap[mentorId] = foundMentor;
                }
              });
            }
          }
        } catch (error) {
          console.error("Error fetching mentor details:", error);
        }

        setMentorDetails(mentorDetailsMap);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const formatMeetingDate = (meetingDate, meetingTime) => {
    const dateVal = meetingDate;
    const looksLikeISO =
      typeof dateVal === "string" && /\d{4}-\d{2}-\d{2}T/.test(dateVal);
    const dateStr =
      typeof dateVal === "string"
        ? looksLikeISO
          ? new Date(dateVal).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : dateVal
        : "";
    return `${dateStr ? dateStr + " " : ""}${meetingTime || ""}`.trim();
  };

  const getMeetingStatus = (meeting) => {
    if (meeting.status === "confirmed") {
      const meetingDate = new Date(meeting.meetingDate);
      const meetingTime = meeting.meetingTime;

      // Parse meeting time to get end time
      let endTime;
      if (meetingTime.includes("-")) {
        endTime = meetingTime.split("-")[1].trim();
      } else {
        // If single time, assume 1 hour duration
        const timeMatch = meetingTime.match(/(\d+):(\d+)\s*(am|pm)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          const period = timeMatch[3].toLowerCase();

          hour += 1;
          if (hour > 12) hour = 1;

          endTime = `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
        }
      }

      // Create end datetime
      const endDateTime = new Date(meetingDate);
      const timeMatch = endTime.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const period = timeMatch[3].toLowerCase();

        if (period === "pm" && hour !== 12) hour += 12;
        if (period === "am" && hour === 12) hour = 0;

        endDateTime.setHours(hour, minute, 0, 0);
      }

      const now = new Date();
      if (now > endDateTime) {
        return "done";
      }
      return "confirmed";
    }
    return meeting.status;
  };

  const currentMeetings = meetings.filter((meeting) => {
    const status = getMeetingStatus(meeting);
    return status === "confirmed" || status === "pending";
  });

  const pastMeetings = meetings;

  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          color: "#00212C",
          background: "#ffffff",
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            color: "#007CA6",
            fontWeight: 800,
            fontSize: 28,
            marginBottom: 24,
          }}
        >
          Past Information
        </h2>
        <div style={{ color: "#666", fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        color: "#00212C",
        background: "#ffffff",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          color: "#007CA6",
          fontWeight: 800,
          fontSize: 28,
          marginBottom: 24,
        }}
      >
        Past Information
      </h2>

      {/* Past Meetings */}
      {pastMeetings.length > 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              color: "#007CA6",
              fontWeight: 700,
              fontSize: 20,
              marginBottom: 16,
            }}
          >
            Past Meetings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pastMeetings.map((meeting, index) => {
              const mentorDetail = mentorDetails[meeting.mentorId];

              return (
                <div
                  key={meeting.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    padding: 16,
                    background: "#f5f5f5",
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: "#007CA6" }}>With:</strong>{" "}
                    {meeting.mentorName}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: "#007CA6" }}>When:</strong>{" "}
                    {formatMeetingDate(
                      meeting.meetingDate,
                      meeting.meetingTime
                    )}
                  </div>
                  {mentorDetail?.bio && (
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>About:</strong>
                      <div
                        style={{ fontSize: 14, color: "#666", marginTop: 4 }}
                      >
                        {mentorDetail.bio}
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      color: "#666",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Completed
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          <h3
            style={{
              color: "#007CA6",
              fontWeight: 700,
              fontSize: 20,
              marginBottom: 16,
            }}
          >
            Past Meetings
          </h3>
          <div style={{ color: "#666", fontSize: 16 }}>None</div>
        </div>
      )}
    </div>
  );
};

export default Information;
