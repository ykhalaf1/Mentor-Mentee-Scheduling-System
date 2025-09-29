// got this from forms/backend
const { google } = require("googleapis");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Initialize Google Calendar API with OAuth
const { google } = require("googleapis");

// Google OAuth Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3001/auth/google/callback"
);

// Function to get OAuth token for a user
async function getOAuthToken(userId) {
  try {
    console.log("Looking for OAuth token for userId:", userId);

    // First try to get by userId
    let doc = await db.collection("mentees").doc(userId).get();
    console.log("Direct lookup result:", doc.exists ? "Found" : "Not found");

    // If not found and userId looks like an email, try by email
    if (!doc.exists && userId.includes("@")) {
      console.log("Trying email lookup for:", userId);
      const emailQuery = await db
        .collection("mentees")
        .where("email", "==", userId)
        .get();
      console.log("Email query results:", emailQuery.size);
      if (!emailQuery.empty) {
        doc = emailQuery.docs[0];
        console.log("Found by email, doc ID:", doc.id);
      }
    }

    // If still not found, try to find by email in the meeting data
    if (!doc.exists) {
      console.log("Trying to find user by email from meeting data...");
      // Get all mentees and find by email
      const allMentees = await db.collection("mentees").get();
      for (const menteeDoc of allMentees.docs) {
        const menteeData = menteeDoc.data();
        if (menteeData.email === userId) {
          doc = menteeDoc;
          console.log("Found by email in all mentees, doc ID:", doc.id);
          break;
        }
      }
    }

    if (!doc.exists) {
      throw new Error(`User not found for ID: ${userId}`);
    }

    const userData = doc.data();
    console.log("User data keys:", Object.keys(userData));
    console.log("Has googleOAuth:", !!userData.googleOAuth);

    if (!userData.googleOAuth) {
      throw new Error(`No OAuth tokens found for user: ${userId}`);
    }

    console.log("OAuth token found, expiry:", userData.googleOAuth.expiry_date);
    return userData.googleOAuth;
  } catch (error) {
    console.error("Error getting OAuth token:", error);
    throw error;
  }
}

// Function to refresh OAuth token
async function refreshOAuthToken(userId, refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update the token in the database
    await db.collection("mentees").doc(userId).update({
      "googleOAuth.access_token": credentials.access_token,
      "googleOAuth.expiry_date": credentials.expiry_date,
    });

    return credentials;
  } catch (error) {
    console.error("Error refreshing OAuth token:", error);
    throw error;
  }
}
const db = admin.firestore();

