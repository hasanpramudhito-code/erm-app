const app = require('./app');
const prisma = require('./db');

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`ERM server di http://localhost:${PORT}`));

// Bersihkan sesi kedaluwarsa tiap jam.
setInterval(() => prisma.sesi.deleteMany({ where: { kedaluwarsa: { lt: new Date() } } }).catch(console.error), 60 * 60 * 1000).unref();
