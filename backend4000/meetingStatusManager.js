const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('./firebaseServiceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Function to check if a meeting has ended
function isMeetingEnded(meetingDate, meetingTime) {
  console.log('Checking if meeting ended:', { meetingDate, meetingTime });
  
  // Parse meeting date - handle different formats
  let meetingDateObj;
  
  // Handle different date formats
  if (meetingDate.includes(' ')) {
    // Format like "Sep 02" or "September 2"
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Try current year first
    meetingDateObj = new Date(`${meetingDate} ${currentYear}`);
    
    // If the date is in the past, try next year
    if (meetingDateObj < new Date()) {
      meetingDateObj = new Date(`${meetingDate} ${nextYear}`);
    }
  } else if (meetingDate.includes('-')) {
    // Format like "2025-09-02"
    meetingDateObj = new Date(meetingDate);
  } else {
    // Try parsing as full date
    meetingDateObj = new Date(meetingDate);
  }
  
  // Check if date parsing failed
  if (isNaN(meetingDateObj.getTime())) {
    console.log('Invalid meeting date format:', meetingDate);
    return false; // Don't move meetings with invalid dates
  }
  
  // Safety check: if the parsed date is more than 2 years in the future, 
  // it's likely a parsing error, so don't move the meeting
  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
  
  if (meetingDateObj > twoYearsFromNow) {
    console.log('Meeting date is too far in the future, likely a parsing error:', meetingDateObj);
    return false;
  }
  
  console.log('Parsed meeting date:', meetingDateObj);
  
  let endTime;
  
  // Parse meeting time to get end time
  if (meetingTime.includes('-')) {
    endTime = meetingTime.split('-')[1].trim();
  } else {
    // If single time, assume 1 hour duration
    const timeMatch = meetingTime.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toLowerCase();
      
      hour += 1;
      if (hour > 12) hour = 1;
      
      endTime = `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
  }
  
  // Create end datetime
  const endDateTime = new Date(meetingDateObj);
  const timeMatch = endTime.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const period = timeMatch[3].toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    endDateTime.setHours(hour, minute, 0, 0);
  }
  
  const now = new Date();
  const isEnded = now > endDateTime;
  
  console.log('Meeting end time:', endDateTime);
  console.log('Current time:', now);
  console.log('Meeting ended:', isEnded);
  
  return isEnded;
}

// Function to move expired meetings from confirmedMeeting to endMeeting
async function moveExpiredMeetings() {
  try {
    console.log('Checking for expired meetings...');
    
    // Get all confirmed meetings
    const confirmedMeetingsSnapshot = await db.collection('confirmedMeeting').get();
    const expiredMeetings = [];
    
    confirmedMeetingsSnapshot.forEach(doc => {
      const meetingData = doc.data();
      console.log(`Checking meeting ${doc.id}:`, {
        meetingDate: meetingData.meetingDate,
        meetingTime: meetingData.meetingTime,
        status: meetingData.status
      });
      
      if (isMeetingEnded(meetingData.meetingDate, meetingData.meetingTime)) {
        console.log(`Meeting ${doc.id} is expired, moving to endMeeting`);
        expiredMeetings.push({
          id: doc.id,
          data: {
            ...meetingData,
            status: 'done',
            completedAt: new Date()
          }
        });
      } else {
        console.log(`Meeting ${doc.id} is not expired yet`);
      }
    });
    
    console.log(`Found ${expiredMeetings.length} expired meetings`);
    
    // Move expired meetings to endMeeting collection
    for (const meeting of expiredMeetings) {
      try {
        // Add to endMeeting collection
        await db.collection('endMeeting').doc(meeting.id).set(meeting.data);
        
        // Remove from confirmedMeeting collection
        await db.collection('confirmedMeeting').doc(meeting.id).delete();
        
        console.log(`Moved meeting ${meeting.id} to endMeeting collection`);
      } catch (error) {
        console.error(`Error moving meeting ${meeting.id}:`, error);
      }
    }
    
    return { success: true, movedCount: expiredMeetings.length };
  } catch (error) {
    console.error('Error in moveExpiredMeetings:', error);
    return { success: false, error: error.message };
  }
}

// Function to get meetings with updated status (including done meetings)
async function getMeetingsWithStatus(menteeId) {
  try {
    const meetings = [];
    
    // Get pending meetings
    const pendingSnapshot = await db.collection('pendingMeetings')
      .where('menteeId', '==', menteeId)
      .get();
    
    pendingSnapshot.forEach(doc => {
      meetings.push({ 
        id: doc.id, 
        ...doc.data(), 
        status: 'pending',
        collection: 'pendingMeetings'
      });
    });
    
    // Get confirmed meetings and check if they're expired
    const confirmedSnapshot = await db.collection('confirmedMeeting')
      .where('menteeId', '==', menteeId)
      .get();
    
    confirmedSnapshot.forEach(doc => {
      const meetingData = doc.data();
      const status = isMeetingEnded(meetingData.meetingDate, meetingData.meetingTime) ? 'done' : 'confirmed';
      
      meetings.push({ 
        id: doc.id, 
        ...meetingData, 
        status: status,
        collection: 'confirmedMeeting'
      });
    });
    
    // Get completed meetings from endMeeting collection
    const endMeetingsSnapshot = await db.collection('endMeeting')
      .where('menteeId', '==', menteeId)
      .get();
    
    endMeetingsSnapshot.forEach(doc => {
      meetings.push({ 
        id: doc.id, 
        ...doc.data(), 
        status: 'done',
        collection: 'endMeeting'
      });
    });
    
    // Sort all meetings by date (newest first)
    meetings.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt.seconds * 1000) : 
                   a.confirmedAt ? new Date(a.confirmedAt.seconds * 1000) : 
                   a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
      const dateB = b.completedAt ? new Date(b.completedAt.seconds * 1000) : 
                   b.confirmedAt ? new Date(b.confirmedAt.seconds * 1000) : 
                   b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
      return dateB - dateA; // Most recent first
    });
    
    return { success: true, meetings };
  } catch (error) {
    console.error('Error in getMeetingsWithStatus:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  moveExpiredMeetings,
  getMeetingsWithStatus,
  isMeetingEnded
};
