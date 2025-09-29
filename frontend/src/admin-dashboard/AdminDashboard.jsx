import React, { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import app from "../firebase";
import emailjs from "emailjs-com";
import { formatDate } from "@fullcalendar/core";

const db = getFirestore(app);

emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);

const AdminDashboard = () => {
  const [pendingMentors, setPendingMentors] = useState([]);
  const [confirmedMeeting, setConfirmedMeeting] = useState([]);

  useEffect(() => {
    const fixMissingStatusFields = async () => {
      const querySnapshot = await getDocs(collection(db, "pendingMentors"));
      const updates = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (!data.status) {
          const docRef = doc(db, "pendingMentors", docSnap.id);
          await updateDoc(docRef, { status: "pending" });
        }
      });
      await Promise.all(updates);
    };

    fixMissingStatusFields();

    const unsub = onSnapshot(collection(db, "pendingMentors"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((pendingMentor) => pendingMentor.status === "pending");
      setPendingMentors(data);
    });

    return () => unsub();
  }, []);

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

      setConfirmedMeeting(events);
    });

    return () => unsub();
  }, []);

  const handleApprove = async (mentor) => {
    const dbId = mentor.id;
    const signupLink = `${window.location.origin}/create-password?dbId=${dbId}&email=${mentor.email}`;

    const emailParams = {
      to_email: mentor.email,
      mentor_name: mentor.name || "Mentor",
      signup_link: signupLink,
    };

    try {
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        emailParams
      );

      await updateDoc(doc(db, "pendingMentors", mentor.id), {
        status: "approved",
      });

      alert(`Approved & sent link to ${mentor.email}`);
    } catch (error) {
      console.error(error);
      alert(`Failed to send email: ${error?.text || error?.message || error}`);
    }
  };

  const handleDeny = async (user) => {
    try {
      await deleteDoc(doc(db, "pendingMentors", user.id));
      alert(`Denied user: ${user.name}`);
    } catch (err) {
      console.error(err);
      alert("Failed to deny user");
    }
  };

  return (
    <Box sx={{ px: 4, py: 4, backgroundColor: "#E8F0FA", minHeight: "100vh" }}>
      <Box sx={{ mt: 4, mx: "auto", maxWidth: 600 }}>
        <Typography variant="h4" gutterBottom sx={{ color: "black" }}>
          Pending Mentor Approvals
        </Typography>
        {pendingMentors.length === 0 && (
          <Typography sx={{ color: "black" }}>No pending users.</Typography>
        )}
        {pendingMentors.map((user) => (
          <Box
            key={user.id}
            sx={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#E8F0FA",
              border: "2px solid #03527C",
              borderRadius: "20px",
              padding: 2,
              width: "100%",
              color: "black",
              mb: 2,
            }}
          >
            <Typography>Name: {user.name}</Typography>
            <Typography>Email: {user.email}</Typography>
            <Typography>
              University: {user.university}, Years of Experience: {user.yearsOfExperience}
            </Typography>
            <Typography>Industry: {user.industry}</Typography>
            <Typography>Skills: {user.skills}</Typography>
            <Typography>
              Resume:{" "}
              <a href={user.resumeURL} target="_blank" rel="noreferrer">
                View Resume
              </a>
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApprove(user)}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleDeny(user)}
              >
                Deny
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Events Box */}
      <Box mt={6} sx={{ maxWidth: 600, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#E8F0FA",
            border: "2px solid #03527C",
            borderRadius: "20px",
            padding: 2,
            width: "100%",
            color: "black",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2, color: "black" }}>
            Meetings
          </Typography>
          {confirmedMeeting.length === 0 && (
            <Typography sx={{ color: "black" }}>No upcoming meetings.</Typography>
          )}
          {confirmedMeeting.map((event) => (
            <Box
              key={event.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                padding: 1,
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
      </Box>
    </Box>
  );
};

export default AdminDashboard;
