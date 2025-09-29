require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const fetch = require("node-fetch");

const app = express();
app.use(cors());

// Email sending is now handled client-side using EmailJS V2

// Initialize Firebase Admin SDK
const serviceAccount = require("./ummahprof-55270-firebase-adminsdk-fbsvc-472c1e3eca.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Import meeting status manager after Firebase is initialized
const {
  moveExpiredMeetings,
  getMeetingsWithStatus,
} = require("./meetingStatusManager");

// Import meeting approval handler functions
const {
  handleMenteeApproval,
  handleMentorApproval,
  handleMeetingProposal,
  finalizeMeeting,
  generateGoogleMeetLink,
} = require("./meetingApprovalHandler");

// Accept JSON
app.use(express.json());

// Get all approved mentors
app.get("/api/mentors", async (req, res) => {
  try {
    const mentorsSnapshot = await db
      .collection("mentors")
      .where("status", "==", "approved")
      .get();

    const mentors = [];
    mentorsSnapshot.forEach((docSnap) => {
      const mentorData = { id: docSnap.id, ...docSnap.data() };

      // Convert old availability format to new grouped format if needed
      if (mentorData.availability && Array.isArray(mentorData.availability)) {
        const newAvailability = {};
        mentorData.availability.forEach((slot) => {
          const [day, time] = slot.split("-");
          if (!newAvailability[day]) newAvailability[day] = [];
          newAvailability[day].push(time);
        });
        mentorData.availability = newAvailability;
      } else if (
        mentorData.availability &&
        typeof mentorData.availability === "object" &&
        !Array.isArray(mentorData.availability)
      ) {
        Object.keys(mentorData.availability).forEach((day) => {
          if (!Array.isArray(mentorData.availability[day])) {
            mentorData.availability[day] = [mentorData.availability[day]];
          }
        });
      }

      // Normalize day names to Title Case
      if (mentorData.availability) {
        const normalized = {};
        Object.keys(mentorData.availability).forEach((day) => {
          const normalizedDay =
            day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
          normalized[normalizedDay] = mentorData.availability[day];
        });
        mentorData.availability = normalized;
      }

      mentors.push(mentorData);
    });

    res.json({ success: true, mentors });
  } catch (err) {
    console.error("Mentors API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get mentor by id (no status filter) with normalized availability
app.get("/api/mentors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docSnap = await db.collection("mentors").doc(id).get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Mentor not found" });
    }

    const mentorData = { id: docSnap.id, ...docSnap.data() };

    if (mentorData.availability && Array.isArray(mentorData.availability)) {
      const newAvailability = {};
      mentorData.availability.forEach((slot) => {
        const [day, time] = slot.split("-");
        if (!newAvailability[day]) newAvailability[day] = [];
        newAvailability[day].push(time);
      });
      mentorData.availability = newAvailability;
    } else if (
      mentorData.availability &&
      typeof mentorData.availability === "object" &&
      !Array.isArray(mentorData.availability)
    ) {
      Object.keys(mentorData.availability).forEach((day) => {
        if (!Array.isArray(mentorData.availability[day])) {
          mentorData.availability[day] = [mentorData.availability[day]];
        }
      });
    }

    // If still no availability, provide a sensible default so UI can function
    if (!mentorData.availability) {
      mentorData.availability = {
        Monday: ["11am-12pm", "2pm-3pm"],
        Tuesday: ["10am-11am", "3pm-4pm"],
        Wednesday: ["1pm-2pm", "4pm-5pm"],
        Thursday: ["9am-10am", "2pm-3pm"],
        Friday: ["11am-12pm", "3pm-4pm"],
        Saturday: ["10am-11am", "1pm-2pm"],
        Sunday: ["2pm-3pm", "4pm-5pm"],
      };
    }

    if (mentorData.availability) {
      const normalized = {};
      Object.keys(mentorData.availability).forEach((day) => {
        const normalizedDay =
          day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
        normalized[normalizedDay] = mentorData.availability[day];
      });
      mentorData.availability = normalized;
    }

    return res.json({ success: true, mentor: mentorData });
  } catch (err) {
    console.error("Mentor by id API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all meetings (pending, confirmed, and done) for a mentee
app.get("/api/meetings/mentee/:menteeId", async (req, res) => {
  try {
    const { menteeId } = req.params;

    // First, move any expired meetings
    await moveExpiredMeetings();

    // Then get all meetings with updated status
    const result = await getMeetingsWithStatus(menteeId);

    if (result.success) {
      res.json({ success: true, meetings: result.meetings });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("Get meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get confirmed meetings for a mentee
app.get("/api/meetings/confirmed/:menteeId", async (req, res) => {
  try {
    const { menteeId } = req.params;
    const meetingsSnapshot = await db
      .collection("confirmedMeeting")
      .where("menteeId", "==", menteeId)
      .get();

    const meetings = [];
    meetingsSnapshot.forEach((doc) => {
      meetings.push({ id: doc.id, ...doc.data() });
    });

    // Sort by confirmedAt on the server side
    meetings.sort((a, b) => {
      const dateA = a.confirmedAt
        ? new Date(a.confirmedAt.seconds * 1000)
        : new Date(0);
      const dateB = b.confirmedAt
        ? new Date(b.confirmedAt.seconds * 1000)
        : new Date(0);
      return dateB - dateA; // Most recent first
    });

    res.json({ success: true, meetings });
  } catch (err) {
    console.error("Get confirmed meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new meeting
app.post("/api/meetings", async (req, res) => {
  try {
    const meetingData = req.body;

    // Add meeting to Firestore
    const meetingRef = await db.collection("pendingMeetings").add({
      ...meetingData,
      createdAt: new Date(),
    });

    // Email notifications are handled by the frontend using EmailJS
    // The meeting has been successfully created in the database

    res.json({
      success: true,
      meetingId: meetingRef.id,
    });
  } catch (err) {
    console.error("Meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mentee accepts a mentor-proposed time
app.post("/api/meetings/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ menteeApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, menteeApproved: true };
    if (updatedMeeting.mentorApproved) {
      // Use imported function to finalize meeting
      const result = await finalizeMeeting(updatedMeeting, id);

      return res.json(result);
    }

    return res.json({ success: true, movedToConfirmed: false });
  } catch (err) {
    console.error("Accept meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mentee proposes a new time
app.post("/api/meetings/:id/propose", async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingDate, meetingTime } = req.body || {};
    if (!meetingDate || !meetingTime) {
      return res.status(400).json({
        success: false,
        error: "meetingDate and meetingTime are required",
      });
    }

    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    // Use imported function to handle meeting proposal
    const result = await handleMeetingProposal(id, meetingDate, meetingTime);

    return res.json(result);
  } catch (err) {
    console.error("Propose meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mentor approves a mentee-proposed time
app.post("/api/meetings/:id/mentor-approve", async (req, res) => {
  try {
    const { id } = req.params;
    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ mentorApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, mentorApproved: true };
    if (updatedMeeting.menteeApproved) {
      // Use imported function to finalize meeting
      const result = await finalizeMeeting(updatedMeeting, id);

      return res.json(result);
    }

    return res.json({ success: true, movedToConfirmed: false });
  } catch (err) {
    console.error("Mentor approve meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth functions are now imported from meetingApprovalHandler.js

// Get only past meetings from endMeeting collection
app.get("/api/meetings/mentee/:menteeId/past", async (req, res) => {
  try {
    const { menteeId } = req.params;

    // Get completed meetings from endMeeting collection
    const endMeetingsSnapshot = await db
      .collection("endMeeting")
      .where("menteeId", "==", menteeId)
      .get();

    const meetings = [];
    endMeetingsSnapshot.forEach((doc) => {
      meetings.push({
        id: doc.id,
        ...doc.data(),
        status: "done",
        collection: "endMeeting",
      });
    });

    // Sort by completion date (newest first)
    meetings.sort((a, b) => {
      const dateA = a.completedAt
        ? new Date(a.completedAt.seconds * 1000)
        : new Date(0);
      const dateB = b.completedAt
        ? new Date(b.completedAt.seconds * 1000)
        : new Date(0);
      return dateB - dateA; // Most recent first
    });

    res.json({ success: true, meetings });
  } catch (err) {
    console.error("Get past meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Manual endpoint to move expired meetings (for testing)
app.post("/api/meetings/move-expired", async (req, res) => {
  try {
    const result = await moveExpiredMeetings();
    res.json(result);
  } catch (err) {
    console.error("Move expired meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to check date parsing (for debugging)
app.post("/api/meetings/test-date-parsing", async (req, res) => {
  try {
    const { meetingDate, meetingTime } = req.body;
    const { isMeetingEnded } = require("./meetingStatusManager");

    const result = isMeetingEnded(meetingDate, meetingTime);
    res.json({
      success: true,
      meetingDate,
      meetingTime,
      isEnded: result,
    });
  } catch (error) {
    console.error("Error testing date parsing:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// was port 3003 before
app.listen(4000, () =>
  console.log("Userportal backend server running on port 4000")
);
