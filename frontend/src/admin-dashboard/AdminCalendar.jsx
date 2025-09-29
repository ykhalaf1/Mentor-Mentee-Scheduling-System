import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import { formatDate } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { Box, Typography } from "@mui/material";
import Header from "./Header";

import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import app from "../firebase";

const db = getFirestore(app);

const Calendar = () => {
  const [currentEvents, setCurrentEvents] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pendingMeetings"), (snapshot) => {
      const events = snapshot.docs.map((doc) => {
        const data = doc.data();
        let startDate = null;

        if (data.meetingDate) {
          const dateObj = new Date(data.meetingDate);
          if (data.meetingTime) {
            const [time, modifier] = data.meetingTime.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;
            dateObj.setHours(hours, minutes, 0, 0);
          }
          startDate = dateObj;
        }

        return {
          id: doc.id,
          title: `${data.menteeName || "Mentee"} & ${data.mentorName || "Mentor"}`,
          start: startDate,
          allDay: !data.meetingTime,
        };
      });
      setCurrentEvents(events);
    });

    return () => unsub();
  }, []);

  const handleDateClick = (selected) => {
    const title = prompt("Enter a new title for the event");
    const calendarApi = selected.view.calendar;
    calendarApi.unselect();

    if (title) {
      calendarApi.addEvent({
        id: `${selected.dateStr}-${title}`,
        title,
        start: selected.startStr,
        allDay: selected.allDay,
      });
    }
  };

  const handleEventClick = (selected) => {
    if (window.confirm(`Delete event '${selected.event.title}'?`)) {
      selected.event.remove();
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#E8F0FA", 
        minHeight: "100vh",
        width: "100%",
        color: "black",
        p: 2,
        "& *": { backgroundColor: "#E8F0FA", color: "black" }, 
      }}
    >
      <Header 
        title="Calendar"  
        subtitle={<span style={{ color: "#03527C" }}>Calendar and Events</span>} 
      />

      <Box display="flex" justifyContent="space-between">
        {/* EVENTS SIDEBAR */}
        <Box
          flex="1 1 20%"
          sx={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#E8F0FA",
            border: "2px solid #03527C",
            borderRadius: "20px",
            p: 2,
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
            Meetings
          </Typography>
          {currentEvents.length === 0 && <Typography>No upcoming meetings.</Typography>}
          {currentEvents.map((event) => (
            <Box
              key={event.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 1,
                mb: 1,
                borderBottom: "1px solid #03527C",
              }}
            >
              <Typography sx={{ fontWeight: "bold" }}>{event.title}</Typography>
              <Typography>
                {formatDate(event.start, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: event.allDay ? undefined : "2-digit",
                  minute: event.allDay ? undefined : "2-digit",
                })}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* FULL CALENDAR */}
        <Box
          flex="1 1 100%"
          ml="15px"
          sx={{
            "& .fc": { backgroundColor: "#E8F0FA", color: "black" },
            "& .fc-toolbar-title": { color: "black" },
            "& .fc-col-header-cell-cushion": { color: "black" },
            "& .fc-event": { color: "black" },
            "& .fc-daygrid-day-number": { color: "black" },
            "& .fc .fc-button": {
              backgroundColor: "#E8F0FA",
              color: "#03527C",
              border: "2px solid #03527C",
              borderRadius: "20px",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#03527C",
                color: "#E8F0FA",
              },
            },
            "& .fc .fc-button.fc-button-active": {
              backgroundColor: "#03527C",
              color: "#E8F0FA",
              border: "2px solid #03527C",
              "&:hover": {
                backgroundColor: "#03527C",
                color: "#E8F0FA",
              },
            },
            "& .fc-scrollgrid": {
              border: "2px solid #03527C",
              borderRadius: "20px",
              backgroundColor: "#E8F0FA",
            },
          }}
        >
          <FullCalendar
            height="75vh"
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
            }}
            initialView="dayGridMonth"
            editable
            selectable
            selectMirror
            dayMaxEvents
            select={handleDateClick}
            eventClick={handleEventClick}
            events={currentEvents}
            eventBackgroundColor="#FFD700"
            eventBorderColor="#000000"
            eventTextColor="black"
            dayCellContent={(cellInfo) => (
              <span style={{ color: "black" }}>{cellInfo.dayNumberText}</span>
            )}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Calendar;
