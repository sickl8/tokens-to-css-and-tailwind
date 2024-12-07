<script lang="ts">
	import tw from "./assets/tailwind.svg";
	import vt from "./assets/vite.svg";
	import sv from "./assets/svelte.svg";
	let count = 0;
</script>

<div class="w-full h-full flex flex-col justify-center items-center gap-4 bg-zinc-800">
	<div class="flex gap-4 items-center">
		<img src={vt} alt="" class="size-16">
		<img src={sv} alt="" class="size-16">
		<img src={tw} alt="" class="size-16">
	</div>
	<h1 class="text-3xl text-white">Vite + Svelte + Tailwind</h1>
	<button class="border-white border py-2 px-4 rounded-md" onclick={() => count++}>Count is {count}</button>
</div>