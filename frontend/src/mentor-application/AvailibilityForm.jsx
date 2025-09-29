import React, { useState, useEffect } from "react";

export default function AvailabilityForm({
  selectedSlots = new Set(),
  onAvailabilityChange,
}) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
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
    <div className="container">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css"
      />

      <div className="section">
        <div className="container">
          <div className="table-container">
            <table className="table is-fullwidth is-bordered">
              <thead>
                <tr>
                  <th>Time</th>
                  {days.map((day) => (
                    <th key={day} className="has-text-centered">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time) => (
                  <tr key={time}>
                    <td className="has-text-weight-semibold">{time}</td>
                    {days.map((day) => (
                      <td key={`${day}-${time}`} className="has-text-centered">
                        <button
                          type="button"
                          className={`button is-small ${
                            isSelected(day, time) ? "is-primary" : "is-light"
                          }`}
                          onClick={() => handleSlotToggle(day, time)}
                        >
                          {isSelected(day, time) ? "Available" : "Select"}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
