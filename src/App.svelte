<script lang="ts" module>
	export type Settings = {
		prefixWithCollectionName: boolean;
		darkModeMethod: typeof genChoices[number]["value"];
		darkModeCssSelector: string;
		colorFormat: ColorFormat;
	};
</script>

<script lang="ts">
    import { onMount } from "svelte";
    import { invoke, onMessage } from "./api";
    import RadioButton from "./RadioButton.svelte";
    import type { Interactable } from "@interactjs/types";
    import interact from "interactjs";
	import { parse, converter, type Color, formatHex, formatHex8, type Mode, formatCss, formatRgb } from "culori";
    import Setting from "./Setting.svelte";
    import Textarea from "./Textarea.svelte";
    import Editor from "./Editor.svelte";
    import { crc32, cssFormatNames, cssFormats, genChoices, type ColorFormat } from "./data";
    import { generate, type RGBAmut } from "./generate";

	let rootEl: HTMLElement;
	let resizable: Interactable;

	async function generateWrapper() {
		let gen = generate;
		if (useModifiedCodegen) {
			// let newGen = (await (new Function(`im${""}port("data:application/javascript;base64,${btoa(codegenCode)}")`))()).generate;
			let newGen = (await import (`data:application/javascript;base64,${btoa(codegenCode)}`)).generate;
			if (newGen) {
				gen = newGen;
			}
			console.log({gen: gen.toString()});
		}
		let _ = { generatedCss, generatedTailwind } = await gen(await invoke.getAllVariables(), {
			...settings
		}, {
			crc_32: crc32,
			figmaColorToCssValue: (color, format) => {
				let chosenFormatIndex = cssFormats.findIndex((f) => f.value == format)
				let _toCSS = cssFormats[chosenFormatIndex].converter || ((color: string | Color) => formatCss(converter(cssFormats[chosenFormatIndex].value as Mode)(color)))
				let toCSS = (color: Color | string) => _toCSS(color)?.replace(/([0-9]*\.[0-9]{6})[0-9]*/g, "$1")
				let rgbaValue = color as RGBAmut;
				rgbaValue.a ??= 1;
				let culoriColor: Color = {
					mode: "rgb",
					r: rgbaValue.r,
					g: rgbaValue.g,
					b: rgbaValue.b,
					alpha: rgbaValue.a,
				}
				return toCSS(culoriColor)
			}
		});
	}
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

	let settings: Settings = $state({
		colorFormat: "hex",
		darkModeCssSelector: "html.dark",
		darkModeMethod: "light-dark",
		prefixWithCollectionName: true,
	})

	let firstSegmentLast = $state(false);

	let generating = $state(false);
	let generatedCss = $state("")
	let generatedTailwind = $state("")
	let codegen = $state(false);
	let codegenCode = $state("export " + generate.toString());
	let useModifiedCodegen = $state(false);
	
	// $effect(() => {
	// 	console.log({genChoice});
	// })
</script>

<div bind:this={rootEl} class="w-full h-full flex flex-col items-stretch gap-4 bg-figma-bg p-4 min-h-0 max-h-[100vh] [scrollbar-width:thin]">
	{#if !codegen}
		<div class="self-start flex flex-col flex-wrap justify-start items-start gap-y-1 gap-x-4 basis-0 shrink grow min-h-0 overflow-auto">
			<Setting name="Color format:">
				<select bind:value={settings.colorFormat} class="font-mono rounded px-2 py-1 bg-figma-bg border-figma-border border">
					{#each cssFormats as format}
						<option value={format.value}>{format.text}</option>
					{/each}
				</select>
			</Setting>
			<Setting name="Dark mode method:">
				<select bind:value={settings.darkModeMethod} class="font-mono rounded px-2 py-1 bg-figma-bg border-figma-border border">
					{#each genChoices as choice}
						<option value={choice.value}>{choice.text}</option>
					{/each}
				</select>
			</Setting>
			{#if settings.darkModeMethod === "selector"}
				<Setting name="Dark mode selector:">
					<input class="p-1 bg-figma-bg-secondary border border-figma-border rounded font-mono" type="text" bind:value={settings.darkModeCssSelector}>
				</Setting>
			{/if}
			<Setting name="Prefix CSS variables with collection name" class="flex-row-reverse">
				<input type="checkbox" bind:checked={settings.prefixWithCollectionName}>
			</Setting>
			<Setting name="Make the parent group the last one" class="flex-row-reverse">
				<input type="checkbox" bind:checked={firstSegmentLast}>
			</Setting>
			<Setting name="Use modified codegen function" class="flex-row-reverse">
				<input type="checkbox" bind:checked={useModifiedCodegen}>
			</Setting>
			{#if useModifiedCodegen}
				<Setting>
					<button onclick={() => codegen = true} class="py-[calc(0.5rem-2px)]">Modify codegen function</button>
				</Setting>
			{/if}
		</div>
		<div class="text basis-0 grow-[5] flex *:basis-0 *:grow gap-4">
			<Textarea title="CSS" bind:value={generatedCss}></Textarea>
			<Textarea title="Tailwind" bind:value={generatedTailwind}></Textarea>
		</div>
		<button class="bg-figma-bg-brand self-end font-semibold border-none"
			onclick={async () => { generating = true; await generateWrapper(); generating = false }}
			>{generating ? "Generating..." : "Generate"}</button>
	{:else}
		<div>
			<button onclick={() => codegen = false}>Go Back</button>
			<button onclick={() => codegenCode = "export " + generate.toString()}>Reset</button>
		</div>
		<!-- <Editor bind:value={codegenCode}></Editor> -->
		<Textarea bind:value={codegenCode} title="Codegen function" class="grow"></Textarea>
	{/if}
</div>

