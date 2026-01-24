import React, { useState, useEffect } from 'react';
import { buildingService } from '../services/services';
import { toast } from 'react-toastify';

const Buildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuildings();
  }, []);

  const loadBuildings = async () => {
    try {
      const res = await buildingService.getAll();
      setBuildings(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedBuilding(res.data.data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar edificios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Control de Butacas y Alumnos</h1>
        <p>Visualización de edificios, salones y capacidad</p>
      </div>

      <div className="card">
        <div className="building-selector">
          {buildings.map((building) => (
            <button
              key={building.id}
              className={`btn ${selectedBuilding?.id === building.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedBuilding(building)}
            >
              Edificio {building.nombre}
            </button>
          ))}
        </div>

        {selectedBuilding && (
          <div className="building-details">
            <h3>Edificio {selectedBuilding.nombre}</h3>
            <p>{selectedBuilding.descripcion}</p>
            
            <div className="grid grid-3 mt-3">
              {selectedBuilding.salones && selectedBuilding.salones.map((salon) => (
                <div key={salon.id} className="card">
                  <h4>{salon.nombre}</h4>
                  <p>Piso: {salon.piso}</p>
                  <p>Capacidad: {salon.capacidad_butacas} butacas</p>
                  <p>Alumnos actuales: {salon.alumnos_actuales || 0}</p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(salon.alumnos_actuales / salon.capacidad_butacas) * 100}%`,
                        backgroundColor: (salon.alumnos_actuales / salon.capacidad_butacas) > 0.8 ? '#e74c3c' : '#3498db'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Buildings;
