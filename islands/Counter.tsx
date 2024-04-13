import { useEffect, useState } from "preact/hooks";

import { Button } from "../components/Button.tsx";

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.addEventListener("open", () => {
      console.log("connected");
    });
    ws.addEventListener("message", (event) => {
      console.log("received message", event.data);

      if (typeof event.data !== "string") {
        throw new Error("received invalid message");
      }

      const value = Number.parseInt(event.data);
      setCount(value);
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
      <Button onClick={() => setCount((current) => current - 1)}>-1</Button>
      <p class="text-3xl tabular-nums">{count}</p>
      <Button onClick={() => setCount((current) => current + 1)}>+1</Button>
    </div>
  );
}
