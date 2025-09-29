import React from "react";

function DisplayAvailabilityGrid({ availabilityArray }) {
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

  const availabilitySet = new Set(availabilityArray);

  const isAvailable = (day, time) => {
    return availabilitySet.has(`${day}-${time}`);
  };

  return (
    <div>
      <style>{`
        .availability-display {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        .availability-table {
          width: 100%;
          border-collapse: collapse;
        }
        .availability-table th,
        .availability-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
          font-size: 12px;
        }
        .availability-table th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        .available-slot {
          background-color: #d4edda;
          color: #155724;
        }
        .unavailable-slot {
          background-color: #f8f9fa;
          color: #6c757d;
        }
      `}</style>
      <p>
        Mentees will be only be able to request an appointment if you are
        available. You can always propose a time that works for you, without
        affecting your general availability.
      </p>
      <div className="availability-display">
        <table className="availability-table">
          <thead>
            <tr>
              <th>Time</th>
              {days.map((day) => (
                <th key={day}>{day.substring(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time}>
                <td
                  style={{
                    fontWeight: "600",
                    backgroundColor: "#f5f5f5",
                    color: "#6c757d",
                  }}
                >
                  {time}
                </td>
                {days.map((day) => (
                  <td
                    key={`${day}-${time}`}
                    className={
                      isAvailable(day, time)
                        ? "available-slot"
                        : "unavailable-slot"
                    }
                  >
                    {isAvailable(day, time) ? "✓" : "—"}
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

export default DisplayAvailabilityGrid;
