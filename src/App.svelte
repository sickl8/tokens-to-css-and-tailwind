<script lang="ts">
    import { onMount } from "svelte";
    import { invoke, onMessage } from "./api";
    import RadioButton from "./RadioButton.svelte";
    import type { Interactable } from "@interactjs/types";
    import interact from "interactjs";
	import { parse, converter, type Color, formatHex, formatHex8, type Mode, formatCss, formatRgb } from "culori";
    import Setting from "./Setting.svelte";

	let rootEl: HTMLElement;
	let resizable: Interactable;
	
	type Mutable<T> = {
		-readonly[P in keyof T]: T[P]
	};

	type NestedRecord = { [k: string]: string | NestedRecord }

	type RGBAmut = Mutable<RGBA>;

	onMount(() => {
		window.addEventListener("message", onMessage);
		const resizeMargin = 10;
		resizable = interact(rootEl).resizable({
				edges: { top: false, left: false, right: true, bottom: true  },
				margin: resizeMargin - 1,
				listeners: {
					move(
						event: Event & {
							rect: { width: number; height: number };
							deltaRect: { left: number; top: number };
							delta: { x: number; y: number };
						}
					) {
						event.preventDefault();
						invoke.resize(event.rect.width, event.rect.height);
					}
				},
				modifiers: [
					interact.modifiers.restrictSize({
						min: { width: 400, height: 300 },
						max: { width: 1920, height: 1080 }
					})
				]
			});
		return () => {
			window.removeEventListener("message", onMessage);
		}
	})

	let prefixWithCollectionName = $state(true);
	let firstSegmentLast = false;
	let generating = $state(false);
	async function generate() {
		// async function sha1Hash(input: string) {
		// 	console.log({location})
		// 	const encoder = new TextEncoder();
		// 	const data = encoder.encode(input);

		// 	const hashBuffer = await crypto.subtle.digest("SHA-1", data);

		// 	const hashArray = Array.from(new Uint8Array(hashBuffer));
		// 	const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");

		// 	return hashHex;
		// }
		function generateCSSVarNameFromKey(key: string, colName: string) {
			return "--" + (colName + "-").repeat(+prefixWithCollectionName) + key.replace(/\//g, "-");
		}
		let data = await invoke.getAllVariables();
		function stringCmp(a: string, b: string) {
			if (a < b) {
				return -1;
			} else if (b < a) {
				return 1;
			}
			return 0;
		}
		let colors = data.filter((v) => v.type === "COLOR").toSorted((a, b) => {
			let cmpColName = stringCmp(a.collectionName, b.collectionName);
			return cmpColName || stringCmp(a.key, b.key) 
		} );
		let cssColors = colors.map(v => {
			let key = generateCSSVarNameFromKey(v.key, v.collectionName);
			let valuesByMode = Object.entries(v.valuesByMode).map(([modeId, value]) => {
				let resolvedValue: string;
				if ((value as VariableAlias).type === "VARIABLE_ALIAS") {
					let valueAlias = value as VariableAlias;
					let index = colors.findIndex(color => color.variableId == valueAlias.id);
					let aliasedColor = generateCSSVarNameFromKey(colors[index].key, colors[index].collectionName);
					resolvedValue = `var(${aliasedColor})`;
				}
				else {
					let rgbaValue = value as RGBAmut;
					rgbaValue.a ??= 1;
					let culoriColor: Color = {
						mode: "rgb",
						r: rgbaValue.r,
						g: rgbaValue.g,
						b: rgbaValue.b,
						alpha: rgbaValue.a,
					}
					resolvedValue = toCSS(culoriColor) || "";
				}
				return {
					modeName: v.modes.find(mode => mode.modeId == modeId)!.name,
					value: resolvedValue,
				}
			})
			let lightValueMode = 
				valuesByMode.find(vmod => vmod.modeName.toLowerCase().includes("light")) ||
				valuesByMode.find(vmod => !vmod.modeName.toLowerCase().includes("dark"))!;
			let darkValueMode = valuesByMode.find(vmod => vmod.modeName.toLowerCase().includes("dark"))!;
			let otherValuesByMode = valuesByMode.filter(vmod => vmod !== darkValueMode && vmod != lightValueMode)
			return {
				key: v.key,
				varKey: key,
				lightValue: lightValueMode.value,
				darkValue: darkValueMode.value,
				otherValuesByMode
			}
		});
		let otherCssColors = cssColors.filter(color => color.otherValuesByMode.length);
		function toSafeCSSClassName(str: string) {
			return encodeURIComponent(str)
				.toLowerCase()
				.replace(/\.|%[0-9a-z]{2}/gi, (match) => {
					if (match == ".")
						return "\\."
					let decoded = decodeURIComponent(match);
					return decoded == " " ? "__" : "\\" + decoded
				});
		}
		console.log({data, cssColors});
		switch (genChoice) {
			case "light-dark": {
				generatedCss = 
`:root {
	${cssColors.map(color => `${color.varKey}: light-dark(${color.lightValue}, ${color.darkValue});`).join("\n\t")}
}
`
				break;
			}
			case "media":
			case "selector": {
				generatedCss =
`:root {
	${cssColors.map(color => `${color.varKey}: ${color.lightValue};`).join("\n\t")}
}
`
				let body = cssColors.map(color => `${color.varKey}: ${color.lightValue};`)
				if (genChoice == "selector") {
					generatedCss +=
`
${selector} {
	${body.join("\n\t")}
}
`
				} else {
					generatedCss +=
`
@media (prefers-color-scheme: dark) {
	:root {
		${body.join("\n\t\t")}
	}
}
`
				}
				break;
			}
		}
		if (otherCssColors.length) {
			let groupByMode = otherCssColors.reduce((p, color) => {
				color.otherValuesByMode.forEach(vmod => {
					if (!p[vmod.modeName]) {
						p[vmod.modeName] = [];
					}
					p[vmod.modeName].push([color.varKey, vmod.value])
				})
				return p;
			}, {} as Record<string, [string, string][]>);
			generatedCss += `${Object.keys(groupByMode).map(key => {
				let safeClassName = toSafeCSSClassName(key);
				return (
`html.${safeClassName} {
	${groupByMode[key].map(([varKey, value]) => `${varKey}: ${value};`).join("\n\t")}
}`)
			})}`
		}
		// tailwind
		generatedTailwind =
`export default {
	// ...
	theme: {
		// ...
		extend: {
			// ...
			colors: ${JSON.stringify(cssColors.reduce((p, color) => {
					let segments = color.key.split("/");
					function setKeyRecursively(object: NestedRecord, keyIndex = 0) {
						if (keyIndex + 1 != segments.length) {
							let obj = {};
							if (!(segments[keyIndex] in object)) {
								object[segments[keyIndex]] = obj;
							} else {
								obj = object[segments[keyIndex]];
							}
							setKeyRecursively(obj, keyIndex + 1);
						} else {
							object[segments[keyIndex]] = `var(${color.varKey})`
						}
					}
					setKeyRecursively(p);
					return p;
				}, {} as NestedRecord), undefined, "\t").replace(/\n/g, "\n\t\t\t")
			},
			// ...
		},
		// ...
	},
	// ...
}
`
		function crc32(str: string) {
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
		generatedCss = `/* crc32: ${crc32(generatedCss)} */\n${generatedCss}`
		generatedTailwind = `/* crc32: ${crc32(generatedTailwind)} */\n${generatedTailwind}`
	}
	let selector = $state("html.dark")
	let choices = [
		{ value: "light-dark", text: "light-dark()"},
		{ value: "selector", text: "CSS selector"},
		{ value: "media", text: "media query"},
	] as const;
	let genChoice: typeof choices[number]["value"] = $state(choices[0].value);
	$effect(() => {
		console.log({genChoice});
	})
	let cssFormatNames = ["hsl", "hwb", "lab", "lch", "oklab", "oklch", "hex", "rgb"] as const
	let cssFormats = [
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
	let chosenFormat: typeof cssFormatNames[number] = $state("hex");
	let chosenFormatIndex = $derived(cssFormats.findIndex((f) => f.value == chosenFormat));
	let _toCSS = $derived(cssFormats[chosenFormatIndex].converter || ((color: string | Color) => formatCss(converter(cssFormats[chosenFormatIndex].value as Mode)(color))));
	let toCSS = $derived((color: Color | string) => _toCSS(color)?.replace(/([0-9]*\.[0-9]{6})[0-9]*/g, "$1"));
	$effect(() => {
		// console.log({color, converted})
	})
	let generatedCss = $state("")
	let generatedTailwind = $state("")
</script>

<div bind:this={rootEl} class="w-full h-full flex flex-col items-stretch gap-4 bg-figma-bg p-4 min-h-0 max-h-[100vh] [scrollbar-width:thin]">
	<div class="self-start flex flex-col flex-wrap justify-start items-start gap-y-1 gap-x-4 basis-0 shrink grow min-h-0 overflow-auto">
		<Setting name="Color format:">
			<select bind:value={chosenFormat} class="font-mono rounded px-2 py-1 bg-figma-bg border-figma-border border">
				{#each cssFormats as format}
					<option value={format.value}>{format.text}</option>
				{/each}
			</select>
		</Setting>
		<Setting name="Dark mode method:">
			<select bind:value={genChoice} class="font-mono rounded px-2 py-1 bg-figma-bg border-figma-border border">
				{#each choices as choice}
					<option value={choice.value}>{choice.text}</option>
				{/each}
			</select>
		</Setting>
		{#if genChoice === "selector"}
			<Setting name="Selector:">
				<input class="p-1 bg-figma-bg-secondary border border-figma-border rounded font-mono" type="text" bind:value={selector}>
			</Setting>
		{/if}
		<Setting name="Prefix variables with collection name" class="py-1 flex-row-reverse">
			<input type="checkbox" bind:checked={prefixWithCollectionName}>
		</Setting>
	</div>
	<!-- <input type="text" class="bg-figma-bg-secondary border border-figma-border p-2" bind:value={color}> -->
	<div class="text basis-0 grow-[5] flex *:basis-0 *:grow gap-4">
		<div class="flex flex-col gap-2">
			<p class="text-figma-text-secondary">CSS</p>
			<textarea class="grow p-2 resize-none bg-figma-bg-secondary border border-figma-border rounded !outline-none font-mono leading-5" spellcheck="false" value={generatedCss}></textarea>
		</div>
		<div class="flex flex-col gap-2">
			<p class="text-figma-text-secondary">Tailwind</p>
			<textarea class="grow p-2 resize-none bg-figma-bg-secondary border border-figma-border rounded !outline-none font-mono leading-5" spellcheck="false" value={generatedTailwind}></textarea>
		</div>
	</div>
	<button class="bg-figma-bg-brand self-end font-bold border-none" onclick={async () => { generating = true; await generate(); generating = false }}
		>{generating ? "Generating..." : "Generate"}</button>
	
	<!-- <div class="flex flex-col gap-1">
		<div class="py-2">
			result: <code class="border border-figma-border p-2">{converted}</code>
		</div>
		<div class="py-2">
			revert: <code class="border border-figma-border p-2">{reverted}</code>
		</div>
		<div>
			equal: {color === reverted}
		</div>
	</div>
	<div class="flex gap-4 items-center justify-center">
		<div class="size-16 border border-white" style="background-color: {converted};"></div>
		<input type="color" class="bg-figma-bg-secondary size-16 border border-figma-border p-2" bind:value={color}>
	</div> -->
</div>

