import { useEffect, useRef, useState } from "preact/hooks";

import { Button } from "../components/Button.tsx";
import { Message } from "../types/message.ts";

export default function Counter() {
  const [count, setCount] = useState(0);

  const wsRef = useRef(new WebSocket("ws://localhost:8000/ws"));

  useEffect(() => {
    const ws = wsRef.current;

    ws.addEventListener("open", () => {
      console.log("connected");
    });
    ws.addEventListener("message", (event) => {
      console.log("received message", event.data);

      if (typeof event.data !== "string") {
        throw new Error("received invalid message");
      }

      const message: Message = JSON.parse(event.data);
      switch (message.type) {
        case "increment":
          console.log("incrementing");
          setCount((cur) => cur + 1);
          break;
        case "decrement":
          console.log("decrementing");
          setCount((cur) => cur - 1);
          break;
        default:
          throw new Error(`invalid message type: ${message.type}`);
      }
    });
    ws.addEventListener("close", () => {
      console.log("connection closed");
    });

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div class="flex gap-8 py-6">
      <Button
        onClick={() =>
          wsRef.current.send(JSON.stringify({ type: "decrement" }))}
      >
        -1
      </Button>
      <p class="text-3xl tabular-nums">{count}</p>
      <Button
        onClick={() =>
          wsRef.current.send(JSON.stringify({ type: "increment" }))}
      >
        +1
      </Button>
    </div>
  );
}
