const https = require('https');

const url = 'https://discord.com/api/webhooks/1485905329840459908/ApS4axNE0O5-bN6ch4tuS3brYfUc8T_ZbQ-JDz8Vb808bVjlkSd-dhetZ1sOl2IvjRHv';

const content = [
  '### Addendum: cambios en directorio commands',
  '',
  'Resumen de lo hecho en src/commands:',
  '- Se movieron helpers no-piece (core/shared y utilidades internas) fuera de src/commands para evitar que Sapphire los cargara como comandos.',
  '- Nuevo destino de helpers: src/command-helpers (admin, automod, config, mod, music).',
  '- Se corrigieron imports en comandos que dependian de esos helpers (admin, automod, config, mod y music).',
  '- Se eliminaron carpetas vacias residuales dentro de src/commands despues del movimiento.',
  '- Resultado: desaparecio el spam EMPTY_MODULE en runtime y el cargador de comandos quedo limpio.',
  '- Build final validado en verde (tsc).'
].join('\\n');

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
