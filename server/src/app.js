const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const auth = require('./auth');
const lampiran = require('./lampiran');

const app = express();
app.set('trust proxy', 'loopback'); // di belakang reverse proxy lokal (nginx)
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(auth.sesi);

app.get('/api/sehat', (req, res) => res.json({ ok: true }));
app.use('/api/auth', auth.router);
app.use('/api/lampiran', lampiran.router);
app.use('/api/pengguna', require('./pengguna').router);
app.use('/api/risiko', require('./risiko').router);
app.use('/api/pemantauan', require('./pemantauan').router);
app.use('/api/persetujuan', require('./persetujuan').router);
app.use('/api', require('./master').router);
app.use(require('./crud').errorPrisma);
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

// Produksi: sajikan hasil build frontend dari server yang sama (satu origin, cookie SameSite=Strict aman).
const DIST = path.resolve(__dirname, '..', '..', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Terjadi kesalahan server' });
});

module.exports = app;
