import React, { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Typography } from "@mui/material";
import ScheduleMeeting from "../ScheduleMeeting";

// request ID is not working yet
function MentorHome() {
  const [activeTab, setActiveTab] = React.useState("upcoming");
  const [meetingRequests, setMeetingRequests] = React.useState([]);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [targetID, setTargetID] = useState("");
  const [service, setService] = useState("");
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = "/mentor-login";
      }
    });
    const unsub = onSnapshot(collection(db, "pendingMeetings"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((meeting) => meeting.mentorEmail === auth.currentUser.email);
      setMeetingRequests(data);
    });

    const unsub2 = onSnapshot(
      collection(db, "confirmedMeeting"),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((meeting) => meeting.mentorEmail === auth.currentUser.email);
        setUpcomingMeetings(data);
      }
    );

    return () => {
      unsub();
      unsub2();
    };
  }, []);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handleMeetingRequestAccept = () => {
    // Handle accepting the meeting request
  };

  return (
    <div>
      {/* Top body div with bottons to switch between upcoming and past meetings*/}
      <div className="mentor-home-container">
        {/* <img className="calendar-logo" src={calendar} alt="Calendar Logo" /> */}
        <div className="mentor-home-header">
          <CalendarClock strokeWidth="1" size={32} />
          <h1>Meetings</h1>
        </div>
        <div className="mentor-home-body">
          <button
            className={`upcoming-meetings ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => handleTabClick("upcoming")}
          >
            <h2 className="mentor-h2">Upcoming Meetings</h2>
          </button>
          <div className="divider">
            <h2>|</h2>
          </div>
          <button
            className={`past-meetings ${activeTab === "past" ? "active" : ""}`}
            onClick={() => handleTabClick("past")}
          >
            <h2 className="mentor-h2">Past Meetings</h2>
          </button>
        </div>
      </div>

      {/* For now lets just do upcoming meetings. Will add history later */}
      {activeTab === "upcoming" && (
        <div className="upcoming-meetings-container">
          {/* Requests */}

          <div className="section">
            <h2>Meetings Requests</h2>
            <div className="meeting-card">
              {meetingRequests.length === 0 && (
                <Typography>No pending meetings.</Typography>
              )}
              {meetingRequests.map((request) => (
                <div key={request.id} className="meeting-card">
                  {request.status === "pending" &&
                    request.menteeApproved === true && (
                      <div className="meeting-card-content">
                        <p className="mentee-info">
                          Mentee Name: {request.menteeName}
                        </p>
                        <p className="mentee-info">
                          Mentee Email: {request.menteeEmail}
                        </p>
                        <p className="mentee-info">
                          Meeting Date: {request.meetingDate}
                        </p>
                        <p className="mentee-info">
                          Meeting Time: {request.meetingTime}
                        </p>
                        <div className="card-actions">
                          <button className="accept-btn">Accept</button>
                          <button
                            className="reschedule-btn"
                            onClick={() => setActiveScheduleId(request.id)}
                          >
                            Reschedule
                          </button>
                          {activeScheduleId === request.id && (
                            <div
                              className="popup-overlay"
                              onClick={() => setActiveScheduleId(null)}
                            >
                              <div
                                className="popup-content"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="close-btn"
                                  onClick={() => setActiveScheduleId(null)}
                                >
                                  Close
                                </button>

                                <ScheduleMeeting
                                  meetingID={request.id}
                                  senderID={auth.currentUser.uid}
                                  targetID={request.menteeId}
                                  senderIsMentor={true}
                                  service={request.service}
                                  isRescheduling={true}
                                  menteeEmail={request.menteeEmail}
                                  mentorEmail={request.mentorEmail}
                                  menteeName={request.menteeName}
                                  mentorName={request.mentorName}
                                  menteeID={request.menteeId}
                                  mentorID={request.mentorId}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {request.status === "pending" &&
                    request.menteeApproved === false && (
                      <div className="outgoing-request-card">
                        <p>Waiting for Mentee confirmation</p>
                        <div className="meeting-card-content">
                          <p className="mentee-info">
                            Mentee Name: {request.menteeName}
                          </p>
                          <p className="mentee-info">
                            Mentee Email: {request.menteeEmail}
                          </p>
                          <p className="mentee-info">
                            Meeting Date: {request.meetingDate}
                          </p>
                          <p className="mentee-info">
                            Meeting Time: {request.meetingTime}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="section">
            <h2>Confirmed Meetings</h2>
            <div className="meeting-card">
              {upcomingMeetings.length === 0 && (
                <Typography>No confirmed meetings.</Typography>
              )}
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="meeting-card">
                  <div className="meeting-card-content">
                    <p className="mentee-info">
                      Mentee Name: {meeting.menteeName}
                    </p>
                    <p className="mentee-info">
                      Mentee Email: {meeting.menteeEmail}
                    </p>
                    <p className="mentee-info">
                      Meeting Date: {meeting.meetingDate}
                    </p>
                    <p className="mentee-info">
                      Meeting Time: {meeting.meetingTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {activeTab === "past" && (
        <div className="past-meetings-container">Past Meetings</div>
      )}
    </div>
  );
}

export default MentorHome;
