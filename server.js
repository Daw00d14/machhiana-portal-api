// Local dev server — same code as Vercel serverless
const app = require('./api/index');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Local: http://localhost:${PORT}`));
