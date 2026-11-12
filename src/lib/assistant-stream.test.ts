import { describe, expect, it } from "vitest";
import { decodeAssistantStream } from "./assistant-stream";
function source(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({ start(c) { for (const chunk of chunks) c.enqueue(encoder.encode(chunk)); c.close(); } });
}
describe("Assistant stream", () => {
  it("preserves normal text across chunks", async () => {
    expect(await new Response(decodeAssistantStream(source(["Mhoro ", "Tsapo"]))).text()).toBe("Mhoro Tsapo");
  });
  it("reports a terminal error split across network chunks without displaying the marker", async () => {
    const reader = decodeAssistantStream(source(["Partial answer", "\u001eTSA", "PO_ERROR:", "Connection ", "failed"])).getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("Partial answer");
    await expect(reader.read()).rejects.toThrow("Connection failed");
  });
});