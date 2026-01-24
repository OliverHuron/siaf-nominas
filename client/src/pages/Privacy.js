import React from 'react';
import './Privacy.css';

const sections = [
  { id: 'responsible', title: 'Responsable y alcance' },
  { id: 'data', title: 'Datos que recopilamos' },
  { id: 'purposes', title: 'Finalidades del tratamiento' },
  { id: 'legal', title: 'Bases legales' },
  { id: 'retention', title: 'Conservación de los datos' },
  { id: 'third', title: 'Cesión y terceros' },
  { id: 'security', title: 'Seguridad' },
  { id: 'rights', title: 'Derechos de los usuarios' },
  { id: 'minors', title: 'Menores' },
  { id: 'changes', title: 'Cambios en la política' },
  { id: 'contact', title: 'Contacto' },
];

const Privacy = () => {
  return (
    <div className="privacy-page">
      <div className="container">
        <div className="hero">
          <h1>Política de Privacidad</h1>
          <p>Protegemos su información y le explicamos cómo la usamos en SIAF System.</p>
        </div>

        <div className="content">
          <div className="card section">
            <section id="intro">
              <p>
                Bienvenido a SIAF System ("SIAF", "nosotros"). Esta Política de Privacidad
                explica qué información recopilamos, por qué la usamos y qué opciones tiene
                con respecto a sus datos cuando utiliza nuestros servicios y la plataforma
                alojada en siafsystem.online.
              </p>
            </section>

            <section id="responsible">
              <h2>1. Responsable y alcance</h2>
              <p>
                El responsable del tratamiento de datos es la organización administradora de
                SIAF System. Esta política cubre los datos recogidos por la aplicación web
                y servicios relacionados, incluyendo perfiles de usuario, datos operativos
                e información técnica generada por su uso de la plataforma.
              </p>
            </section>

            <section id="data">
              <h2>2. Datos que recopilamos</h2>
              <ul>
                <li>Datos de cuenta y contacto: nombre, correo electrónico y rol.</li>
                <li>Credenciales de acceso y datos de autenticación (almacenados de forma segura).</li>
                <li>Datos de uso y técnicos: registros, direcciones IP, identificadores de dispositivo y telemetría.</li>
                <li>Datos operativos que usted ingrese en formularios o al gestionar inventarios, solicitudes y espacios.</li>
              </ul>
            </section>

            <section id="purposes">
              <h2>3. Finalidades del tratamiento</h2>
              <p>Usamos sus datos para los siguientes fines:</p>
              <ul>
                <li>Proveer, operar y mantener la plataforma.</li>
                <li>Gestionar el acceso y la autenticación de usuarios.</li>
                <li>Soporte técnico y comunicaciones operativas.</li>
                <li>Mejoras del servicio mediante análisis y métricas de uso.</li>
              </ul>
            </section>

            <section id="legal">
              <h2>4. Bases legales</h2>
              <p>
                Cuando aplique, tratamos los datos en base a: (i) la ejecución del contrato
                de prestación del servicio, (ii) el consentimiento del usuario para finalidades
                concretas, y (iii) intereses legítimos para seguridad y mejora del servicio.
              </p>
            </section>

            <section id="retention">
              <h2>5. Conservación de los datos</h2>
              <p>
                Conservamos los datos sólo durante el tiempo necesario para cumplir las
                finalidades descritas o para cumplir obligaciones legales.
              </p>
            </section>

            <section id="third">
              <h2>6. Cesión y terceros</h2>
              <p>
                No vendemos su información. Podemos compartir datos con proveedores que
                procesan información en nuestro nombre (hosting, análisis, correos) bajo
                contratos que exigen medidas de seguridad.
              </p>
            </section>

            <section id="security">
              <h2>7. Seguridad</h2>
              <p>
                Implementamos medidas técnicas y organizativas razonables para proteger
                los datos frente a pérdida, acceso no autorizado o divulgación.
              </p>
            </section>

            <section id="rights">
              <h2>8. Derechos de los usuarios</h2>
              <p>
                Usted puede solicitar acceso, rectificación, supresión, portabilidad u oposición
                al tratamiento de sus datos. Para ejercer sus derechos contacte al administrador.
              </p>
            </section>

            <section id="minors">
              <h2>9. Menores</h2>
              <p>
                La plataforma no está dirigida a menores de edad. Si detectamos datos de menores,
                tomaremos medidas para suprimirlos.
              </p>
            </section>

            <section id="changes">
              <h2>10. Cambios en la política</h2>
              <p>
                Publicaremos la versión revisada en esta misma URL y actualizaremos la fecha de "Última actualización".
              </p>
            </section>

            <section id="contact">
              <h2>11. Contacto</h2>
              <p>
                Para preguntas o para ejercer derechos: <a href="mailto:soporte@siafsystem.online">soporte@siafsystem.online</a>
              </p>
            </section>

            <p className="small">Última actualización: Diciembre 2025</p>
          </div>

          <aside className="toc">
            <div className="toc-box">
              <strong>Contenido</strong>
              <ul>
                {sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
                ))}
                <li><a href="#contact">Contacto</a></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
