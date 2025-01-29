<script lang="ts">
    import { twMerge } from "tailwind-merge";

	export let title: string;
	export let value: string;
	export { Class as class }
	let Class = ""
	const copyText = "Copy"
	let copyButtonText = copyText;
	let ta: HTMLTextAreaElement;
</script>

<div class={twMerge("flex flex-col gap-2", Class)}>
	<p class="text-figma-text-secondary">{title}</p>
	<div class="grow relative">
		<button class="absolute right-4 top-4 bg-black/50" onclick={() => {
			let currentFocus = document.activeElement
			try {
				ta.focus();
				ta.select();
				document.execCommand("copy")
				copyButtonText = "Copied!"
				setTimeout(() => {
					copyButtonText = copyText;
				}, 1000)
			} catch {}
			if (currentFocus instanceof HTMLElement) {
				currentFocus.focus();
			}
		}}>
			{copyButtonText}
		</button>
		<textarea bind:this={ta} class="
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
		" spellcheck="false" bind:value></textarea>
	</div>
</div>