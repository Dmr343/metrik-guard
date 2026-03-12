/**
 * Cloudflare Pages Function — Manejo del formulario de diagnóstico
 *
 * Requiere las siguientes variables de entorno configuradas en
 * Cloudflare Pages → Settings → Environment variables:
 *
 *   RESEND_API_KEY   Tu API key de Resend (resend.com) — obligatorio para enviar emails
 *   TO_EMAIL         Correo destino de las solicitudes (default: hola@metrikguard.com)
 *   FROM_EMAIL       Correo remitente verificado en Resend (default: noreply@metrikguard.com)
 */

const REQUIRED_FIELDS = ['nombre', 'telefono', 'correo', 'provincia'];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    const data = {
      nombre:    formData.get('nombre')   || '',
      telefono:  formData.get('telefono') || '',
      correo:    formData.get('correo')   || '',
      empresa:   formData.get('empresa')  || 'No indicado',
      tipo:      formData.get('tipo')     || 'No indicado',
      provincia: formData.get('provincia')|| '',
      canton:    formData.get('canton')   || 'No indicado',
      distrito:  formData.get('distrito') || 'No indicado',
      servicio:  formData.get('servicio') || 'No indicado',
      mensaje:   formData.get('mensaje')  || 'Sin mensaje adicional',
    };

    // ── Validación de campos obligatorios ──────────────────────────────
    const missing = REQUIRED_FIELDS.filter(f => !data[f].trim());
    if (missing.length > 0) {
      return redirect(request, `/contacto.html?error=campos`);
    }

    // ── Validación básica de email ──────────────────────────────────────
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
      return redirect(request, `/contacto.html?error=email`);
    }

    // ── Envío de email vía Resend ───────────────────────────────────────
    const apiKey = env.RESEND_API_KEY;
    const toEmail   = env.TO_EMAIL   || 'hola@metrikguard.com';
    const fromEmail = env.FROM_EMAIL || 'noreply@metrikguard.com';

    if (apiKey) {
      const emailText = buildEmailText(data);

      const resendResponse = await fetch('https://api.resend.com/emails', {
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
          text:     emailText,
        }),
      });

      if (!resendResponse.ok) {
        // El email falló pero no bloqueamos al usuario — seguimos al gracias
        console.error('Resend error:', await resendResponse.text());
      }
    } else {
      // Sin API key configurada — solo registrar en el log de Cloudflare
      console.warn('RESEND_API_KEY no configurado. Solicitud recibida de:', data.correo);
      console.log(JSON.stringify(data));
    }

    return redirect(request, '/gracias.html');

  } catch (err) {
    console.error('Error en /submit:', err);
    return redirect(request, '/contacto.html?error=servidor');
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function redirect(request, path) {
  const base = new URL(request.url).origin;
  return Response.redirect(`${base}${path}`, 302);
}

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
