<script lang="ts">
	import { onMount } from "svelte";
    import { generate } from "./generate";

	let { value = $bindable() } = $props();
	let editorEl = $state() as HTMLDivElement;
	// let iframe = $state() as HTMLIFrameElement;
	// window.addEventListener("message", (msg) => console.log({msg}));
	// onMount(() => {
	// 	let listener = (e: Event) => {
	// 		let { data } = e as Event & { data: { type: string, value: string } };
	// 		console.log("listener called?", { data });
	// 		switch (data.type) {
	// 			case "ready": {
	// 				console.log({value});
	// 				iframe.contentWindow?.postMessage(
	// 					{
	// 						type: "change-value",
	// 						value,
	// 					},
	// 					"*",
	// 				);
	// 				break;
	// 			}
	// 			case "change": {
	// 				// console.log("current value is", data.value);
	// 				let _ = { value } = data;
	// 				break;
	// 			}
	// 		}
	// 	};
	// 	// window.top.addEventListener("message", listener);
	// 	console.log({iframe})
	// 	// iframe.contentWindow?.addEventListener("message", () => {
	// 	// 	console.log("fired?");
	// 	// })
	// 	iframe.addEventListener("message", listener, {  });
	// 	iframe.addEventListener("load", () => {
	// 		console.log("loaded iframe");
	// 	})
	// 	console.log("added listener");
	// 	return () => {
	// 		// window.removeEventListener("message", listener);
	// 		iframe.removeEventListener("message", listener);
	// 	}
	// });
</script>

<div bind:this={editorEl}></div>
<textarea
	class="
		size-full
		whitespace-pre
		overflow-x-auto
		p-2 resize-none
		bg-figma-bg-secondary
		border
		border-figma-border
		rounded
		!outline-none
		font-mono
		leading-5
	"
	spellcheck="false"
	bind:value
></textarea>
<!-- <iframe
	bind:this={iframe}
	class="grow"
	title="editor"
	src="https://embeddable-monaco.lukasbach.com?code=&language=javascript&theme=vs-dark"
></iframe>
<button onclick={() => iframe.contentWindow?.postMessage(
	{
		type: "change-value",
		value,
	},
	"*",
)}>change value</button> -->
