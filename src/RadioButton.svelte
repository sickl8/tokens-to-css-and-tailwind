<script lang="ts">
    import { twMerge } from "tailwind-merge";

	export let name: string;
	export let value: string;
	export let group: string = "";
	let input: HTMLInputElement;
</script>

<button onclick={() => input.click() } {...$$restProps} class={twMerge($$restProps.class,`${group == input?.value ? "border-white" : ""}`)}>
	<input class="hidden" bind:this={input} type="radio" {name} bind:group {value} onchange={(e) => {
		console.log(e as any);
	}}>
	<slot></slot>
</button>

<style>
	input[type="radio"] {
		appearance: none;
	}
</style>