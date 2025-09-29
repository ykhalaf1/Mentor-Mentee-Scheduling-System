import React, { useState, useEffect } from "react";
import "./MenteeDashboard.css";
import ProfilePage from "./ProfilePage";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import Sidebar from "./Sidebar";
import "./Sidebar.css";
import Rescheduling, { getMeetingStatus } from "./Rescheduling";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { doSignout } from "../Auth.js";
import {
  sendMeetingEmails,
  sendMeetingConfirmationEmails,
  sendNewTimeProposalEmails,
} from "./emailService";
import Information from "./Information";
import Select from "react-select";

const DEFAULT_AVATAR = "https://www.gravatar.com/avatar/?d=mp&f=y";

function Dashboard() {
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [mentorDetails, setMentorDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);

  // Format date for display
  const formatMeetingDate = (meetingDate, meetingTime) => {
    try {
      // Handle different date formats
      let date;
      if (typeof meetingDate === "string") {
        // If it's already in YYYY-MM-DD format, create date in local timezone
        if (/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
          const [year, month, day] = meetingDate.split("-").map(Number);
          date = new Date(year, month - 1, day); // month is 0-indexed
        } else {
          date = new Date(meetingDate);
        }
      } else {
        date = new Date(meetingDate);
      }

      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const formattedDate = date.toLocaleDateString("en-US", options);

      // Format time
      let formattedTime = meetingTime;
      if (
        meetingTime &&
        !meetingTime.includes("PM") &&
        !meetingTime.includes("AM")
      ) {
        // If time is in 24-hour format, convert to 12-hour
        const timeParts = meetingTime.split(":");
        if (timeParts.length === 2) {
          const hour = parseInt(timeParts[0]);
          const minute = timeParts[1];
          const period = hour >= 12 ? "PM" : "AM";
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          formattedTime = `${displayHour}:${minute} ${period}`;
        }
      }

      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return `${meetingDate} ${meetingTime}`;
    }
  };

  // Get user-friendly status
  const getStatusDisplay = (meeting) => {
    if (meeting.status === "done") return "Completed";
    if (meeting.status === "confirmed") return "Confirmed";
    if (meeting.status === "pending") {
      if (meeting.menteeApproved && !meeting.mentorApproved)
        return "Waiting for Mentor Approval";
      if (!meeting.menteeApproved && meeting.mentorApproved)
        return "Waiting for Your Approval";
      return "Pending";
    }
    return meeting.status || "Unknown";
  };

  const fetchPendingMeetings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const response = await fetch(
        `http://localhost:4000/api/meetings/mentee/${user.uid}`
      );
      const data = await response.json();

      if (data.success) {
        // Store all meetings
        setAllMeetings(data.meetings);

        // Debug: Log all meetings and their statuses
        console.log("All meetings from API:", data.meetings);
        data.meetings.forEach((meeting) => {
          console.log(
            `Meeting ${meeting.id}: status=${meeting.status}, date=${meeting.meetingDate}, time=${meeting.meetingTime}`
          );
        });

        // Filter out 'done' meetings from current meetings display
        const currentMeetings = data.meetings.filter(
          (meeting) => meeting.status !== "done"
        );
        console.log("Current meetings after filtering:", currentMeetings);
        setPendingMeetings(currentMeetings);

        // Fetch mentor details from mentors collection
        const mentorIds = [
          ...new Set(
            data.meetings.map((meeting) => meeting.mentorId).filter(Boolean)
          ),
        ];
        const mentorDetailsMap = {};

        console.log("Mentor IDs found in meetings:", mentorIds);

        // Fetch all mentors first, then match by ID
        try {
          const allMentorsResponse = await fetch(
            "http://localhost:3001/api/mentors"
          );
          console.log(
            "All mentors response status:",
            allMentorsResponse.status
          );

          if (allMentorsResponse.ok) {
            const allMentorsData = await allMentorsResponse.json();
            console.log("All mentors data:", allMentorsData);

            if (allMentorsData.success && allMentorsData.mentors) {
              // Match each mentorId with the corresponding mentor from the collection
              mentorIds.forEach((mentorId) => {
                const foundMentor = allMentorsData.mentors.find(
                  (mentor) => mentor.id === mentorId
                );
                if (foundMentor) {
                  mentorDetailsMap[mentorId] = foundMentor;
                  console.log(
                    `Found mentor for ID ${mentorId}:`,
                    foundMentor.name
                  );
                } else {
                  console.log(`No mentor found for ID: ${mentorId}`);
                }
              });
            }
          } else {
            console.log(
              "Failed to fetch all mentors:",
              allMentorsResponse.status
            );
          }
        } catch (error) {
          console.error("Error fetching all mentors:", error);
        }

        console.log("Final mentor details map:", mentorDetailsMap);
        setMentorDetails(mentorDetailsMap);
      }
    } catch (error) {
      console.error("Error fetching pending meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingMeetings();

    // Set up periodic refresh every 2 minutes to check for expired meetings
    const refreshInterval = setInterval(
      () => {
        console.log("Refreshing meetings data...");
        fetchPendingMeetings();
      },
      2 * 60 * 1000
    ); // 2 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const acceptMeeting = async (meetingId) => {
    try {
      const res = await fetch(
        `http://localhost:4000/api/meetings/${meetingId}/accept`,
        { method: "POST" }
      );

      const data = await res.json();

      if (data.success) {
        if (data.movedToConfirmed) {
          // Send confirmation emails from client-side
          try {
            const emailResult = await sendMeetingConfirmationEmails(
              data.meetingData,
              data.meetLink
            );
            if (emailResult.success) {
              window.alert(
                "Meeting accepted! Confirmation emails have been sent to both mentor and mentee."
              );
            } else {
              window.alert(
                `Meeting accepted! However, there was an issue sending confirmation emails: ${emailResult.error}`
              );
            }
          } catch (emailError) {
            console.error("Email sending failed:", emailError);
            window.alert(
              "Meeting accepted! However, there was an issue sending confirmation emails."
            );
          }
        } else {
          window.alert("Meeting accepted! Waiting for mentor approval.");
        }
      } else {
        window.alert(
          `Failed to accept meeting: ${data.error || "Unknown error"}`
        );
      }

      await fetchPendingMeetings();
    } catch (e) {
      console.error("Accept meeting failed", e);
      window.alert("Failed to accept meeting. Please try again.");
    }
  };

  const proposeMeeting = (meeting) => {
    if (meeting && meeting.id) {
      window.alert(`Scheduling a new time for meeting ID: ${meeting.id}`);
    } else {
      window.alert("Scheduling a new time for this meeting.");
    }
    setActiveMeeting(meeting);
    setShowReschedule(true);
  };

  const handleRescheduleSubmit = async ({ meetingDate, meetingTime }) => {
    if (!activeMeeting) return;
    try {
      const res = await fetch(
        `http://localhost:4000/api/meetings/${activeMeeting.id}/propose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingDate, meetingTime }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const text =
          typeof data.error === "string"
            ? data.error
            : `${res.status} ${res.statusText}`;
        window.alert(`Could not schedule new time. ${text}`);
        return;
      }
      if (!data.success) {
        window.alert(
          `Could not schedule new time. ${data.error || "Unknown error"}`
        );
        return;
      }

      // Send new time proposal emails from client-side
      try {
        const emailResult = await sendNewTimeProposalEmails(activeMeeting);
        if (emailResult.success) {
          window.alert(
            "New meeting scheduled. Notification emails have been sent to both mentor and mentee."
          );
        } else {
          window.alert(
            `New meeting scheduled. However, there was an issue sending notification emails: ${emailResult.error}`
          );
        }
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        window.alert(
          "New meeting scheduled. However, there was an issue sending notification emails."
        );
      }

      setShowReschedule(false);
      setActiveMeeting(null);
      await fetchPendingMeetings();
    } catch (e) {
      console.error("Propose meeting failed", e);
      window.alert("An error occurred while scheduling.");
    }
  };

  // Status logic is centralized in Rescheduling.getMeetingStatus

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100vh",
        background: "#ffffff",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        marginBottom: "24px",
        gap: "16px"
      }}>
        <img
          src="/logo.png"
          alt="Ummah Professionals Logo"
          style={{
            height: "60px",
            width: "auto"
          }}
        />
        <h1
          style={{
            color: "#007CA6",
            fontSize: "38px",
            fontWeight: "800",
            margin: "0"
          }}
        >
          DASHBOARD
        </h1>
      </div>
      <div style={{ color: "#007CA6", fontSize: "20px", marginBottom: "16px" }}>
        Current requests
      </div>
      <div
        className="dashboard-container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 32,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        {/* Current Appointment Box */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
            padding: "24px",
            minWidth: "320px",
            color: "#00212C",
            margin: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              color: "#00212C",
              fontWeight: "600",
              fontSize: "20px",
              marginBottom: "16px",
            }}
          >
            Current Meetings
          </h2>
          {loading ? (
            <div style={{ color: "#666", fontSize: 16 }}>Loading...</div>
          ) : pendingMeetings.length === 0 ? (
            <div style={{ color: "#666", fontSize: 16 }}>No meetings</div>
          ) : (
            <div style={{ width: "100%" }}>
              {pendingMeetings.map((meeting, index) => {
                const statusInfo = getMeetingStatus(meeting);
                const isConfirmed = meeting.status === "confirmed";

                return (
                  <div
                    key={meeting.id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: index < pendingMeetings.length - 1 ? 12 : 0,
                      background: isConfirmed ? "#e8f5e8" : "#f9f9f9",
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#00212C" }}>With:</strong>{" "}
                      {meeting.mentorName}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#00212C" }}>When:</strong>{" "}
                      {formatMeetingDate(
                        meeting.meetingDate,
                        meeting.meetingTime
                      )}
                    </div>
                    {isConfirmed && meeting.meetLink && (
                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ color: "#00212C" }}>
                          Google Meet:
                        </strong>
                        <a
                          href={meeting.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#4caf50",
                            textDecoration: "none",
                            marginLeft: 8,
                            fontWeight: "bold",
                          }}
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}
                    <div
                      style={{
                        color: isConfirmed ? "#4caf50" : statusInfo.color,
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {isConfirmed ? "Confirmed" : statusInfo.status}
                    </div>
                    {!isConfirmed &&
                      !meeting.menteeApproved &&
                      meeting.mentorApproved && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                          <button
                            onClick={() => acceptMeeting(meeting.id)}
                            style={{
                              background: "#4caf50",
                              color: "#fff",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => proposeMeeting(meeting)}
                            style={{
                              background: "#FDBB37",
                              color: "#00212C",
                              border: "none",
                              padding: "8px 12px",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Propose new time
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Rescheduling
          open={showReschedule}
          onClose={() => {
            setShowReschedule(false);
            setActiveMeeting(null);
          }}
          onSubmit={handleRescheduleSubmit}
          meeting={activeMeeting}
        />
        {/* Information Box */}
        <div
          className="dashboard-card"
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
            padding: "24px",
            minWidth: "320px",
            color: "#00212C",
            margin: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              color: "#00212C",
              fontWeight: "600",
              fontSize: "20px",
              marginBottom: "16px",
            }}
          >
            Information
          </h2>
          {loading ? (
            <div style={{ color: "#666", fontSize: 16 }}>Loading...</div>
          ) : (
            <div style={{ width: "100%" }}>
              {/* Current Meetings */}
              {pendingMeetings.length > 0 && (
                <>
                  <h3
                    style={{
                      color: "#00212C",
                      fontWeight: 600,
                      fontSize: 20,
                      marginBottom: 16,
                      marginTop: 0,
                    }}
                  >
                    Current Meetings
                  </h3>
                  {pendingMeetings.map((meeting, index) => {
                    const mentorDetail = mentorDetails[meeting.mentorId];
                    console.log(
                      `Meeting ${meeting.id}: mentorId=${meeting.mentorId}, mentorDetail=`,
                      mentorDetail
                    );
                    console.log(
                      "Skills type:",
                      typeof mentorDetail?.skills,
                      "Skills value:",
                      mentorDetail?.skills
                    );
                    console.log(
                      "Certifications type:",
                      typeof mentorDetail?.certifications,
                      "Certifications value:",
                      mentorDetail?.certifications
                    );
                    return (
                      <div
                        key={meeting.id}
                        style={{
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          padding: 16,
                          marginBottom:
                            index < pendingMeetings.length - 1 ? 12 : 0,
                          background: "#f9f9f9",
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <strong style={{ color: "#00212C" }}>Mentor:</strong>{" "}
                          {meeting.mentorName}
                        </div>

                        {/* Show mentor details from API or fallback to meeting data */}
                        {(mentorDetail?.company || meeting.mentorCompany) && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Company:
                            </strong>{" "}
                            {mentorDetail?.company || meeting.mentorCompany}
                          </div>
                        )}
                        {(mentorDetail?.position || meeting.mentorPosition) && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Position:
                            </strong>{" "}
                            {mentorDetail?.position || meeting.mentorPosition}
                          </div>
                        )}
                        {mentorDetail?.yearsOfExperience && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Experience:
                            </strong>{" "}
                            {mentorDetail.yearsOfExperience} years
                          </div>
                        )}
                        {mentorDetail?.university && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              University:
                            </strong>{" "}
                            {mentorDetail.university}
                          </div>
                        )}
                        {mentorDetail?.major && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>Major:</strong>{" "}
                            {mentorDetail.major}
                          </div>
                        )}
                        {mentorDetail?.skills &&
                          Array.isArray(mentorDetail.skills) &&
                          mentorDetail.skills.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <strong style={{ color: "#007CA6" }}>
                                Skills:
                              </strong>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#666",
                                  marginTop: 4,
                                }}
                              >
                                {mentorDetail.skills.join(", ")}
                              </div>
                            </div>
                          )}
                        {mentorDetail?.industry && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Industry:
                            </strong>{" "}
                            {mentorDetail.industry}
                          </div>
                        )}
                        {mentorDetail?.graduationYear && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Graduation Year:
                            </strong>{" "}
                            {mentorDetail.graduationYear}
                          </div>
                        )}
                        {mentorDetail?.certifications &&
                          Array.isArray(mentorDetail.certifications) &&
                          mentorDetail.certifications.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <strong style={{ color: "#007CA6" }}>
                                Certifications:
                              </strong>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: "#666",
                                  marginTop: 4,
                                }}
                              >
                                {mentorDetail.certifications.join(", ")}
                              </div>
                            </div>
                          )}
                        {mentorDetail?.linkedin && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              LinkedIn:
                            </strong>
                            <a
                              href={mentorDetail.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#007CA6",
                                textDecoration: "none",
                                marginLeft: 8,
                                fontWeight: "bold",
                              }}
                            >
                              View Profile
                            </a>
                          </div>
                        )}
                        {meeting.meetLink && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Google Meet:
                            </strong>
                            <a
                              href={meeting.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#4caf50",
                                textDecoration: "none",
                                marginLeft: 8,
                                fontWeight: "bold",
                              }}
                            >
                              Join Meeting
                            </a>
                          </div>
                        )}
                        {(meeting.mentorBio || mentorDetail?.bio) && (
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>About:</strong>
                            <div
                              style={{
                                fontSize: 14,
                                color: "#666",
                                marginTop: 4,
                              }}
                            >
                              {mentorDetail?.bio || meeting.mentorBio}
                              {(mentorDetail?.bio || meeting.mentorBio)
                                ?.length > 100 && "..."}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Past Meetings */}
              {allMeetings.filter((meeting) => meeting.status === "done")
                .length > 0 && (
                <>
                  <h3
                    style={{
                      color: "#007CA6",
                      fontWeight: 600,
                      fontSize: 20,
                      marginBottom: 16,
                      marginTop: 24,
                    }}
                  >
                    Past Meetings
                  </h3>
                  {allMeetings
                    .filter((meeting) => meeting.status === "done")
                    .map((meeting, index) => {
                      const mentorDetail = mentorDetails[meeting.mentorId];
                      return (
                        <div
                          key={meeting.id}
                          style={{
                            border: "1px solid #e0e0e0",
                            borderRadius: 8,
                            padding: 16,
                            marginBottom:
                              index <
                              allMeetings.filter(
                                (meeting) => meeting.status === "done"
                              ).length -
                                1
                                ? 12
                                : 0,
                            background: "#f0f0f0",
                          }}
                        >
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Mentor:
                            </strong>{" "}
                            {meeting.mentorName}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>When:</strong>{" "}
                            {formatMeetingDate(
                              meeting.meetingDate,
                              meeting.meetingTime
                            )}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong style={{ color: "#007CA6" }}>
                              Status:
                            </strong>{" "}
                            <span style={{ color: "#666" }}>Completed</span>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}

              {pendingMeetings.length === 0 &&
                allMeetings.filter((meeting) => meeting.status === "done")
                  .length === 0 && (
                  <div style={{ color: "#666", fontSize: 16 }}>
                    No meetings scheduled
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestMentor() {
  const [currentMeetings, setCurrentMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [menteeData, setMenteeData] = useState(null);
  const [formData, setFormData] = useState({
    major: [],
    industry: [],
    serviceLookingFor: [],
    skillsToLearn: [],
  });
  const [showMatches, setShowMatches] = useState(false);
  const [mentorMatches, setMentorMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.getFullYear(), now.getMonth(), diff);
  });

  // Check for current meetings on component mount
  useEffect(() => {
    checkCurrentMeetings();
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log(
      "State changed - showAvailability:",
      showAvailability,
      "selectedMentor:",
      selectedMentor
    );
  }, [showAvailability, selectedMentor]);

  const checkCurrentMeetings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const response = await fetch(
        `http://localhost:4000/api/meetings/mentee/${user.uid}`
      );
      const data = await response.json();

      if (data.success) {
        const current = data.meetings.filter(
          (meeting) =>
            meeting.status === "pending" || meeting.status === "confirmed"
        );
        setCurrentMeetings(current);

        if (current.length > 0) {
          setError(
            "You have a current meeting. Please finish that one first before requesting a new mentor."
          );
        } else {
          // Load mentee data for pre-filling
          await loadMenteeData();
        }
      }
    } catch (error) {
      console.error("Error checking current meetings:", error);
      setError("Error checking current meetings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMenteeData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "mentees", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setMenteeData(data);
        setFormData({
          major: Array.isArray(data.major)
            ? data.major
            : data.major
              ? [data.major]
              : [],
          industry: data.industry || [],
          serviceLookingFor: Array.isArray(data.serviceLookingFor)
            ? data.serviceLookingFor
            : data.serviceLookingFor
              ? [data.serviceLookingFor]
              : [],
          skillsToLearn: data.skillsToLearn || [],
        });
      }
    } catch (error) {
      console.error("Error loading mentee data:", error);
    }
  };

  const handleStartQuestionnaire = () => {
    setShowQuestionnaire(true);
    setError("");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get all mentors
      const mentorsResponse = await fetch("http://localhost:3001/api/mentors");
      const mentorsData = await mentorsResponse.json();

      if (!mentorsData.success) {
        throw new Error("Failed to fetch mentors");
      }

      // Calculate matches using the same logic as initial pairing
      const { findTopMentors } = await import("./initialPairing.js");

      // Create mentee object for matching
      const menteeForMatching = {
        major: Array.isArray(formData.major)
          ? formData.major[0]
          : formData.major, // Use first major for matching
        industry: formData.industry,
        serviceLookingFor: Array.isArray(formData.serviceLookingFor)
          ? formData.serviceLookingFor[0]
          : formData.serviceLookingFor, // Use first service for matching
        skillsToLearn: formData.skillsToLearn,
      };

      // Get all matches with scores
      const allMatches = mentorsData.mentors
        .map((mentor) => {
          const match = findTopMentors(menteeForMatching, [mentor], 1)[0];
          return match;
        })
        .filter((match) => match && match.totalScore > 0);

      // Sort by score (highest first)
      allMatches.sort((a, b) => b.totalScore - a.totalScore);

      // Apply score threshold
      let threshold = 0.3; // 30%
      if (allMatches.length > 8) {
        threshold = 0.5; // 50%
      }

      const filteredMatches = allMatches.filter(
        (match) => match.totalScore / 100 > threshold // Convert to percentage
      );

      setMentorMatches(filteredMatches);
      setShowMatches(true);
      setShowQuestionnaire(false);
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      setError("Error processing your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectMentor = (mentor) => {
    console.log("Select mentor clicked:", mentor);
    setSelectedMentor(mentor);
    setShowAvailability(true);
    setShowMatches(false); // Hide the matches screen
    console.log(
      "State updated - selectedMentor:",
      mentor,
      "showAvailability: true"
    );
  };

  // Calendar helper functions
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
    setCurrentWeek((prev) => {
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

    return Array.isArray(dayAvailability) ? dayAvailability : [];
  };

  const handleScheduleMeeting = async () => {
    if (!selectedMentor || !selectedDate || !selectedTime) {
      setError("Please select a date and time for the meeting.");
      return;
    }

    setSchedulingMeeting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Create meeting data
      const meetingData = {
        menteeId: user.uid,
        menteeName: menteeData?.firstName + " " + menteeData?.lastName,
        menteeEmail: menteeData?.email,
        mentorId: selectedMentor.mentor.id,
        mentorName: selectedMentor.mentor.name,
        mentorEmail: selectedMentor.mentor.email,
        meetingDate: selectedDate.toLocaleDateString("en-CA"), // YYYY-MM-DD format in local timezone
        meetingTime: selectedTime,
        status: "pending",
        menteeApproved: true,
        mentorApproved: false,
        createdAt: new Date(),
      };

      // Send meeting request to backend
      const response = await fetch("http://localhost:3001/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingData),
      });

      const result = await response.json();

      if (result.success) {
        // Send confirmation emails
        const { sendMeetingEmails } = await import("./emailService.js");
        const emailResult = await sendMeetingEmails(meetingData, selectedDate);

        if (emailResult.success) {
          window.alert(
            "Meeting scheduled successfully! Confirmation emails have been sent to both mentor and mentee."
          );
        } else {
          window.alert(
            `Meeting scheduled successfully! However, there was an issue sending confirmation emails: ${emailResult.error}`
          );
        }

        // Reset state and go back to main view
        setShowMatches(false);
        setShowAvailability(false);
        setSelectedMentor(null);
        setSelectedDate(null);
        setSelectedTime(null);
        setMentorMatches([]);
        setFormData({
          major: [],
          industry: [],
          serviceLookingFor: [],
          skillsToLearn: [],
        });
      } else {
        setError("Failed to schedule meeting. Please try again.");
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      setError("Error scheduling meeting. Please try again.");
    } finally {
      setSchedulingMeeting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 40,
          color: "#00212C",
          background: "#f5f7fa",
          minHeight: "100vh",
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
          Request a Mentor
        </h2>
        <div style={{ color: "#666", fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (error && !showQuestionnaire) {
    return (
      <div
        style={{
          padding: 40,
          color: "#00212C",
          background: "#f5f7fa",
          minHeight: "100vh",
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
          Request a Mentor
        </h2>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          <div style={{ color: "#d32f2f", fontSize: 16, marginBottom: 16 }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              background: "#007CA6",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  console.log(
    "Rendering - showMatches:",
    showMatches,
    "showAvailability:",
    showAvailability,
    "selectedMentor:",
    selectedMentor
  );

  if (showMatches) {
    return (
      <div
        style={{
          padding: 40,
          color: "#00212C",
          background: "#f5f7fa",
          minHeight: "100vh",
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
          Mentor Matches
        </h2>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          {mentorMatches.length > 0 ? (
            <div>
              <h3
                style={{
                  color: "#007CA6",
                  fontWeight: 700,
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                Found {mentorMatches.length} matching mentors
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {mentorMatches.map((match, index) => (
                  <div
                    key={match.mentor.id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      padding: 16,
                      background: "#f9f9f9",
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Name:</strong>{" "}
                      {match.mentor.name}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Experience:</strong>{" "}
                      {match.mentor.yearsOfExperience} years
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Major:</strong>{" "}
                      {match.mentor.major}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Industry:</strong>{" "}
                      {match.mentor.industry}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Skills:</strong>{" "}
                      {Array.isArray(match.mentor.skills)
                        ? match.mentor.skills.join(", ")
                        : match.mentor.skills}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <strong style={{ color: "#007CA6" }}>Help In:</strong>{" "}
                      {match.mentor.helpIn}
                    </div>
                    <div
                      style={{
                        color: "#4caf50",
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 12,
                      }}
                    >
                      Match Score: {Math.round(match.totalScore)}%
                    </div>
                    <button
                      onClick={() => {
                        console.log("Button clicked for mentor:", match);
                        handleSelectMentor(match);
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        background: "#007CA6",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Select & Schedule
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: 16 }}>
              No mentors found matching your criteria. Please try adjusting your
              preferences.
            </div>
          )}
          <button
            onClick={() => {
              setShowMatches(false);
              setShowQuestionnaire(false);
              setError("");
            }}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              borderRadius: 8,
              background: "#007CA6",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  if (showAvailability && selectedMentor) {
    console.log(
      "Rendering availability screen - showAvailability:",
      showAvailability,
      "selectedMentor:",
      selectedMentor
    );
    return (
      <div
        style={{
          padding: 40,
          color: "#00212C",
          background: "#f5f7fa",
          minHeight: "100vh",
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
          Schedule Meeting
        </h2>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                color: "#007CA6",
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 16,
              }}
            >
              Selected Mentor: {selectedMentor.mentor.name}
            </h3>
            <div
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 16,
                background: "#f9f9f9",
                marginBottom: 16,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#007CA6" }}>Experience:</strong>{" "}
                {selectedMentor.mentor.yearsOfExperience} years
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#007CA6" }}>Major:</strong>{" "}
                {selectedMentor.mentor.major}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#007CA6" }}>Industry:</strong>{" "}
                {selectedMentor.mentor.industry}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#007CA6" }}>Skills:</strong>{" "}
                {Array.isArray(selectedMentor.mentor.skills)
                  ? selectedMentor.mentor.skills.join(", ")
                  : selectedMentor.mentor.skills}
              </div>
              <div
                style={{
                  color: "#4caf50",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Match Score: {Math.round(selectedMentor.totalScore)}%
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#007CA6",
              }}
            >
              Select Date & Time *
            </label>

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
                onClick={() => navigateWeek(-1)}
                disabled={(() => {
                  const currentDate = new Date();
                  const currentWeekStart = getCurrentWeekStart(currentDate);
                  return currentWeek.getTime() <= currentWeekStart.getTime();
                })()}
                style={{
                  background: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    return currentWeek.getTime() <= currentWeekStart.getTime()
                      ? "#ccc"
                      : "#f0f0f0";
                  })(),
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 4,
                  cursor: (() => {
                    const currentDate = new Date();
                    const currentWeekStart = getCurrentWeekStart(currentDate);
                    return currentWeek.getTime() <= currentWeekStart.getTime()
                      ? "not-allowed"
                      : "pointer";
                  })(),
                }}
              >
                ← Previous Week
              </button>
              <h5 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {getWeekDisplayName(currentWeek)}
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
                  return currentWeek.getTime() >= nextWeekStart.getTime();
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
                    return currentWeek.getTime() >= nextWeekStart.getTime()
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
                    return currentWeek.getTime() >= nextWeekStart.getTime()
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

              {/* Calendar days - Week view */}
              {(() => {
                const weekDays = getWeekDays(currentWeek);
                const days = [];

                weekDays.forEach((date, index) => {
                  const currentDate = new Date();
                  const isAvailable = isDateAvailable(date);
                  const isToday =
                    date.toDateString() === currentDate.toDateString();
                  const isSelected =
                    selectedDate &&
                    date.toDateString() === selectedDate.toDateString();
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

                return days;
              })()}
            </div>

            {/* Available Times for Selected Date */}
            {selectedDate && (
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#007CA6",
                  }}
                >
                  Available Times for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  :
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {getAvailableTimesForDate(selectedDate).map((time, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTime(time)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 6,
                        background:
                          selectedTime === time ? "#007CA6" : "#f0f0f0",
                        color: selectedTime === time ? "white" : "#333",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: selectedTime === time ? 600 : 400,
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleScheduleMeeting}
              disabled={schedulingMeeting || !selectedDate || !selectedTime}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background:
                  schedulingMeeting || !selectedDate || !selectedTime
                    ? "#ccc"
                    : "#007CA6",
                color: "white",
                border: "none",
                cursor:
                  schedulingMeeting || !selectedDate || !selectedTime
                    ? "not-allowed"
                    : "pointer",
                fontSize: 16,
                fontWeight: 600,
                flex: 1,
              }}
            >
              {schedulingMeeting ? "Scheduling..." : "Schedule Meeting"}
            </button>
            <button
              onClick={() => {
                setShowAvailability(false);
                setSelectedMentor(null);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background: "#666",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showQuestionnaire) {
    // Define the same options as in the original MenteeForm
    const industryOptions = [
      { value: "Business", label: "Business" },
      { value: "Education", label: "Education" },
      { value: "Engineering", label: "Engineering" },
      { value: "Finance", label: "Finance" },
      { value: "Healthcare", label: "Healthcare" },
      { value: "Information Technology", label: "Information Technology" },
      { value: "Law", label: "Law" },
      { value: "Social Services", label: "Social Services" },
      { value: "Science", label: "Science" },
      { value: "Arts", label: "Arts" },
      { value: "Other", label: "Other" },
    ];

    const majorOptions = [
      { value: "Accounting", label: "Accounting" },
      { value: "Actuarial Science", label: "Actuarial Science" },
      { value: "Advertising Major", label: "Advertising Major" },
      { value: "Aerospace Engineering", label: "Aerospace Engineering" },
      {
        value: "African Languages, Literatures, and Linguistics",
        label: "African Languages, Literatures, and Linguistics",
      },
      { value: "African Studies", label: "African Studies" },
      { value: "African-American Studies", label: "African-American Studies" },
      {
        value: "Agricultural Business and Management",
        label: "Agricultural Business and Management",
      },
      { value: "Agricultural Economics", label: "Agricultural Economics" },
      { value: "Agricultural Education", label: "Agricultural Education" },
      { value: "Agricultural Journalism", label: "Agricultural Journalism" },
      {
        value: "Agricultural Mechanization Major",
        label: "Agricultural Mechanization Major",
      },
      {
        value: "Agricultural Technology Management",
        label: "Agricultural Technology Management",
      },
      {
        value: "Agricultural/Biological Engineering and Bioengineering",
        label: "Agricultural/Biological Engineering and Bioengineering",
      },
      { value: "Agriculture", label: "Agriculture" },
      {
        value: "Agronomy and Crop Science",
        label: "Agronomy and Crop Science",
      },
      { value: "Air Traffic Control", label: "Air Traffic Control" },
      { value: "American History", label: "American History" },
      { value: "American Literature", label: "American Literature" },
      { value: "American Sign Language", label: "American Sign Language" },
      { value: "American Studies", label: "American Studies" },
      { value: "Anatomy", label: "Anatomy" },
      { value: "Ancient Studies", label: "Ancient Studies" },
      {
        value: "Animal Behavior and Ethology",
        label: "Animal Behavior and Ethology",
      },
      { value: "Animal Science", label: "Animal Science" },
      {
        value: "Animation and Special Effects",
        label: "Animation and Special Effects",
      },
      { value: "Anthropology", label: "Anthropology" },
      { value: "Applied Mathematics", label: "Applied Mathematics" },
      { value: "Aquaculture", label: "Aquaculture" },
      { value: "Aquatic Biology", label: "Aquatic Biology" },
      { value: "Arabic", label: "Arabic" },
      { value: "Archeology", label: "Archeology" },
      {
        value: "Architectural Engineering",
        label: "Architectural Engineering",
      },
      { value: "Architectural History", label: "Architectural History" },
      { value: "Architecture", label: "Architecture" },
      { value: "Art", label: "Art" },
      { value: "Art Education", label: "Art Education" },
      { value: "Art History", label: "Art History" },
      { value: "Art Therapy", label: "Art Therapy" },
      {
        value: "Artificial Intelligence and Robotics",
        label: "Artificial Intelligence and Robotics",
      },
      { value: "Asian-American Studies", label: "Asian-American Studies" },
      { value: "Astronomy", label: "Astronomy" },
      { value: "Astrophysics", label: "Astrophysics" },
      { value: "Athletic Training", label: "Athletic Training" },
      { value: "Atmospheric Science", label: "Atmospheric Science" },
      { value: "Automotive Engineering", label: "Automotive Engineering" },
      { value: "Aviation", label: "Aviation" },
      { value: "Bakery Science", label: "Bakery Science" },
      { value: "Biblical Studies", label: "Biblical Studies" },
      { value: "Biochemistry", label: "Biochemistry" },
      { value: "Bioethics", label: "Bioethics" },
      { value: "Biology", label: "Biology" },
      { value: "Biomedical Engineering", label: "Biomedical Engineering" },
      { value: "Biomedical Science", label: "Biomedical Science" },
      { value: "Biopsychology", label: "Biopsychology" },
      { value: "Biotechnology", label: "Biotechnology" },
      { value: "Botany/Plant Biology", label: "Botany/Plant Biology" },
      {
        value: "Business Administration/Management",
        label: "Business Administration/Management",
      },
      { value: "Business Communications", label: "Business Communications" },
      { value: "Business Education", label: "Business Education" },
      { value: "Canadian Studies", label: "Canadian Studies" },
      { value: "Caribbean Studies", label: "Caribbean Studies" },
      { value: "Cell Biology Major", label: "Cell Biology Major" },
      { value: "Ceramic Engineering", label: "Ceramic Engineering" },
      { value: "Ceramics", label: "Ceramics" },
      {
        value: "Chemical Engineering Major",
        label: "Chemical Engineering Major",
      },
      { value: "Chemical Physics", label: "Chemical Physics" },
      { value: "Chemistry Major", label: "Chemistry Major" },
      { value: "Child Care", label: "Child Care" },
      { value: "Child Development", label: "Child Development" },
      { value: "Chinese", label: "Chinese" },
      { value: "Chiropractic", label: "Chiropractic" },
      { value: "Church Music", label: "Church Music" },
      {
        value: "Cinematography and Film/Video Production",
        label: "Cinematography and Film/Video Production",
      },
      { value: "Circulation Technology", label: "Circulation Technology" },
      { value: "Civil Engineering", label: "Civil Engineering" },
      { value: "Classics", label: "Classics" },
      { value: "Clinical Psychology", label: "Clinical Psychology" },
      { value: "Cognitive Psychology", label: "Cognitive Psychology" },
      { value: "Communication Disorders", label: "Communication Disorders" },
      {
        value: "Communications Studies/Speech Communication and Rhetoric",
        label: "Communications Studies/Speech Communication and Rhetoric",
      },
      { value: "Comparative Literature", label: "Comparative Literature" },
      {
        value: "Computer and Information Science",
        label: "Computer and Information Science",
      },
      { value: "Computer Engineering", label: "Computer Engineering" },
      { value: "Computer Graphics", label: "Computer Graphics" },
      {
        value: "Computer Systems Analysis Major",
        label: "Computer Systems Analysis Major",
      },
      { value: "Construction Management", label: "Construction Management" },
      { value: "Counseling", label: "Counseling" },
      { value: "Crafts", label: "Crafts" },
      { value: "Creative Writing", label: "Creative Writing" },
      { value: "Criminal Science", label: "Criminal Science" },
      { value: "Criminology", label: "Criminology" },
      { value: "Culinary Arts", label: "Culinary Arts" },
      { value: "Dance", label: "Dance" },
      { value: "Data Processing", label: "Data Processing" },
      { value: "Dental Hygiene", label: "Dental Hygiene" },
      { value: "Developmental Psychology", label: "Developmental Psychology" },
      {
        value: "Diagnostic Medical Sonography",
        label: "Diagnostic Medical Sonography",
      },
      { value: "Dietetics", label: "Dietetics" },
      {
        value: "Digital Communications and Media/Multimedia",
        label: "Digital Communications and Media/Multimedia",
      },
      { value: "Drawing", label: "Drawing" },
      {
        value: "Early Childhood Education",
        label: "Early Childhood Education",
      },
      { value: "East Asian Studies", label: "East Asian Studies" },
      { value: "East European Studies", label: "East European Studies" },
      { value: "Ecology", label: "Ecology" },
      { value: "Economics Major", label: "Economics Major" },
      { value: "Education", label: "Education" },
      { value: "Education Administration", label: "Education Administration" },
      { value: "Education of the Deaf", label: "Education of the Deaf" },
      { value: "Educational Psychology", label: "Educational Psychology" },
      { value: "Electrical Engineering", label: "Electrical Engineering" },
      { value: "Elementary Education", label: "Elementary Education" },
      { value: "Engineering Mechanics", label: "Engineering Mechanics" },
      { value: "Engineering Physics", label: "Engineering Physics" },
      { value: "English", label: "English" },
      { value: "English Composition", label: "English Composition" },
      { value: "English Literature Major", label: "English Literature Major" },
      { value: "Entomology", label: "Entomology" },
      { value: "Entrepreneurship Major", label: "Entrepreneurship Major" },
      {
        value: "Environmental Design/Architecture",
        label: "Environmental Design/Architecture",
      },
      { value: "Environmental Science", label: "Environmental Science" },
      {
        value: "Environmental/Environmental Health Engineering",
        label: "Environmental/Environmental Health Engineering",
      },
      { value: "Epidemiology", label: "Epidemiology" },
      { value: "Equine Studies", label: "Equine Studies" },
      { value: "Ethnic Studies", label: "Ethnic Studies" },
      { value: "European History", label: "European History" },
      { value: "Experimental Pathology", label: "Experimental Pathology" },
      { value: "Experimental Psychology", label: "Experimental Psychology" },
      { value: "Fashion Design", label: "Fashion Design" },
      { value: "Fashion Merchandising", label: "Fashion Merchandising" },
      { value: "Feed Science", label: "Feed Science" },
      {
        value: "Fiber, Textiles, and Weaving Arts",
        label: "Fiber, Textiles, and Weaving Arts",
      },
      { value: "Film", label: "Film" },
      { value: "Finance", label: "Finance" },
      { value: "Floriculture", label: "Floriculture" },
      { value: "Food Science", label: "Food Science" },
      { value: "Forensic Science", label: "Forensic Science" },
      { value: "Forestry", label: "Forestry" },
      { value: "French", label: "French" },
      { value: "Furniture Design", label: "Furniture Design" },
      { value: "Game Design", label: "Game Design" },
      { value: "Gay and Lesbian Studies", label: "Gay and Lesbian Studies" },
      { value: "Genetics", label: "Genetics" },
      { value: "Geography", label: "Geography" },
      { value: "Geological Engineering", label: "Geological Engineering" },
      { value: "Geology", label: "Geology" },
      { value: "Geophysics", label: "Geophysics" },
      { value: "German", label: "German" },
      { value: "Gerontology", label: "Gerontology" },
      { value: "Government Major", label: "Government Major" },
      { value: "Graphic Design", label: "Graphic Design" },
      { value: "Health Administration", label: "Health Administration" },
      { value: "Hebrew", label: "Hebrew" },
      {
        value: "Hispanic-American, Puerto Rican, and Chicano Studies",
        label: "Hispanic-American, Puerto Rican, and Chicano Studies",
      },
      { value: "Historic Preservation", label: "Historic Preservation" },
      { value: "History", label: "History" },
      { value: "Home Economics", label: "Home Economics" },
      { value: "Horticulture", label: "Horticulture" },
      { value: "Hospitality", label: "Hospitality" },
      { value: "Human Development", label: "Human Development" },
      {
        value: "Human Resources Management Major",
        label: "Human Resources Management Major",
      },
      { value: "Illustration", label: "Illustration" },
      { value: "Industrial Design", label: "Industrial Design" },
      { value: "Industrial Engineering", label: "Industrial Engineering" },
      { value: "Industrial Management", label: "Industrial Management" },
      { value: "Industrial Psychology", label: "Industrial Psychology" },
      { value: "Information Technology", label: "Information Technology" },
      { value: "Interior Architecture", label: "Interior Architecture" },
      { value: "Interior Design", label: "Interior Design" },
      {
        value: "International Agriculture",
        label: "International Agriculture",
      },
      { value: "International Business", label: "International Business" },
      { value: "International Relations", label: "International Relations" },
      { value: "International Studies", label: "International Studies" },
      { value: "Islamic Studies", label: "Islamic Studies" },
      { value: "Italian", label: "Italian" },
      { value: "Japanese", label: "Japanese" },
      { value: "Jazz Studies", label: "Jazz Studies" },
      {
        value: "Jewelry and Metalsmithing",
        label: "Jewelry and Metalsmithing",
      },
      { value: "Jewish Studies", label: "Jewish Studies" },
      { value: "Journalism", label: "Journalism" },
      { value: "Kinesiology", label: "Kinesiology" },
      { value: "Korean", label: "Korean" },
      {
        value: "Land Use Planning and Management",
        label: "Land Use Planning and Management",
      },
      { value: "Landscape Architecture", label: "Landscape Architecture" },
      { value: "Landscape Horticulture", label: "Landscape Horticulture" },
      { value: "Latin American Studies", label: "Latin American Studies" },
      { value: "Library Science", label: "Library Science" },
      { value: "Linguistics", label: "Linguistics" },
      { value: "Logistics Management", label: "Logistics Management" },
      {
        value: "Management Information Systems",
        label: "Management Information Systems",
      },
      { value: "Managerial Economics", label: "Managerial Economics" },
      { value: "Marine Biology Major", label: "Marine Biology Major" },
      { value: "Marine Science", label: "Marine Science" },
      { value: "Marketing Major", label: "Marketing Major" },
      { value: "Mass Communication", label: "Mass Communication" },
      { value: "Massage Therapy", label: "Massage Therapy" },
      { value: "Materials Science", label: "Materials Science" },
      { value: "Mathematics", label: "Mathematics" },
      { value: "Mechanical Engineering", label: "Mechanical Engineering" },
      { value: "Medical Technology", label: "Medical Technology" },
      {
        value: "Medieval and Renaissance Studies",
        label: "Medieval and Renaissance Studies",
      },
      { value: "Mental Health Services", label: "Mental Health Services" },
      {
        value: "Merchandising and Buying Operations",
        label: "Merchandising and Buying Operations",
      },
      {
        value: "Metallurgical Engineering",
        label: "Metallurgical Engineering",
      },
      { value: "Microbiology", label: "Microbiology" },
      { value: "Middle Eastern Studies", label: "Middle Eastern Studies" },
      { value: "Military Science", label: "Military Science" },
      { value: "Mineral Engineering", label: "Mineral Engineering" },
      { value: "Missions", label: "Missions" },
      { value: "Modern Greek", label: "Modern Greek" },
      { value: "Molecular Biology", label: "Molecular Biology" },
      { value: "Molecular Genetics", label: "Molecular Genetics" },
      { value: "Mortuary Science", label: "Mortuary Science" },
      { value: "Museum Studies", label: "Museum Studies" },
      { value: "Music", label: "Music" },
      { value: "Music Education", label: "Music Education" },
      { value: "Music History Major", label: "Music History Major" },
      { value: "Music Management", label: "Music Management" },
      { value: "Music Therapy", label: "Music Therapy" },
      { value: "Musical Theater", label: "Musical Theater" },
      { value: "Native American Studies", label: "Native American Studies" },
      {
        value: "Natural Resources Conservation",
        label: "Natural Resources Conservation",
      },
      { value: "Naval Architecture", label: "Naval Architecture" },
      { value: "Neurobiology", label: "Neurobiology" },
      { value: "Neuroscience", label: "Neuroscience" },
      { value: "Nuclear Engineering", label: "Nuclear Engineering" },
      { value: "Nursing Major", label: "Nursing Major" },
      { value: "Nutrition", label: "Nutrition" },
      { value: "Occupational Therapy", label: "Occupational Therapy" },
      { value: "Ocean Engineering", label: "Ocean Engineering" },
      { value: "Oceanography", label: "Oceanography" },
      { value: "Operations Management", label: "Operations Management" },
      {
        value: "Organizational Behavior Studies",
        label: "Organizational Behavior Studies",
      },
      { value: "Painting", label: "Painting" },
      { value: "Paleontology", label: "Paleontology" },
      { value: "Pastoral Studies", label: "Pastoral Studies" },
      { value: "Peace Studies", label: "Peace Studies" },
      { value: "Petroleum Engineering", label: "Petroleum Engineering" },
      { value: "Pharmacology", label: "Pharmacology" },
      { value: "Pharmacy", label: "Pharmacy" },
      { value: "Philosophy", label: "Philosophy" },
      { value: "Photography", label: "Photography" },
      { value: "Photojournalism Major", label: "Photojournalism Major" },
      { value: "Physical Education", label: "Physical Education" },
      { value: "Physical Therapy", label: "Physical Therapy" },
      { value: "Physician Assistant", label: "Physician Assistant" },
      { value: "Physics", label: "Physics" },
      { value: "Physiological Psychology", label: "Physiological Psychology" },
      { value: "Piano", label: "Piano" },
      { value: "Planetary Science", label: "Planetary Science" },
      { value: "Plant Pathology", label: "Plant Pathology" },
      {
        value: "Playwriting and Screenwriting",
        label: "Playwriting and Screenwriting",
      },
      { value: "Political Communication", label: "Political Communication" },
      { value: "Political Science Major", label: "Political Science Major" },
      { value: "Portuguese", label: "Portuguese" },
      { value: "Pre-Dentistry", label: "Pre-Dentistry" },
      { value: "Pre-Law", label: "Pre-Law" },
      { value: "Pre-Medicine", label: "Pre-Medicine" },
      { value: "Pre-Optometry", label: "Pre-Optometry" },
      { value: "Pre-Seminary", label: "Pre-Seminary" },
      { value: "Pre-Veterinary Medicine", label: "Pre-Veterinary Medicine" },
      { value: "Printmaking", label: "Printmaking" },
      { value: "Psychology", label: "Psychology" },
      { value: "Public Administration", label: "Public Administration" },
      { value: "Public Health", label: "Public Health" },
      { value: "Public Policy Analysis", label: "Public Policy Analysis" },
      { value: "Public Relations Major", label: "Public Relations Major" },
      { value: "Radio and Television", label: "Radio and Television" },
      { value: "Radiologic Technology", label: "Radiologic Technology" },
      {
        value: "Range Science and Management",
        label: "Range Science and Management",
      },
      { value: "Real Estate", label: "Real Estate" },
      {
        value: "Recording Arts Technology",
        label: "Recording Arts Technology",
      },
      { value: "Recreation Management", label: "Recreation Management" },
      { value: "Rehabilitation Services", label: "Rehabilitation Services" },
      { value: "Religious Studies", label: "Religious Studies" },
      { value: "Respiratory Therapy", label: "Respiratory Therapy" },
      { value: "Risk Management", label: "Risk Management" },
      { value: "Rural Sociology", label: "Rural Sociology" },
      { value: "Russian", label: "Russian" },
      { value: "Scandinavian Studies", label: "Scandinavian Studies" },
      { value: "Sculpture", label: "Sculpture" },
      {
        value: "Slavic Languages and Literatures",
        label: "Slavic Languages and Literatures",
      },
      { value: "Social Psychology", label: "Social Psychology" },
      { value: "Social Work", label: "Social Work" },
      { value: "Sociology", label: "Sociology" },
      { value: "Soil Science", label: "Soil Science" },
      { value: "Sound Engineering", label: "Sound Engineering" },
      { value: "South Asian Studies", label: "South Asian Studies" },
      { value: "Southeast Asia Studies", label: "Southeast Asia Studies" },
      { value: "Spanish Major", label: "Spanish Major" },
      { value: "Special Education", label: "Special Education" },
      { value: "Speech Pathology", label: "Speech Pathology" },
      {
        value: "Sport and Leisure Studies",
        label: "Sport and Leisure Studies",
      },
      { value: "Sports Management", label: "Sports Management" },
      { value: "Statistics Major", label: "Statistics Major" },
      { value: "Surveying", label: "Surveying" },
      {
        value: "Sustainable Resource Management",
        label: "Sustainable Resource Management",
      },
      { value: "Teacher Education", label: "Teacher Education" },
      {
        value: "Teaching English as a Second Language",
        label: "Teaching English as a Second Language",
      },
      { value: "Technical Writing", label: "Technical Writing" },
      { value: "Technology Education", label: "Technology Education" },
      { value: "Textile Engineering", label: "Textile Engineering" },
      { value: "Theatre", label: "Theatre" },
      { value: "Theology", label: "Theology" },
      { value: "Tourism", label: "Tourism" },
      { value: "Toxicology", label: "Toxicology" },
      { value: "Turfgrass Science", label: "Turfgrass Science" },
      { value: "Urban Planning", label: "Urban Planning" },
      { value: "Urban Studies", label: "Urban Studies" },
      { value: "Visual Communication", label: "Visual Communication" },
      { value: "Voice", label: "Voice" },
      { value: "Web Design", label: "Web Design" },
      {
        value: "Webmaster and Web Management",
        label: "Webmaster and Web Management",
      },
      { value: "Welding Engineering", label: "Welding Engineering" },
      { value: "Wildlife Management", label: "Wildlife Management" },
      { value: "Women's Studies", label: "Women's Studies" },
      { value: "Youth Ministries", label: "Youth Ministries" },
      { value: "Zoology", label: "Zoology" },
      { value: "Other", label: "Other" },
    ];

    const skillsToLearnOptions = [
      { value: "Technical Skills", label: "Technical Skills" },
      { value: "Leadership", label: "Leadership" },
      { value: "Communication", label: "Communication" },
      { value: "Public Speaking", label: "Public Speaking" },
      { value: "Project Management", label: "Project Management" },
      { value: "Problem Solving", label: "Problem Solving" },
      { value: "Critical Thinking", label: "Critical Thinking" },
      { value: "Time Management", label: "Time Management" },
      { value: "Teamwork", label: "Teamwork" },
      { value: "Negotiation", label: "Negotiation" },
      { value: "Sales Skills", label: "Sales Skills" },
      { value: "Marketing", label: "Marketing" },
      { value: "Financial Literacy", label: "Financial Literacy" },
      { value: "Data Analysis", label: "Data Analysis" },
      { value: "Research Skills", label: "Research Skills" },
      { value: "Networking", label: "Networking" },
      { value: "Confidence Building", label: "Confidence Building" },
      { value: "Interview Skills", label: "Interview Skills" },
      { value: "Resume Writing", label: "Resume Writing" },
      { value: "Career Planning", label: "Career Planning" },
      { value: "Entrepreneurship", label: "Entrepreneurship" },
      { value: "Innovation", label: "Innovation" },
      { value: "Strategic Thinking", label: "Strategic Thinking" },
      { value: "Customer Service", label: "Customer Service" },
      { value: "Conflict Resolution", label: "Conflict Resolution" },
      { value: "Mentoring Others", label: "Mentoring Others" },
      {
        value: "Cross-cultural Communication",
        label: "Cross-cultural Communication",
      },
      { value: "Digital Marketing", label: "Digital Marketing" },
      { value: "Social Media Management", label: "Social Media Management" },
      { value: "Content Creation", label: "Content Creation" },
      { value: "Design Thinking", label: "Design Thinking" },
      { value: "Agile/Scrum", label: "Agile/Scrum" },
      { value: "Risk Management", label: "Risk Management" },
      { value: "Quality Assurance", label: "Quality Assurance" },
      { value: "Supply Chain Management", label: "Supply Chain Management" },
      { value: "Human Resources", label: "Human Resources" },
      { value: "Legal Knowledge", label: "Legal Knowledge" },
      { value: "Regulatory Compliance", label: "Regulatory Compliance" },
      { value: "Sustainability", label: "Sustainability" },
      { value: "Remote Work Skills", label: "Remote Work Skills" },
      { value: "Virtual Collaboration", label: "Virtual Collaboration" },
      { value: "Other", label: "Other" },
    ];

    return (
      <div
        style={{
          padding: 40,
          color: "#00212C",
          background: "#f5f7fa",
          minHeight: "100vh",
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
          Mentor Request Questionnaire
        </h2>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: 32,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#007CA6",
              }}
            >
              Major *
            </label>
            <Select
              isMulti
              name="major"
              options={majorOptions}
              value={majorOptions.filter((opt) =>
                (formData.major || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setFormData({
                  ...formData,
                  major: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select major..."
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 16,
                  minHeight: "48px",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
              }}
            />
            <div style={{ fontSize: "0.95rem", color: "#888", marginTop: 4 }}>
              You can select multiple majors.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#007CA6",
              }}
            >
              Industry *
            </label>
            <Select
              isMulti
              name="industry"
              options={industryOptions}
              value={industryOptions.filter((opt) =>
                (formData.industry || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setFormData({
                  ...formData,
                  industry: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select industry..."
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 16,
                  minHeight: "48px",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
              }}
            />
            <div style={{ fontSize: "0.95rem", color: "#888", marginTop: 4 }}>
              You can select multiple industries.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#007CA6",
              }}
            >
              Help Wanted *
            </label>
            <Select
              isMulti
              name="serviceLookingFor"
              options={[
                { value: "Career advice", label: "Career advice" },
                { value: "Resume review", label: "Resume review" },
                { value: "Interview prep", label: "Interview prep" },
              ]}
              value={[
                { value: "Career advice", label: "Career advice" },
                { value: "Resume review", label: "Resume review" },
                { value: "Interview prep", label: "Interview prep" },
              ].filter((opt) =>
                (formData.serviceLookingFor || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setFormData({
                  ...formData,
                  serviceLookingFor: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select services..."
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 16,
                  minHeight: "48px",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
              }}
            />
            <div style={{ fontSize: "0.95rem", color: "#888", marginTop: 4 }}>
              You can select multiple services.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#007CA6",
              }}
            >
              Skills Looking For *
            </label>
            <Select
              isMulti
              name="skillsToLearn"
              options={skillsToLearnOptions}
              value={skillsToLearnOptions.filter((opt) =>
                (formData.skillsToLearn || []).includes(opt.value)
              )}
              onChange={(selectedOptions) => {
                setFormData({
                  ...formData,
                  skillsToLearn: selectedOptions
                    ? selectedOptions.map((opt) => opt.value)
                    : [],
                });
              }}
              classNamePrefix="react-select"
              placeholder="Select skills you want to learn..."
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 16,
                  minHeight: "48px",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 9999,
                }),
              }}
            />
            <div style={{ fontSize: "0.95rem", color: "#888", marginTop: 4 }}>
              You can select multiple skills. This helps us match you with the
              best mentors.
            </div>
          </div>

          {error && (
            <div style={{ color: "#d32f2f", fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formData.major ||
                !formData.major.length ||
                !formData.industry ||
                !formData.industry.length ||
                !formData.serviceLookingFor ||
                !formData.serviceLookingFor.length ||
                !formData.skillsToLearn ||
                !formData.skillsToLearn.length
              }
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background: submitting ? "#ccc" : "#007CA6",
                color: "white",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {submitting ? "Finding Matches..." : "Find Mentors"}
            </button>
            <button
              onClick={() => {
                setShowQuestionnaire(false);
                setError("");
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                background: "#666",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 40,
        color: "#00212C",
        background: "#f5f7fa",
        minHeight: "100vh",
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
        Request a Mentor
      </h2>
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          marginBottom: 32,
        }}
      >
        <p style={{ fontSize: 16, color: "#666", marginBottom: 20 }}>
          Ready to find your next mentor? Let's get started with a quick
          questionnaire to find the best matches for you.
        </p>
        <button
          onClick={handleStartQuestionnaire}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            background: "#007CA6",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Start Questionnaire
        </button>
      </div>
    </div>
  );
}
function Feedback() {
  return (
    <div style={{ padding: 40, color: "#fff" }}>
      <h2>Feedback</h2>
      <div>Feature coming soon.</div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError("Login failed: incorrect email or password");
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h2>Sign In</h2>
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="login-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="login-btn" onClick={handleLogin}>
          Sign In
        </button>
        {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!loggedIn) return;
      const authUser = auth.currentUser;
      if (!authUser) return;
      const docRef = doc(db, "mentees", authUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUser({
          firstName: docSnap.data().firstName || "",
          lastName: docSnap.data().lastName || "",
          profilePic: docSnap.data().profilePic || "",
        });
      }
    };
    fetchUser();
  }, [loggedIn, showProfile]);

  const handleLogout = () => {
    setLoggedIn(false);
    setUser(null);
    doSignout();
    setActivePage("dashboard");
  };

  const handleProfileBack = () => {
    setShowProfile(false);
    setActivePage("dashboard");
  };

  const handleNavigation = (newPage, newShowProfile = false) => {
    // Check if we're currently on profile page and there are unsaved changes
    if (
      (showProfile || activePage === "profile") &&
      window.profileHasUnsavedChanges
    ) {
      setPendingNavigation({ page: newPage, showProfile: newShowProfile });
      setShowUnsavedChangesModal(true);
    } else {
      // No unsaved changes, proceed with navigation
      setShowProfile(newShowProfile);
      setActivePage(newPage);
    }
  };

  const handleContinueNavigation = () => {
    if (pendingNavigation) {
      setShowProfile(pendingNavigation.showProfile);
      setActivePage(pendingNavigation.page);
      setPendingNavigation(null);
    }
    setShowUnsavedChangesModal(false);
    // Reset the unsaved changes flag
    window.profileHasUnsavedChanges = false;
  };

  const handleCancelNavigation = () => {
    setPendingNavigation(null);
    setShowUnsavedChangesModal(false);
  };

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  let mainContent;
  if (showProfile || activePage === "profile")
    mainContent = <ProfilePage onBack={handleProfileBack} user={user} />;
  else if (activePage === "dashboard") mainContent = <Dashboard />;
  else if (activePage === "request") mainContent = <RequestMentor />;
  else if (activePage === "information") mainContent = <Information />;
  else mainContent = <Dashboard />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f5f5f5",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          height: "100px",
          background: "#E7E8EE",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          zIndex: 100,
        }}
      >
        {/* Left side - Logo and Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: "48px", height: "48px", objectFit: "contain" }}
          />
          <span
            style={{
              fontSize: "1.8rem",
              fontWeight: "700",
              color: "#333333",
              letterSpacing: "0.5px",
            }}
          >
            ummah professionals
          </span>
        </div>

        {/* Right side - Navigation and Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div style={{ display: "flex", gap: "24px" }}>
            <a
              href="#"
              style={{
                color: "#666666",
                textDecoration: "none",
                fontSize: "1.2rem",
                fontWeight: "500",
              }}
            >
              home
            </a>
            <a
              href="#"
              style={{
                color: "#666666",
                textDecoration: "none",
                fontSize: "1.2rem",
                fontWeight: "500",
              }}
            >
              about
            </a>
            <a
              href="#"
              style={{
                color: "#666666",
                textDecoration: "none",
                fontSize: "1.2rem",
                fontWeight: "500",
              }}
            >
              get involved ▼
            </a>
            <a
              href="#"
              style={{
                color: "#666666",
                textDecoration: "none",
                fontSize: "1.2rem",
                fontWeight: "500",
              }}
            >
              events
            </a>
            <a
              href="#"
              style={{
                color: "#666666",
                textDecoration: "none",
                fontSize: "1.2rem",
                fontWeight: "500",
              }}
            >
              contact us
            </a>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "#FDBB37",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "1.2rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#e6a800")}
            onMouseOut={(e) => (e.target.style.background = "#FDBB37")}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Small Sidebar */}
        <div
          style={{
            width: sidebarCollapsed ? "60px" : "200px",
            background: "#E7E8EE",
            borderRight: "1px solid #e0e0e0",
            transition: "width 0.2s",
            display: "flex",
            flexDirection: "column",
            padding: "20px 0",
          }}
        >
          {/* Sidebar Toggle */}
          <div style={{ padding: "0 16px", marginBottom: "20px" }}>
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "#666666",
                padding: "8px",
                borderRadius: "4px",
                width: "100%",
                textAlign: "left",
              }}
            >
              ☰
            </button>
          </div>

          {/* Navigation Links */}
          {!sidebarCollapsed && (
            <>
              <div style={{ padding: "0 16px", marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "6px",
                    background:
                      activePage === "dashboard" ? "#007CA6" : "transparent",
                    color: activePage === "dashboard" ? "#ffffff" : "#00212C",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: activePage === "dashboard" ? "600" : "400",
                  }}
                  onClick={() => handleNavigation("dashboard", false)}
                >
                  Dashboard
                </div>
              </div>

              <div style={{ padding: "0 16px", marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "6px",
                    background:
                      showProfile || activePage === "profile"
                        ? "#007CA6"
                        : "transparent",
                    color:
                      showProfile || activePage === "profile"
                        ? "#ffffff"
                        : "#00212C",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight:
                      showProfile || activePage === "profile" ? "600" : "400",
                  }}
                  onClick={() => handleNavigation("profile", true)}
                >
                  Profile
                </div>
              </div>

              <div style={{ padding: "0 16px", marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "6px",
                    background:
                      activePage === "request" ? "#007CA6" : "transparent",
                    color: activePage === "request" ? "#ffffff" : "#00212C",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: activePage === "request" ? "600" : "400",
                  }}
                  onClick={() => handleNavigation("request", false)}
                >
                  Request a Mentor
                </div>
              </div>

              <div style={{ padding: "0 16px", marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "6px",
                    background:
                      activePage === "information" ? "#007CA6" : "transparent",
                    color: activePage === "information" ? "#ffffff" : "#00212C",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: activePage === "information" ? "600" : "400",
                  }}
                  onClick={() => handleNavigation("information", false)}
                >
                  Past Meetings
                </div>
              </div>
            </>
          )}

          {/* Collapsed State - Show nothing, just empty space */}
          {sidebarCollapsed && (
            <div style={{ padding: "0 8px", marginBottom: "16px" }}></div>
          )}
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            padding: "24px",
            overflowY: "auto",
            minWidth: "0",
            marginLeft: "0",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {mainContent}
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
          >
            <h3
              style={{
                color: "#00212C",
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "16px",
                marginTop: 0,
              }}
            >
              Unsaved Changes
            </h3>
            <p
              style={{
                color: "#666666",
                fontSize: "16px",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              You have unsaved changes in your profile. Do you want to continue
              without saving?
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelNavigation}
                style={{
                  background: "#f5f5f5",
                  color: "#666666",
                  border: "1px solid #e0e0e0",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.background = "#e8e8e8")}
                onMouseOut={(e) => (e.target.style.background = "#f5f5f5")}
              >
                Cancel
              </button>
              <button
                onClick={handleContinueNavigation}
                style={{
                  background: "#007CA6",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => (e.target.style.background = "#006b8f")}
                onMouseOut={(e) => (e.target.style.background = "#007CA6")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
