import React, { useEffect, useState } from 'react';
import { spacesService, assignService } from '../services/services';

export default function Spaces() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    spacesService.getAll()
      .then(res => setSpaces(res.data.data || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleStartAudit = async (id) => {
    try {
      const res = await spacesService.startAudit(id);
      alert('Auditoría iniciada: ' + res.data.data.id);
    } catch (e) {
      console.error(e);
      alert('Error iniciando auditoría');
    }
  };

  const handleViewInventory = async (id) => {
    try {
      const res = await spacesService.getInventory(id);
      alert('Inventario: ' + JSON.stringify(res.data.data || res.data));
    } catch (e) {
      console.error(e);
      alert('Error obteniendo inventario');
    }
  };

  const handleAssignQuadrant = async (id) => {
    const quadrant = prompt('Ingrese nombre del cuadrante para asignar:');
    if (!quadrant) return;
    try {
      const res = await assignService.assignQuadrant(id, quadrant);
      alert('Cuadrante asignado');
    } catch (e) {
      console.error(e);
      alert('Error asignando cuadrante');
    }
  };

  return (
    <div className="page">
      <h2>Espacios</h2>
      {loading && <p>Cargando...</p>}
      {!loading && (
        <table className="table">
          <thead>
            <tr><th>Id</th><th>Nombre</th><th>Tipo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {(spaces || []).map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name || s.nombre}</td>
                <td>{s.type || s.tipo}</td>
                <td>
                  <button onClick={() => handleStartAudit(s.id)}>Iniciar Auditoría</button>
                  <button onClick={() => handleViewInventory(s.id)} style={{marginLeft:8}}>Ver Inventario</button>
                  <button onClick={() => handleAssignQuadrant(s.id)} style={{marginLeft:8}}>Asignar Cuadrante</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