// Create a calendar event for a user
async function createCalendarEvent(
  userId,
  meetingData,
  includeMeetLink = false
) {
  console.log(
    `Creating calendar event for user: ${userId}, includeMeetLink: ${includeMeetLink}`
  );
  console.log("Meeting data received:", {
    meetingDate: meetingData.meetingDate,
    meetingTime: meetingData.meetingTime,
    menteeName: meetingData.menteeName,
    mentorName: meetingData.mentorName,
    menteeEmail: meetingData.menteeEmail,
    mentorEmail: meetingData.mentorEmail,
  });

  try {
    // Get OAuth token for the user
    let userToken;
    try {
      userToken = await getOAuthToken(userId);
    } catch (error) {
      console.log(`Failed to get token by ID ${userId}, trying by email...`);
      // Try to find user by email
      const allMentees = await db.collection("mentees").get();
      for (const menteeDoc of allMentees.docs) {
        const menteeData = menteeDoc.data();
        if (menteeData.email === userId) {
          userToken = await getOAuthToken(menteeDoc.id);
          break;
        }
      }
      if (!userToken) {
        throw new Error(`No OAuth token found for user: ${userId}`);
      }
    }

    // Check if token is expired and refresh if needed
    const now = Date.now();
    if (userToken.expiry_date && now > userToken.expiry_date) {
      await refreshOAuthToken(userId, userToken.refresh_token);
    }

    // Set OAuth credentials
    oauth2Client.setCredentials({
      access_token: userToken.access_token,
      refresh_token: userToken.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Parse meeting date and time
    const meetingDate = new Date(meetingData.meetingDate);

    // Safety check for meeting time
    if (!meetingData.meetingTime) {
      throw new Error("Meeting time is missing from meeting data");
    }

    let startTime, endTime;

    // Check if it's a time range (contains dash) or single time
    if (meetingData.meetingTime.includes("-")) {
      // Time range format: "1:00 PM - 2:00 PM"
      [startTime, endTime] = meetingData.meetingTime
        .split("-")
        .map((t) => t.trim());
    } else {
      // Single time format: "1:00 PM" - create 1 hour duration
      startTime = meetingData.meetingTime.trim();
      // Calculate end time (1 hour later)
      const timeMatch = startTime.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const period = timeMatch[3].toLowerCase();

        // Add 1 hour
        hour += 1;
        if (hour > 12) {
          hour = 1;
          // Keep same period for now (simplified)
        }

        endTime = `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
      } else {
        throw new Error(
          'Invalid time format. Expected format: "1:00 PM" or "1:00 PM - 2:00 PM"'
        );
      }
    }

    console.log("Parsed times:", { startTime, endTime });

    // Helper function to parse time to 24-hour format
    function parseTimeTo24Hour(timeStr) {
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (!timeMatch) {
        throw new Error(`Invalid time format: ${timeStr}`);
      }

      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toLowerCase();

      // Convert to 24-hour format
      if (period === "pm" && hour !== 12) {
        hour += 12;
      } else if (period === "am" && hour === 12) {
        hour = 0;
      }

      return { hour, minute };
    }

    // Create start and end times
    const startDateTime = new Date(meetingDate);
    const startTime24 = parseTimeTo24Hour(startTime);
    startDateTime.setHours(startTime24.hour, startTime24.minute, 0, 0);

    const endDateTime = new Date(meetingDate);
    const endTime24 = parseTimeTo24Hour(endTime);
    endDateTime.setHours(endTime24.hour, endTime24.minute, 0, 0);

    // If end time is before start time, it means the meeting goes into the next day
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    // Create calendar event
    const event = {
      summary: `Mentoring Session: ${meetingData.menteeName} & ${meetingData.mentorName}`,
      description: `Mentoring session between ${meetingData.menteeName} and ${meetingData.mentorName}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        { email: meetingData.menteeEmail },
        { email: meetingData.mentorEmail },
      ],
    };

    // Add Google Meet if requested
    if (includeMeetLink) {
      event.conferenceData = {
        createRequest: {
          requestId: `meeting-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      };
    }

    console.log(`Creating calendar event for ${userId}:`, event);

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: includeMeetLink ? 1 : 0,
    });

    console.log(
      `Calendar event created successfully for ${userId}:`,
      response.data
    );

    return {
      eventId: response.data.id,
      meetLink: response.data.hangoutLink || null,
    };
  } catch (error) {
    console.error(`Error creating calendar event for ${userId}:`, error);
    throw error;
  }
}

// Generate a Google Meet link using Google Calendar API with OAuth
async function generateGoogleMeetLink(meetingData) {
  console.log("generateGoogleMeetLink called with:", meetingData);
  console.log("Meeting data keys:", Object.keys(meetingData));
  console.log("Mentor ID:", meetingData.mentorId);
  console.log("Mentor Email:", meetingData.mentorEmail);
  console.log("Mentee ID:", meetingData.menteeId);
  console.log("Mentee Email:", meetingData.menteeEmail);
  console.log("Meeting Date:", meetingData.meetingDate);
  console.log("Meeting Time:", meetingData.meetingTime);

  try {
    let meetLink = null;

    // First try to create event in mentor's calendar with Meet link (mentor as host)
    try {
      console.log("Creating event in mentor calendar with Meet link...");
      const mentorResult = await createCalendarEvent(
        meetingData.mentorId,
        meetingData,
        true
      );
      console.log("Meet link from mentor calendar:", mentorResult.meetLink);
      meetLink = mentorResult.meetLink;
    } catch (mentorError) {
      console.error(
        "Failed to create event in mentor calendar by ID:",
        mentorError
      );
      console.error("Error details:", mentorError.message);

      // Try by email if ID failed
      try {
        console.log("Trying mentor by email...");
        const mentorResult = await createCalendarEvent(
          meetingData.mentorEmail,
          meetingData,
          true
        );
        console.log(
          "Meet link from mentor calendar (by email):",
          mentorResult.meetLink
        );
        meetLink = mentorResult.meetLink;
      } catch (emailError) {
        console.error(
          "Failed to create event in mentor calendar by email:",
          emailError
        );
        console.error("Email error details:", emailError.message);
      }
    }

    // If mentor OAuth failed, try mentee's OAuth as fallback
    if (!meetLink) {
      try {
        console.log(
          "Creating event in mentee calendar with Meet link (fallback)..."
        );
        const menteeResult = await createCalendarEvent(
          meetingData.menteeId,
          meetingData,
          true
        );
        console.log("Meet link from mentee calendar:", menteeResult.meetLink);
        meetLink = menteeResult.meetLink;
      } catch (menteeError) {
        console.error(
          "Failed to create event in mentee calendar by ID:",
          menteeError
        );
        console.error("Error details:", menteeError.message);

        // Try by email if ID failed
        try {
          console.log("Trying mentee by email...");
          const menteeResult = await createCalendarEvent(
            meetingData.menteeEmail,
            meetingData,
            true
          );
          console.log(
            "Meet link from mentee calendar (by email):",
            menteeResult.meetLink
          );
          meetLink = menteeResult.meetLink;
        } catch (emailError) {
          console.error(
            "Failed to create event in mentee calendar by email:",
            emailError
          );
          console.error("Email error details:", emailError.message);
        }
      }
    }

    // If we got a meet link, also try to create calendar events for both parties
    if (meetLink) {
      // Try to create calendar event for mentee (without Meet link to avoid conflicts)
      try {
        console.log("Creating calendar event for mentee...");
        await createCalendarEvent(meetingData.menteeId, meetingData, false);
        console.log("Calendar event created for mentee");
      } catch (menteeError) {
        console.error(
          "Failed to create calendar event for mentee:",
          menteeError
        );
        // Try by email
        try {
          await createCalendarEvent(
            meetingData.menteeEmail,
            meetingData,
            false
          );
          console.log("Calendar event created for mentee (by email)");
        } catch (emailError) {
          console.error(
            "Failed to create calendar event for mentee by email:",
            emailError
          );
        }
      }
    }

    if (meetLink) {
      return meetLink;
    } else {
      // Fallback to simple link generation if OAuth fails
      const meetingId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const fallbackLink = `https://meet.google.com/${meetingId}`;
      console.log("Using fallback meet link:", fallbackLink);
      return fallbackLink;
    }
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    console.error("Final error details:", error.message);
    // Fallback to simple link generation if OAuth fails
    const meetingId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const fallbackLink = `https://meet.google.com/${meetingId}`;
    console.log("Using fallback meet link:", fallbackLink);
    return fallbackLink;
  }
}

// Send confirmation emails with Google Meet link
async function sendConfirmedMeetingEmails(meetingData, meetLink) {
  console.log("sendConfirmedMeetingEmails called with:", {
    meetingData,
    meetLink,
  });

  const common = {
    meeting_date: meetingData.meetingDate,
    meeting_time: meetingData.meetingTime,
    meet_link: meetLink,
    mentor_name: meetingData.mentorName,
    mentee_name: meetingData.menteeName,
  };

  console.log("Common template params:", common);
  console.log("Template ID:", process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED);

  // Send email to mentee
  console.log("Sending email to mentee:", meetingData.menteeEmail);
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED, {
    to_email: meetingData.menteeEmail,
    to_name: meetingData.menteeName,
    ...common,
  });

  // Send email to mentor
  console.log("Sending email to mentor:", meetingData.mentorEmail);
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED, {
    to_email: meetingData.mentorEmail,
    to_name: meetingData.mentorName,
    ...common,
  });
}

// ---------------- EmailJS V2 (server-side) -----------------
async function sendEmailJSV2(templateId, templateParams) {
  console.log("sendEmailJSV2 called with:", { templateId, templateParams });

  const payload = {
    service_id: process.env.EMAILJSV2_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJSV2_PUBLIC_KEY, // public key
    accessToken: process.env.EMAILJSV2_PRIVATE_KEY, // private key
    template_params: templateParams,
  };

  console.log("EmailJS V2 payload:", payload);

  if (
    !payload.service_id ||
    !payload.template_id ||
    !payload.user_id ||
    !payload.accessToken
  ) {
    console.error("Missing EmailJS V2 env configuration:", {
      service_id: !!payload.service_id,
      template_id: !!payload.template_id,
      user_id: !!payload.user_id,
      accessToken: !!payload.accessToken,
    });
    throw new Error("Missing EmailJS V2 env configuration");
  }

  console.log("Making EmailJS V2 API request...");
  const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("EmailJS V2 response status:", resp.status);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("EmailJS V2 error response:", txt);
    throw new Error(`EmailJS V2 request failed: ${resp.status} ${txt}`);
  }

  console.log("EmailJS V2 request successful");
}

