import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { Plugin } from 'vite';
import { parse, HTMLElement } from 'node-html-parser';

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
							scriptTag.set_content(scriptAsset.code);

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
	plugins: [svelte(), inlineStylesAndScripts()],
	build: {
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
