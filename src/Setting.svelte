<script lang="ts">
    import { twMerge } from "tailwind-merge";

	export let name = ""
	let Class = ""
	export { Class as class }
</script>

<label class={twMerge("flex items-center gap-2", Class)}>
	<span class="text-figma-text-secondary">{name}</span>
	<slot></slot>
</label>