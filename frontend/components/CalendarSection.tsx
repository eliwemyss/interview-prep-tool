'use client';

interface CalendarEvent {
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface CalendarSectionProps {
  events: CalendarEvent[];
}

export default function CalendarSection({ events }: CalendarSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        📅 Upcoming Calendar Events
      </h2>

      {events.length === 0 ? (
        <p className="text-gray-500">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => {
            const startTime = event.start?.dateTime || event.start?.date || '';
            const date = startTime ? new Date(startTime) : new Date();
            return (
              <div
                key={idx}
                className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div className="text-2xl">📍</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{event.summary}</p>
                  <p className="text-sm text-gray-600">
                    {date.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
