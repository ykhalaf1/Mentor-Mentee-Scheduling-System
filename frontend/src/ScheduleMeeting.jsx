import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import "./scheduleMeeting.css";
import { set, update } from "firebase/database";
import { db } from "./firebase";
import { getDoc, doc, addDoc, updateDoc, collection } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { send } from "emailjs-com";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
];

function ScheduleMeeting({
  meetingID,
  senderID,
  targetID,
  senderIsMentor,
  service,
  isRescheduling,
  menteeEmail,
  mentorEmail,
  menteeName,
  mentorName,
  menteeID,
  mentorID,
  updateCounter,
}) {
  // senderID is the ID of the user scheduling the meeting
  // targetID is the ID of the person to schedule the meeting with
  // meetingID is the document ID on the pendingMeetings collection, used for updating the meeting only if it already exists
  // Mentee should select the service they want to meet for as well
  const date = new Date();
  const currentDay = date.getDay();
  const [startOfWeek, setStartOfWeek] = useState(
    new Date(date.getFullYear(), date.getMonth(), date.getDate() - currentDay)
  );
  const endOfWeek = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + (7 - currentDay)
  );
  const [weekTracker, setWeekTracker] = useState(0);
  const initialWeek = [];
  const [availability, setAvailability] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Generate dates for the week
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(startOfWeek);
    weekDate.setDate(startOfWeek.getDate() + i);
    initialWeek.push(weekDate);
  }

  const [weekDates, setWeekDates] = useState(initialWeek);

  const handleNextWeek = () => {
    setWeekTracker(weekTracker + 1);

    setStartOfWeek(new Date(startOfWeek.setDate(startOfWeek.getDate() + 7)));
    const newWeek = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      newWeek.push(weekDate);
    }
    setWeekDates(newWeek);
  };

  const handlePrevWeek = () => {
    setWeekTracker(weekTracker - 1);

    setStartOfWeek(new Date(startOfWeek.setDate(startOfWeek.getDate() - 7)));
    const newWeek = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      newWeek.push(weekDate);
    }
    setWeekDates(newWeek);
  };

  const handleAvailability = async () => {
    if (senderIsMentor === false && targetID) {
      await getDoc(doc(db, "mentors", targetID)).then((docSnap) => {
        if (docSnap.exists()) {
          setAvailability(docSnap.data().generalAvailability);
        }
      });
    } else if (senderIsMentor === true && targetID) {
      await getDoc(doc(db, "mentees", targetID)).then((docSnap) => {
        if (docSnap.exists()) {
          setAvailability(docSnap.data().generalAvailability);
        }
      });
    } else {
      alert("Error: No user found");
    }
  };

  useEffect(() => {
    handleAvailability();
  }, [targetID]);
  const handleDayClick = (date, dayName) => {
    setAvailableTimes(availability[dayName]);
    setSelectedDay(date.toString().substring(4, 15));
    console.log("Selected day:", selectedDay);
    setSelectedTime(null);
  };

  function formatTimeSlot(timeSlot) {
    const [startTime, endTime] = timeSlot.split("-");

    const formatTime = (time) => {
      const hour = parseInt(time);
      const period = time.toLowerCase().includes("pm") ? "PM" : "AM";
      const formattedHour = hour === 12 ? 12 : hour % 12;
      return `${formattedHour}:00 ${period}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  const handleSendMeetingRequest = async () => {
    if (!updateCounter) {
      updateCounter = 0;
    }
    if (!selectedDay || !selectedTime) {
      alert("Please select a day and time");
      return;
    }
    const menteeApproved = senderIsMentor ? false : true;
    const mentorApproved = senderIsMentor ? true : false;
    const formattedTime = formatTimeSlot(selectedTime);
    if (isRescheduling) {
      await updateDoc(doc(db, "pendingMeetings", meetingID), {
        menteeApproved: menteeApproved,
        mentorApproved: mentorApproved,
        meetingTime: formattedTime,
        meetingDate: selectedDay,
        updateCounter: updateCounter + 1,
      });
      alert("Meeting rescheduled");
    } else {
      await addDoc(collection(db, "pendingMeetings"), {
        createdAt: serverTimestamp(),
        meetingTime: formattedTime,
        meetingDate: selectedDay,
        menteeApproved: true,
        mentorApproved: false,
        menteeEmail: menteeEmail,
        mentorEmail: mentorEmail,
        service: service,
        MenteeName: menteeName,
        MentorName: mentorName,
        menteeID: menteeID,
        mentorID: mentorID,
      });
      alert("Meeting scheduled");
    }
  };

  const isDayDisabled = (date, dayName) => {
    // Past date check
    if (date < new Date()) return true;

    // Not in availability object
    if (!availability[dayName]?.length) return true;

    return false;
  };

  if (updateCounter >= 0 && senderIsMentor) {
    return (
      <div className="deffer">
        <span>Can't find a time that works for you?</span>
        <button>Deffer</button>
      </div>
    );
  }

  return (
    <div>
      <div className="schedule-meeting">
        <div className="control-week">
          {weekTracker > 0 && (
            <button onClick={handlePrevWeek}>Previous Week</button>
          )}
          <span>Week of {startOfWeek.toString().substring(4, 11)}</span>
          {weekTracker < 2 && (
            <button onClick={handleNextWeek}>Next Week</button>
          )}
        </div>
        <table className="week-view">
          <thead>
            <tr>
              {days.map((day) => (
                <th key={day}>{day.substring(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {weekDates.map((date, index) => {
                const dayName = days[date.getDay()];
                const isSelected =
                  selectedDay === date.toString().substring(4, 11);

                return (
                  <td key={index}>
                    <button
                      className={`date-button ${isSelected ? "selected" : ""}`}
                      disabled={isDayDisabled(date, dayName)}
                      onClick={() => handleDayClick(date, dayName)}
                    >
                      {date.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* After day is selected */}
      {availableTimes.length > 0 && (
        <div className="available-times">
          <span>Available times:</span>
          <ul>
            {availableTimes.map((time, index) => (
              <li key={index}>
                <button
                  className={selectedTime === time ? "selected" : ""}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* After time is selected */}
      {selectedTime && (
        <div className="selected-time">
          <span>
            Selected day: {selectedDay} at: {selectedTime}
          </span>
          <button
            className="send-meeting-btn"
            onClick={handleSendMeetingRequest}
          >
            Send meeting request
          </button>
        </div>
      )}
    </div>
  );
}

export default ScheduleMeeting;
