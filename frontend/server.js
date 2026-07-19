// Custom server cho hosting kiểu Passenger/cPanel (Hostinger Node.js App) —
// các host này cần 1 file JS khởi động trực tiếp bằng `node`, không chạy
// qua npm script như `next start`. Đọc PORT từ env do host cấp (Hostinger
// tự set qua Passenger), fallback 3001 khi chạy local.
const { createServer } = require('http');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3001;
const app = next({ dev: process.env.NODE_ENV !== 'production' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`VAIC frontend (custom server) đang chạy tại http://localhost:${port}`);
  });
});
