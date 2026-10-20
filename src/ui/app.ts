import { de } from "../text/de";

// The UI reads simulation state and sends commands; it never mutates state directly.
export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <main>
      <h1>${de.title}</h1>
      <p>${de.tagline}</p>
    </main>
  `;
}
