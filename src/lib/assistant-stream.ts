const ERROR_MARKER = "\u001eTSAPO_ERROR:";

/** Convert the existing text stream's terminal error into a transport failure. */
export function decodeAssistantStream(source: ReadableStream<Uint8Array>) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pending = "";
  let failing = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        for (;;) {
          const chunk = await reader.read();
          pending += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
          if (failing) {
            if (chunk.done) throw new Error(pending || "The assistant could not finish.");
            continue;
          }
          const marker = pending.indexOf(ERROR_MARKER);
          if (marker >= 0) {
            const prefix = pending.slice(0, marker);
            pending = pending.slice(marker + ERROR_MARKER.length);
            failing = true;
            if (prefix) { controller.enqueue(encoder.encode(prefix)); return; }
            if (chunk.done) throw new Error(pending || "The assistant could not finish.");
            continue;
          }
          // Retain a possible marker prefix, including markers split over chunks.
          let keep = 0;
          for (let length = 1; length < ERROR_MARKER.length; length++) {
            if (pending.endsWith(ERROR_MARKER.slice(0, length))) keep = length;
          }
          const output = chunk.done ? pending : pending.slice(0, pending.length - keep);
          pending = chunk.done ? "" : pending.slice(pending.length - keep);
          if (output) controller.enqueue(encoder.encode(output));
          if (chunk.done) { controller.close(); return; }
          if (output) return;
        }
      } catch (error) {
        await reader.cancel().catch(() => {});
        controller.error(error);
      }
    },
    cancel: () => reader.cancel(),
  });
}