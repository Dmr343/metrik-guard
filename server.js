const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

const REQUIRED_FIELDS = ['nombre', 'telefono', 'correo', 'provincia'];

// Parsear formularios HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(PUBLIC));

// Manejar envío del formulario de diagnóstico
app.post('/submit', async (req, res) => {
  const data = {
    nombre:    (req.body.nombre    || '').trim(),
    telefono:  (req.body.telefono  || '').trim(),
    correo:    (req.body.correo    || '').trim(),
    empresa:   (req.body.empresa   || 'No indicado').trim(),
    tipo:      (req.body.tipo      || 'No indicado').trim(),
    provincia: (req.body.provincia || '').trim(),
    canton:    (req.body.canton    || 'No indicado').trim(),
    distrito:  (req.body.distrito  || 'No indicado').trim(),
    servicio:  (req.body.servicio  || 'No indicado').trim(),
    mensaje:   (req.body.mensaje   || 'Sin mensaje adicional').trim(),
  };

  // Validar campos obligatorios
  const missing = REQUIRED_FIELDS.filter(f => !data[f]);
  if (missing.length > 0) {
    return res.redirect('/contacto.html?error=campos');
  }

  // Validar formato de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
    return res.redirect('/contacto.html?error=email');
  }

  // Enviar email vía Resend si hay API key configurada
  const apiKey    = process.env.RESEND_API_KEY;
  const toEmail   = process.env.TO_EMAIL   || 'info@metrikguard.com';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@metrikguard.com';

  if (apiKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:     `Metrik Guard Web <${fromEmail}>`,
          to:       [toEmail],
          reply_to: data.correo,
          subject:  `Nueva solicitud de diagnóstico — ${data.nombre} (${data.provincia})`,
          text:     buildEmailText(data),
        }),
      });
      if (!resp.ok) {
        console.error('Resend error:', await resp.text());
      }
    } catch (err) {
      console.error('Error al enviar email:', err.message);
    }
  } else {
    console.warn('RESEND_API_KEY no configurado — solicitud registrada en log:');
    console.log(JSON.stringify(data, null, 2));
  }

  res.redirect('/gracias.html');
});

// 404 personalizado
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Metrik Guard corriendo en http://localhost:${PORT}`);
});

function buildEmailText(d) {
  return `
Nueva solicitud de diagnóstico — Metrik Guard
=============================================

DATOS DE CONTACTO
─────────────────
Nombre:    ${d.nombre}
Teléfono:  ${d.telefono}
Correo:    ${d.correo}
Empresa:   ${d.empresa}
Tipo:      ${d.tipo}

UBICACIÓN
─────────
Provincia: ${d.provincia}
Cantón:    ${d.canton}
Distrito:  ${d.distrito}

SOLICITUD
─────────
Servicio de interés: ${d.servicio}

Mensaje:
${d.mensaje}

─────────────────────────────────────────────
Enviado desde el formulario de metrikguard.com
`.trim();
}
