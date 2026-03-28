const https = require('https');

const url = 'https://discord.com/api/webhooks/1485905329840459908/ApS4axNE0O5-bN6ch4tuS3brYfUc8T_ZbQ-JDz8Vb808bVjlkSd-dhetZ1sOl2IvjRHv';

const content = [
  '### Resumen completo del dia',
  '',
  'Hecho hoy:',
  '- Reorganizacion completa de listeners de logs por tipo bajo src/listeners/logs (canales, roles, mensajes, voice, stickers, soundboard, threads, stages, webhooks, etc).',
  '- Ajuste de imports tras el movimiento de listeners y verificacion de compilacion.',
  '- Refactor fuerte del setup de Logs en 3 pasos (1/3, 2/3, 3/3) con flujo manual/automatico y bloqueo de configuracion simultanea por bloque.',
  '- Implementacion de configuracion por bloque en modo manual: seleccion de evento, canal, auto-create y guardado por evento.',
  '- Integracion i18n del wizard de Logs (textos, botones, mensajes y handlers) para en-US y es-ES.',
  '- Diagnostico y solucion de EMPTY_MODULE: se movieron helpers fuera de src/commands y se corrigieron imports en comandos.',
  '- Limpieza de estructura residual (directorios vacios) y validaciones de consistencia.',
  '- Validaciones finales: build en verde (tsc) y arranque del bot sin spam de EMPTY_MODULE.',
  '- Ajuste adicional solicitado: en modo automatico, los eventos ahora se agrupan por grupo de accion en menos canales (ej: stickers add/update/delete al mismo canal).',
  '- Ajuste adicional solicitado: setup de Logs visible (sin efimero al abrir el wizard).',
  '',
  'Estado actual:',
  '- Base estable y funcional para continuar.',
  '- Pendiente principal para manana: revision fina del modo manual (UX y detalle operativo final).'
].join('\n');

const body = JSON.stringify({ content });
const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let out = '';
  res.on('data', (d) => (out += d.toString()));
  res.on('end', () => {
    console.log('status', res.statusCode);
    if (out) console.log(out);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});

req.write(body);
req.end();
