import 'bootstrap/dist/css/bootstrap.css'
//import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import CKEditor from '@ckeditor/ckeditor5-vue';

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use( CKEditor )

app.mount('#app')
