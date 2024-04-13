import { connect, StringCodec } from "$nats";

export async function handler(req: Request) {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const nc = await connect({ servers: "localhost" });
  const js = nc.jetstream();
  const sc = StringCodec();

  const bucket = await js.views.kv("my-bucket", { bindOnly: true });

  const sendData = (data: Uint8Array) => {
    if (socket.OPEN !== 1) {
      throw new Error("socket is not open!");
    }

    const decoded = sc.decode(data);
    socket.send(decoded);
  };

  socket.addEventListener("message", (event) => {
    console.log("received unexpected message from client", event.data);
  });
  socket.addEventListener("close", async () => {
    await nc.close();

    const err = await nc.closed();
    if (err !== undefined) {
      console.error("failed to close NATS connection", err);
    }
  });

  while (socket.OPEN !== 1) {
    // Do nothing
  }

  const iter = await bucket.watch({ key: "start" });
  for await (const r of iter) {
    if (r.operation === "DEL") {
      console.error("key deleted!");
      return;
    }

    try {
      sendData(r.value);
    } catch (err) {
      console.error("failed to send message", err);
    }
  }

  return response;
}
