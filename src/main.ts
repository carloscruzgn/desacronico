import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
// Antes que la portada: el aviso de que se puede instalar llega una vez y pronto.
import './lib/instalar.svelte'

export default mount(App, { target: document.getElementById('app')! })
