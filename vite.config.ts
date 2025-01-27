import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Plugin } from 'vite';
import { parse, HTMLElement } from 'node-html-parser';
import { parse as parseJs } from "acorn";
import * as walk from "acorn-walk";

function inlineStylesAndScripts(): Plugin {
	return {
		name: 'vite-plugin-inline-styles-scripts',
		enforce: 'post',
		async generateBundle(_, bundle) {
			// Find the HTML files
			const htmlFiles = Object.keys(bundle).filter((file) => file.endsWith('.html'));

			htmlFiles.forEach((htmlFile) => {
				const htmlAsset = bundle[htmlFile];

				if (htmlAsset.type === 'asset' && typeof htmlAsset.source === 'string') {
					const root = parse(htmlAsset.source);

					// Inline styles
					const styles = Object.keys(bundle).filter((file) => file.endsWith('.css'));
					styles.forEach((styleFile) => {
						const styleAsset = bundle[styleFile];
						if (styleAsset.type === 'asset' && typeof styleAsset.source === 'string' && root.querySelectorAll(`link[href$="${styleFile}"]`).length) {
							// Create a <style> tag with the CSS content
							const styleTag = new HTMLElement('style', {}, '');
							styleTag.set_content(styleAsset.source);

							// Append the <style> tag to the <head>
							root.querySelector('head')?.appendChild(styleTag);

							// Remove the <link> tag referencing this CSS file
							root.querySelectorAll(`link[href$="${styleFile}"]`).forEach((linkTag) => linkTag.remove());

							// Remove the CSS file from the bundle
							delete bundle[styleFile];
						}
					});

					// Inline scripts
					const scripts = Object.keys(bundle).filter((file) => file.endsWith('.js'));
					scripts.forEach((scriptFile) => {
						const scriptAsset = bundle[scriptFile];
						if (scriptAsset.type === 'chunk' && typeof scriptAsset.code === 'string' && root.querySelectorAll(`script[src$="${scriptFile}"]`).length) {
							// Create a <script> tag with the JS content
							const scriptTag = new HTMLElement('script', {}, '');

							// Collect comments during parsing
							const comments: { block: boolean; text: string; start: number; end: number }[] = [];

							parseJs(scriptAsset.code, {
								ecmaVersion: "latest",
								locations: true,
								onComment: (block, text, start, end) => {
									// Collect comments for later removal
									comments.push({ block, text, start, end });
								},
							});
							
							// Remove comments by slicing them out of the original code
							// this bug was discovered only when I turned off minification in vite to see what's going on
							// why? because without removing the comments, when the script tags are appended to the html,
							// some idiot interprets the tag-like phrases in the javascript as, you guessed it,
							// actual html tags, so what does he do? he "fixes" them, a comment like:
							// /** Source<number> */
							// turns into:
							// /** Source</number> */
							// and he also adds one at the end of the script tag, making the js invalid
							// fuck you
							let cleanedCode = scriptAsset.code;
							for (let i = comments.length - 1; i >= 0; i--) {
								const { start, end } = comments[i];
								cleanedCode = cleanedCode.slice(0, start) + cleanedCode.slice(end);
							}

							scriptTag.set_content(cleanedCode);

							// Append the <script> tag to the <body>
							root.querySelector('body')?.appendChild(scriptTag);

							// Remove the <script> tag referencing this JS file
							root.querySelectorAll(`script[src$="${scriptFile}"]`).forEach((scriptTag) => scriptTag.remove());

							// Remove the JS file from the bundle
							delete bundle[scriptFile];
						}
					});

					// Update the HTML asset
					htmlAsset.source = root.toString();
				}
			});
		},
	};
}

export default defineConfig({
	plugins: [
		svelte(),
		inlineStylesAndScripts()
	],
	build: {
		minify: false,
		rollupOptions: {
			input: {
				"index": "./index.html",
				"code": "./src/code.ts",
			},
			output: {
				entryFileNames: "[name].js",
			}
		}
	}
})
