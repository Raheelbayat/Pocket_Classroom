import Router from "./router.js";

window.app = {};
app.router = Router;

window.addEventListener('DOMContentLoaded', () => {
    app.router.init();
});