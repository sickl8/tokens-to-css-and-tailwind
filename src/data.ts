import { formatHex8, formatRgb } from "culori";

export let genChoices = [
	{ value: "light-dark", text: "light-dark()" },
	{ value: "selector", text: "CSS selector" },
	{ value: "media", text: "media query" },
] as const;

export let cssFormatNames = ["hsl", "hwb", "lab", "lch", "oklab", "oklch", "hex", "rgb"] as const
export let cssFormats = [
	{
		text: "#RRGGBBAA",
		value: "hex" as const,
		converter: formatHex8
	},
	{
		text: "rgb()",
		value: "rgb" as const,
		converter: formatRgb
	},
	...cssFormatNames.map(space => (
		{
			text: space + "()",
			value: space,
			converter: undefined
		}
	))
] satisfies { value: typeof cssFormatNames[number], text: string, converter: any }[];

export function crc32(str: string) {
	const table = Array.from({ length: 256 }, (_, k) => {
		let c = k;
		for (let j = 0; j < 8; j++) {
			c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
		}
		return c >>> 0;
	});

	let crc = 0 ^ -1; // Initial value for CRC
	for (let i = 0; i < str.length; i++) {
		const byte = str.charCodeAt(i);
		crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
	}
	return (crc ^ -1) >>> 0; // Final XOR and ensure unsigned result
}

export type ColorFormat = typeof cssFormats[number]["value"]