import { connect, StringCodec } from "$nats";
import { Message } from "../../types/message.ts";

export async function handler(req: Request) {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const nc = await connect({ servers: "localhost" });
  const js = nc.jetstream();
  const consumer = await js.consumers.get("changes");

  const sc = StringCodec();

  const sendData = (data: Uint8Array) => {
    if (socket.OPEN !== 1) {
      throw new Error("socket is not open!");
    }

    const decoded = sc.decode(data);
    socket.send(decoded);
  };

  socket.addEventListener("message", async (event) => {
    console.log("received message", event.data);

    if (typeof event.data !== "string") {
      throw new Error("received invalid message");
    }

    const message: Message = JSON.parse(event.data);
    switch (message.type) {
      case "increment":
        console.log("incrementing");
        break;
      case "decrement":
        console.log("decrementing");
        break;
      default:
        throw new Error(`invalid message type: ${message.type}`);
    }

    const data = JSON.stringify({ type: message.type });
    await js.publish("changes.events", sc.encode(data));
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

  const messages = await consumer.consume();
  for await (const msg of messages) {
    sendData(msg.data);
    msg.ack();
  }

  return response;
}