// Handle mentee approval
async function handleMenteeApproval(meetingId) {
  try {
    const meetingRef = db.collection("pendingMeetings").doc(meetingId);
    const meetingSnap = await meetingRef.get();

    if (!meetingSnap.exists) {
      throw new Error("Meeting not found");
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ menteeApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, menteeApproved: true };

    if (updatedMeeting.mentorApproved) {
      return await finalizeMeeting(updatedMeeting, meetingId);
    }

    return { success: true, movedToConfirmed: false };
  } catch (error) {
    console.error("Mentee approval error:", error);
    throw error;
  }
}

// Handle mentor approval
async function handleMentorApproval(meetingId) {
  try {
    const meetingRef = db.collection("pendingMeetings").doc(meetingId);
    const meetingSnap = await meetingRef.get();

    if (!meetingSnap.exists) {
      throw new Error("Meeting not found");
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ mentorApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, mentorApproved: true };

    if (updatedMeeting.menteeApproved) {
      return await finalizeMeeting(updatedMeeting, meetingId);
    }

    return { success: true, movedToConfirmed: false };
  } catch (error) {
    console.error("Mentor approval error:", error);
    throw error;
  }
}

// Finalize meeting when both parties approve
async function finalizeMeeting(meetingData, meetingId) {
  try {
    // Generate Google Meet link
    const meetLink = await generateGoogleMeetLink(meetingData);

    // Move to confirmedMeeting with meet link
    await db.collection("confirmedMeeting").add({
      ...meetingData,
      status: "confirmed",
      confirmedAt: new Date(),
      meetLink: meetLink,
    });

    // Send confirmation emails with meet link
    try {
      await sendConfirmedMeetingEmails(meetingData, meetLink);
      console.log(
        "Confirmation emails sent with meet link for meeting:",
        meetingId
      );
    } catch (e) {
      console.warn("Failed to send confirmation emails:", e.message);
    }

    // Delete from pending meetings
    await db.collection("pendingMeetings").doc(meetingId).delete();

    return {
      success: true,
      movedToConfirmed: true,
      meetLink: meetLink,
      meetingData: meetingData,
    };
  } catch (error) {
    console.error("Finalize meeting error:", error);
    throw error;
  }
}

// Handle meeting proposal (mentee proposes new time)
async function handleMeetingProposal(meetingId, meetingDate, meetingTime) {
  try {
    const meetingRef = db.collection("pendingMeetings").doc(meetingId);
    const meetingSnap = await meetingRef.get();

    if (!meetingSnap.exists) {
      throw new Error("Meeting not found");
    }

    await meetingRef.update({
      meetingDate,
      meetingTime,
      menteeApproved: true,
      mentorApproved: false,
      status: "pending",
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Meeting proposal error:", error);
    throw error;
  }
}

module.exports = {
  handleMenteeApproval,
  handleMentorApproval,
  handleMeetingProposal,
  finalizeMeeting,
  generateGoogleMeetLink,
  sendConfirmedMeetingEmails,
};
