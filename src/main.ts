import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root #app was not found.');
}

app.innerHTML = `
  <section class="app-shell">
    <h1>Tibia Hunt Preparation</h1>
    <p>Build a hunt and compare elemental damage recommendations.</p>
  </section>
`;
