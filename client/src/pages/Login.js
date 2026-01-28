import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: ''
  });
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      await login(formData.email, formData.password);
    } else {
      await register(formData);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>SIAF</h1>
          <p>Sistema Integral de Administración Facultativa</p>
        </div>

        <div className="login-form-container">
          <div className="form-tabs">
            <button
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Iniciar Sesión
            </button>
            <button
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido Paterno</label>
                  <input
                    type="text"
                    name="apellido_paterno"
                    value={formData.apellido_paterno}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido Materno</label>
                  <input
                    type="text"
                    name="apellido_materno"
                    value={formData.apellido_materno}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
