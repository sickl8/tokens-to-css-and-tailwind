import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

// FUCK YOUUUUUUUUUUUUUUUUUUUUUUU
// @ts-ignore
window.__VITE_PRELOAD__ = undefined;

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
