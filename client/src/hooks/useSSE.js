import { useEffect, useRef } from 'react';
import api from '../services/api';

/**
 * Hook para escuchar eventos del servidor en tiempo real (SSE).
 * @param {Object} handlers - Mapa de { eventType: callbackFn }
 * @example
 *   useSSE({ employee_created: () => refetch(), employee_updated: () => refetch() });
 */
const useSSE = (handlers = {}) => {
    const esRef = useRef(null);
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        // Construir URL del SSE usando la base URL de la API
        const baseURL = api.defaults.baseURL || 'http://localhost:5000';
        const url = `${baseURL}/api/events`;

        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        es.onopen = () => {
            console.log('[SSE] Conectado al servidor');
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const handler = handlersRef.current[data.type];
                if (handler) handler(data);
            } catch { /* ignore parse errors */ }
        };

        es.onerror = () => {
            // El navegador reconecta automáticamente — no hacer nada
        };

        return () => {
            es.close();
            esRef.current = null;
        };
    }, []); // Solo una instancia por componente montado
};

export default useSSE;
