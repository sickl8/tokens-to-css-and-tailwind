import type { RemoteFunctions } from "./code";

let messageId = 0;

type Task = {
	promise: Promise<any>,
	resolve: (something: any) => void,
	id: number,
}

let tasks: Task[] = [];

export type PluginMessage<T extends keyof RemoteFunctions = any> = { pluginMessage: { type: keyof RemoteFunctions, messageId: number, data: Parameters<RemoteFunctions[T]> }, pluginId: string }

export function onMessage(event: MessageEvent<PluginMessage>) {
	let index = tasks.findIndex((t) => t.id == event.data.pluginMessage.messageId);
	let task = tasks[index];
	tasks.splice(index, 1);
	task.resolve(event.data.pluginMessage.data);
}

export function postMessage<T extends keyof RemoteFunctions>(type: T, ...data: Parameters<RemoteFunctions[T]>): ReturnType<RemoteFunctions[T]> {
	parent.postMessage({ pluginMessage: { type, data, messageId } }, '*');
	let res = (a: any) => {};
	let promise = new Promise((resolve) => {
		res = resolve;
	}) as ReturnType<RemoteFunctions[T]>;
	tasks.push({
		promise,
		resolve: res,
		id: messageId,
	})
	messageId++;
	return promise;
}

export type Invoke = typeof invoke;

export const invoke: RemoteFunctions = new Proxy({} as RemoteFunctions, { get(t, p: keyof RemoteFunctions, r) {
	return (...args: any[]) => {
		// @ts-ignore
		return postMessage(p, ...args);
	}
} })