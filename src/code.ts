import type { PluginMessage } from "./api";

const uiopts = {
	height: 300,
	width: 500,
	themeColors: true,
	setDims(x, y) {
		this.height = y;
		this.width = x;
		figma.clientStorage.setAsync("uiopts", { height: this.height, width: this.width } satisfies Dimensions);
	}
} satisfies ShowUIOptions & { setDims: (x: number, y: number) => void };

type Dimensions = {
	height: number,
	width: number,
}

(async () => {
	let data: Dimensions | undefined = await figma.clientStorage.getAsync("uiopts");
	if (data) {
		uiopts.height = data.height;
		uiopts.width = data.width;
	}
	let copy: Record<string, any> = Object.assign({}, uiopts);
	delete copy.setDims;
	figma.showUI(__html__, copy);
})()

// figma.ui.reposition()

export type RemoteFunctions = typeof functions;

const functions = {
	async getAllVariables() {
		const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
		return (await Promise.all(localCollections.map(async (col) => (await Promise.all(col.variableIds.map(
			varId => figma.variables.getVariableByIdAsync(varId)))).filter(vr => !!vr).map(v => {
				return {
					key: v.name,
					valuesByMode: v.valuesByMode,
					type: v.resolvedType,
					variableId: v.id,
					collectionName: col.name,
					collectionId: col.id,
					modes: col.modes,
				}
			}
		)))).flat();
	},
	async resize(x: number, y: number) {
		uiopts.setDims(x, y);
		return figma.ui.resize(x, y);
	},
	async resizeDelta(dx: number, dy: number) {
		uiopts.setDims(uiopts.width + dx, uiopts.height + dy)
		return figma.ui.resize(uiopts.width, uiopts.height);
	},
	async reposition(x: number, y: number) {
		return figma.ui.reposition(x, y);
	},
	async getViewport() {
		return {
			center: figma.viewport.center,
			bounds: figma.viewport.bounds,
			zoom: figma.viewport.zoom,
		};
	},
} as const satisfies Record<string, (...args: any[]) => Promise<any>>;

function postMessage(message: { messageId: number, data: any }) {
	figma.ui.postMessage(message);
}

figma.ui.onmessage = async (msg: PluginMessage<keyof typeof functions>["pluginMessage"]) => {
	postMessage({ messageId: msg.messageId, data: await (functions[msg.type] as (...args: any[]) => Promise<any>).apply(null, msg.data as any) });
};
