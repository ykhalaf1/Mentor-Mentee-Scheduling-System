import React from 'react';

export default function AvailabilityForm({ selectedSlots = new Set(), onAvailabilityChange }) {

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', 
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
  ];

  const handleSlotToggle = (day, time) => {
    const slotId = `${day}-${time}`; // creates a slot based on day and time
    const newSelectedSlots = new Set(selectedSlots);
    
    // handles toggling
    if (newSelectedSlots.has(slotId)) {
      newSelectedSlots.delete(slotId);
    } else {
      newSelectedSlots.add(slotId);
    }
    
    if (onAvailabilityChange) {
      onAvailabilityChange(newSelectedSlots);
    }
  };

  const isSelected = (day, time) => {
    return selectedSlots.has(`${day}-${time}`);
  };

  return (
    <div style={{ width: '100%' }}>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
        Select your available time slots for each day of the week
      </p>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>Time</th>
              {days.map(day => (
                <th key={day} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(time => (
              <tr key={time}>
                <td style={{ padding: '4px 6px', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '0.7rem' }}>
                  {time}
                </td>
                {days.map(day => (
                  <td key={`${day}-${time}`} style={{ padding: '2px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{
                        padding: '3px 6px',
                        fontSize: '0.65rem',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        backgroundColor: isSelected(day, time) ? '#007399' : '#f8f9fa',
                        color: isSelected(day, time) ? 'white' : '#333',
                        minWidth: '50px'
                      }}
                      onClick={() => handleSlotToggle(day, time)}
                    >
                      {isSelected(day, time) ? '✓' : 'Select'}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
