import type { Serializable } from "@/types/message.js";

const SUPPORTED_LENGTH_BYTES = [1, 2, 4, 8] as const;

export interface FrameCodecOptions {
	maxBufferSize?: number;
	maxFrameSize?: number;
	lengthBytes?: (typeof SUPPORTED_LENGTH_BYTES)[number];
	endian?: "big" | "little";
	lengthIncludesHeader?: boolean;
}

const DEFAULT_OPTIONS: Required<FrameCodecOptions> = {
	maxBufferSize: 16 * 1024 * 1024,
	maxFrameSize: 16 * 1024 * 1024,
	lengthBytes: 4,
	endian: "big",
	lengthIncludesHeader: false,
};

export class FrameCodec {
	private buffer: Buffer = Buffer.alloc(0);

	readonly options: Required<FrameCodecOptions>;

	stats = {
		bytesReceived: 0,
		bytesDecoded: 0,
		framesDecoded: 0,
		bufferCopies: 0,
	};

	constructor(options: FrameCodecOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };

		if (!SUPPORTED_LENGTH_BYTES.includes(this.options.lengthBytes)) {
			throw new Error("lengthBytes must be 1, 2, 4, or 8");
		}
	}

	push(chunk: Buffer): Buffer[] {
		if (chunk.length === 0) return [];

		this.stats.bytesReceived += chunk.length;

		if (this.buffer.length + chunk.length > this.options.maxBufferSize) {
			this.reset();
			throw new Error(`Buffer overflow: ${this.buffer.length + chunk.length} > ${this.options.maxBufferSize}`);
		}

		// Zero-copy if possible, else concat
		this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);

		const frames: Buffer[] = [];
		const headerSize = this.options.lengthBytes;

		while (this.buffer.length >= headerSize) {
			const lengthField = this.readLength(this.buffer);

			// Calculate actual payload and total frame size
			const [payloadLength, frameLength] = this.options.lengthIncludesHeader
				? [lengthField - headerSize, lengthField]
				: [lengthField, headerSize + lengthField];

			if (payloadLength < 0 || payloadLength > this.options.maxFrameSize) {
				this.reset();
				throw new Error(`Invalid frame size: ${payloadLength}`);
			}

			if (this.buffer.length < frameLength) {
				break;
			}

			frames.push(this.buffer.subarray(headerSize, frameLength));

			this.stats.framesDecoded++;
			this.stats.bytesDecoded += payloadLength;

			// Consume processed bytes
			this.buffer = frameLength === this.buffer.length ? Buffer.alloc(0) : this.buffer.subarray(frameLength);
		}

		// Compact if holding small view of large orphaned buffer (>1MB waste)
		if (this.buffer.byteOffset > 1024 * 1024) {
			this.buffer = Buffer.from(this.buffer);
			this.stats.bufferCopies++;
		}

		return frames;
	}

	get bufferedBytes(): number {
		return this.buffer.length;
	}

	reset(): void {
		this.buffer = Buffer.alloc(0);

		this.stats.bytesReceived = 0;
		this.stats.bytesDecoded = 0;
		this.stats.framesDecoded = 0;
		this.stats.bufferCopies = 0;
	}

	private readLength(buf: Buffer): number {
		const big = this.options.endian === "big";

		switch (this.options.lengthBytes) {
			case 1:
				return buf.readUInt8(0);
			case 2:
				return big ? buf.readUInt16BE(0) : buf.readUInt16LE(0);
			case 4:
				return big ? buf.readUInt32BE(0) : buf.readUInt32LE(0);
			case 8: {
				const val = big ? buf.readBigUInt64BE(0) : buf.readBigUInt64LE(0);

				if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
					throw new Error("Frame size exceeds safe integer range");
				}

				return Number(val);
			}
		}
	}

	public encode(payload: Buffer) {
		return FrameCodec.encode(payload, this.options);
	}

	public static encode(payload: Buffer, options?: FrameCodecOptions): Buffer {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		const { lengthBytes, endian, lengthIncludesHeader } = opts;

		// Calculate the length value to write in the header
		const headerSize = lengthBytes;
		const payloadSize = payload.length;
		const totalFrameSize = lengthIncludesHeader ? headerSize + payloadSize : payloadSize;

		// Validate size fits in length field
		const maxLength = 2 ** (lengthBytes * 8) - 1;

		if (totalFrameSize > maxLength) {
			throw new Error(`Frame size ${totalFrameSize} exceeds maximum ${maxLength} for ${lengthBytes}-byte length field`);
		}

		// Allocate header
		const header = Buffer.allocUnsafe(headerSize);
		const big = endian === "big";

		// Write length field
		switch (lengthBytes) {
			case 1:
				header.writeUInt8(totalFrameSize, 0);
				break;
			case 2:
				header[big ? "writeUInt16BE" : "writeUInt16LE"](totalFrameSize, 0);
				break;
			case 4:
				header[big ? "writeUInt32BE" : "writeUInt32LE"](totalFrameSize, 0);
				break;
			case 8: {
				header[big ? "writeBigUInt64BE" : "writeBigUInt64LE"](BigInt(totalFrameSize), 0);
				break;
			}
			default:
				throw new Error(`Unsupported lengthBytes: ${lengthBytes}`);
		}

		// Return concatenated buffer (single allocation)
		return Buffer.concat([header, payload]);
	}

	public static serialize(obj: Serializable): Buffer {
		return Buffer.from(JSON.stringify(obj));
	}

	public static deserialize(buf: Buffer): Serializable {
		return JSON.parse(buf.toString());
	}
}
