const https = require('https');

// Keep this file in the repo as a reusable "end of session" sender.
// Workflow:
// 1) Edit the blocks below.
// 2) Run: node scripts/post_qa_summary.js

const url = 'https://discord.com/api/webhooks/1485905329840459908/ApS4axNE0O5-bN6ch4tuS3brYfUc8T_ZbQ-JDz8Vb808bVjlkSd-dhetZ1sOl2IvjRHv';

const legend = [
  '-# ### Leyenda',
  '-# 🟩 Aprobado',
  '-# 🟧 Parcial / pendiente',
  '-# 🟥 Falla activa'
];

const sections = [
  {
    title: '🟩 Moderación',
    lines: [
      'Cobertura QA completada y estable.',
      'Paridad slash/prefix validada en flujos críticos.',
      'Validaciones y rutas de error revisadas.',
      'Política de sanciones cerrada: mute + timeout coexistentes, con unmute y untimeout separados.',
      'Consistencia de casos y mod-log verificada.'
    ]
  },
  {
    title: '🟩 Música (funcional core)',
    lines: [
      'Búsqueda Spotify-first con fallback a YouTube funcionando.',
      'Playlists grandes (incluyendo 155 tracks) validadas.',
      'Cola y nowplaying en efímero por defecto.',
      'Autoborrado aplicado: nowplaying 15s, cola 30s (incluye botón y slash).',
      'Idle timeout validado a 3 minutos.'
    ]
  },
  {
    title: '🟩 Robustez de sesión / reconexión',
    lines: [
      'Se corrigieron timeouts zombie de instancias viejas de player.',
      'Se agregó cleanup/dispose consistente en stop y flujos de desconexión.',
      'Se endureció recuperación tras reinicio de Lavalink (re-add de nodo faltante + recuperación de colas activas).',
      'Se mitigó Session not found en botones con recuperación limpia y mensaje útil.',
      'Se evitó falso mensaje de "me echaron del chat de voz" durante reconexiones transitorias.'
    ]
  },
  {
    title: '🟧 Riesgo residual conocido',
    lines: [
      'En reinicios sucios de Lavalink aún puede haber ventanas breves de inestabilidad antes de que el guard recupere.',
      'El sistema ya se auto-recupera, pero conviene seguir observando 1-2 ciclos más en uso real.'
    ]
  }
];

const footer = '**Estado general:** estable para continuar. Cierre de sesión recomendado.';

function buildContent() {
  const parts = [...legend, ''];

  for (const section of sections) {
    parts.push(`-# ### ${section.title}`);
    parts.push(...section.lines);
    parts.push('');
  }

  parts.push(footer);
  return parts.join('\n');
}

const content = buildContent();

const body = JSON.stringify({ content });

const req = https.request(
  url,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  },
  (res) => {
    let out = '';
    res.on('data', (d) => (out += d.toString()));
    res.on('end', () => {
      console.log('status', res.statusCode);
      if (out) console.log(out);
      process.exit(res.statusCode && res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
    });
  }
);

req.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});

req.write(body);
req.end();
