import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { zstdCompressSync, zstdDecompressSync } from "node:zlib";
import { scanZstdFrames, decodeSessionZstd } from "./session-reader.ts";

describe("zstd concatenated-frame decoding", () => {
  const frame1 = '{"type":"session","id":"s1"}\n{"type":"request/header","seq":1}\n';
  const frame2 = '{"type":"assistant/message","seq":2,"data":{"usage":{"inputTokens":5}}}\n{"type":"assistant/chunk","seq":3}\n';

  function buildMultiFrame() {
    // Each batch is its own zstd frame, concatenated — exactly how DSH appends.
    return Buffer.concat([zstdCompressSync(Buffer.from(frame1, "utf-8")), zstdCompressSync(Buffer.from(frame2, "utf-8"))]);
  }

  test("scanZstdFrames locates every complete frame", () => {
    const buf = buildMultiFrame();
    const frames = scanZstdFrames(buf);
    assert.equal(frames.length, 2, "should find exactly 2 frames");
    assert.equal(buf.readUInt32LE(frames[1].start), 0xfd2fb528, "frame 2 starts with zstd magic");
  });

  test("decodeSessionZstd returns the FULL concatenated content", async () => {
    const buf = buildMultiFrame();
    const decoded = await decodeSessionZstd(buf);
    assert.ok(decoded, "decode should succeed");
    assert.ok(decoded.includes('"id":"s1"'), "frame 1 content present");
    assert.ok(decoded.includes('"inputTokens":5'), "frame 2 content present");
    assert.ok(decoded.includes('"seq":3'), "frame 2 tail present");
  });

  test("one-shot decompress (old bug) only yields the first frame", () => {
    const buf = buildMultiFrame();
    const oneShot = zstdDecompressSync(buf).toString("utf-8");
    assert.ok(oneShot.includes('"id":"s1"'), "frame 1 present");
    assert.ok(!oneShot.includes('"inputTokens":5'), "frame 2 silently dropped by one-shot decode");
  });

  test("single-frame file still decodes (backward compatible)", async () => {
    const one = zstdCompressSync(Buffer.from('{"type":"session"}\n', "utf-8"));
    const frames = scanZstdFrames(one);
    assert.equal(frames.length, 1);
    const decoded = await decodeSessionZstd(one);
    assert.equal(decoded, '{"type":"session"}\n');
  });

  test("empty / non-zstd buffer yields null", async () => {
    assert.equal(await decodeSessionZstd(Buffer.from("not zstd at all")), null);
  });
});