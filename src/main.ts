import './styles.css';
import { loadMonsters } from './data/loadMonsters';
import { renderApp } from './ui/renderApp';

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('App root #app was not found.');
}

const appRoot = app;

appRoot.innerHTML = '<main class="app-shell"><p>Loading monster data...</p></main>';

async function bootstrap(): Promise<void> {
  try {
    const database = await loadMonsters();
    renderApp(appRoot, database);
  } catch (error) {
    appRoot.innerHTML = `
      <main class="app-shell">
        <h1>Hunt Element Planner</h1>
        <p class="warning">Could not load monster data. Please try again later.</p>
      </main>
    `;
    console.error(error);
  }
}

void bootstrap();
