const http = require('http');

const PORT = 3000;
let shifts = new Map();
let transactionCounter = 1;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // POST /api/v1/shifts/clock-in
    if (req.method === 'POST' && url.pathname === '/api/v1/shifts/clock-in') {
      const { terminalId, attendantPin } = await parseBody(req);

      if (!terminalId || !attendantPin) {
        return json(res, 400, { error: 'terminalId and attendantPin are required' });
      }

      const shiftId = `SHIFT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const shift = {
        shiftId,
        terminalId,
        attendantPin,
        mode: Math.random() > 0.5 ? 'STRICT' : 'EXPRESS',
        lanes: [1, 2, 5],
      };

      // In STRICT mode, add more lanes
      if (shift.mode === 'STRICT') {
        shift.lanes = [1, 2, 3, 4, 5];
      }

      shifts.set(shiftId, shift);
      console.log(`[CLOCK-IN]  Terminal: ${terminalId} | Shift: ${shiftId} | Mode: ${shift.mode}`);
      return json(res, 200, shift);
    }

    // POST /api/v1/shifts/close
    if (req.method === 'POST' && url.pathname === '/api/v1/shifts/close') {
      const { shiftId, terminalId } = await parseBody(req);

      if (!shiftId) {
        return json(res, 400, { error: 'shiftId is required' });
      }

      shifts.delete(shiftId);
      console.log(`[CLOSE]     Shift: ${shiftId} | Terminal: ${terminalId}`);
      return json(res, 200, { status: 'closed', shiftId });
    }

    // POST /api/v1/transactions/initiate
    if (req.method === 'POST' && url.pathname === '/api/v1/transactions/initiate') {
      const { shiftId, terminalId, amountXOF, coordinates, timestamp } = await parseBody(req);

      if (!shiftId || !amountXOF) {
        return json(res, 400, { error: 'shiftId and amountXOF are required' });
      }

      const receiptNumber = `RC-${String(transactionCounter++).padStart(6, '0')}`;
      console.log(`[PAYMENT]   Amount: ${amountXOF} XOF | Receipt: ${receiptNumber} | Shift: ${shiftId}`);
      return json(res, 200, {
        receiptNumber,
        amountXOF,
        shiftId,
        terminalId,
        timestamp: timestamp || new Date().toISOString(),
        status: 'approved',
      });
    }

    // 404 fallback
    json(res, 404, { error: `Route not found: ${req.method} ${url.pathname}` });
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ============================================');
  console.log('   WizarPOS Gateway Mock Server');
  console.log(`   Listening on http://localhost:${PORT}`);
  console.log('  ============================================');
  console.log('');
  console.log('  Endpoints:');
  console.log(`    POST /api/v1/shifts/clock-in`);
  console.log(`    POST /api/v1/shifts/close`);
  console.log(`    POST /api/v1/transactions/initiate`);
  console.log('');
});
