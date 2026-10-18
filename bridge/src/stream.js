// Server-Sent Events fan-out. Each browser keeps one connection; the browser's EventSource reconnects by itself.
export function createStream() {
  const clients = new Set();
  const write = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25_000);
  heartbeat.unref();
  return {
    open(req, res, snapshot) {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
      res.write('retry: 5000\n\n');
      write(res, 'snapshot', snapshot());
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    broadcast(event, data) { for (const res of clients) write(res, event, data); },
    get size() { return clients.size; },
    close() { clearInterval(heartbeat); for (const res of clients) res.end(); clients.clear(); },
  };
}
