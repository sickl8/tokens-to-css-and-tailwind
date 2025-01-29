import type { Invoke } from "./api";
import type { Settings } from "./App.svelte";
import type { ColorFormat } from "./data";

type Mutable<T> = {
	-readonly[P in keyof T]: T[P]
};

type NestedRecord = { [k: string]: string | NestedRecord }

export type RGBAmut = Mutable<RGBA>;

export type UtilFunctions = {
	figmaColorToCssValue: (color: RGBAmut, format: ColorFormat) => string | undefined
	crc_32: (data: string) => number
}

// @preserve
export async function generate(
		variables: Awaited<ReturnType<Invoke["getAllVariables"]>>,
		{
			prefixWithCollectionName,
			darkModeMethod,
			colorFormat,
			darkModeCssSelector
		}: Settings,
		{
			figmaColorToCssValue,
			crc_32,
		}: UtilFunctions) {
	let generatedCss = "";
	let generatedTailwind = "";
	function stringify(obj: string | NestedRecord, level = 0) {
		function isValidJSObjectKey(str: string) {
			try {
				/* comment */
				let fn = new Function(`
					let obj = {
						${str}: "__value__",
					}
					return ${JSON.stringify(str)} in obj && obj[${JSON.stringify(str)}] === "__value__";
				`)
				return fn(str);
			} catch {
				return false;
			}
		}

		let indent = "\t".repeat(level);
		let indentPlusOne = "\t".repeat(level + 1);
		return typeof obj === "string" ? JSON.stringify(obj) :
`{
${indentPlusOne}${
	Object.keys(obj).map(
		(key): string => `${isValidJSObjectKey(key) ? key : JSON.stringify(key)}: ${stringify(obj[key], level + 1)}`
	).join(",\n" + indentPlusOne)
}
${indent}}`
	}
	function generateCSSVarNameFromKey(key: string, colName: string) {
		return "--" + (colName + "-").repeat(+prefixWithCollectionName) + key.replace(/\//g, "-");
	}
	function stringCmp(a: string, b: string) {
		if (a < b) {
			return -1;
		} else if (b < a) {
			return 1;
		}
		return 0;
	}
	let colors = variables.filter((v) => v.type === "COLOR").toSorted((a, b) => {
		let cmpColName = stringCmp(a.collectionName, b.collectionName);
		return cmpColName || stringCmp(a.key, b.key) 
	} );
	let cssColors = colors.map(v => {
		let key = generateCSSVarNameFromKey(v.key, v.collectionName);
		let valuesByMode = Object.entries(v.valuesByMode).map(([modeId, value]) => {
			let resolvedValue = "";
			if ((value as VariableAlias).type === "VARIABLE_ALIAS") {
				let valueAlias = value as VariableAlias;
				let index = colors.findIndex(color => color.variableId == valueAlias.id);
				let aliasedColor = generateCSSVarNameFromKey(colors[index].key, colors[index].collectionName);
				resolvedValue = `var(${aliasedColor})`;
			}
			else { // value.type === "COLOR"
				
				resolvedValue = figmaColorToCssValue(value as RGBAmut, colorFormat) || "";
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
	switch (darkModeMethod) {
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
			if (darkModeMethod == "selector") {
				generatedCss +=
`
${darkModeCssSelector} {
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
			colors: ${stringify(cssColors.reduce((p, color) => {
					let segments = color.key.split("/");
					// if (firstSegmentLast) {
					// 	let firstEl = segments.shift();
					// 	if (firstEl) {
					// 		segments.push(firstEl);
					// 	}
					// }
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
				}, {} as NestedRecord)
				// , undefined, "\t"
				, 3
				)
				// .replace(/\n/g, "\n\t\t\t")
			},
			// ...
		},
		// ...
	},
	// ...
}
`
	
	generatedCss = `/* crc32: ${crc_32(generatedCss)} */\n${generatedCss}`
	generatedTailwind = `/* crc32: ${crc_32(generatedTailwind)} */\n${generatedTailwind}`

	return {
		generatedCss,
		generatedTailwind
	};
}