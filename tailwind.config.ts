import type { Config } from "tailwindcss";

export default {
	content: ['./src/**/*.{html,js,svelte,ts}', "./index.html"],
	theme: {
		extend: {
			colors: {
				figma: ["bg", "bg-secondary", "border", "text", "icon", "text-secondary", "bg-brand"].reduce((p, c) => {
					p[c] = `var(--figma-color-${c})`
					return p;
				}, {} as Record<string, string>)
			},
		},
	},
	plugins: [],
} satisfies Config;

