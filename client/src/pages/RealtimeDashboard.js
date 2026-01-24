import React, { useEffect, useState } from 'react';

export default function RealtimeDashboard() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const es = new EventSource(process.env.REACT_APP_API_URL + '/api/realtime/spaces');
    es.onmessage = (e) => {
      // default message
      setEvents(prev => [{ type: 'message', data: e.data }, ...prev].slice(0, 100));
    };
    es.addEventListener('space.scan', (e) => setEvents(prev => [{ type: 'space.scan', data: JSON.parse(e.data) }, ...prev].slice(0,100)));
    es.addEventListener('space.audit.closed', (e) => setEvents(prev => [{ type: 'space.audit.closed', data: JSON.parse(e.data) }, ...prev].slice(0,100)));
    es.addEventListener('space.updated', (e) => setEvents(prev => [{ type: 'space.updated', data: JSON.parse(e.data) }, ...prev].slice(0,100)));

    es.onerror = (err) => {
      console.error('SSE error', err);
      es.close();
    };

    return () => es.close();
  }, []);

  return (
    <div className="page">
      <h2>Dashboard Realtime</h2>
      <p>Eventos recientes (SSE)</p>
      <ul>
        {events.map((ev, i) => (
          <li key={i}><strong>{ev.type}:</strong> {typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data)}</li>
        ))}
      </ul>
    </div>
  );
}
