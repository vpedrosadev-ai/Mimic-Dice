const checklist = [
  "Build the core dice rules and interactions in the web app",
  "Keep browser APIs isolated so Electron integration stays simple",
  "Use the same built frontend inside the desktop shell later"
];

const list = document.querySelector("#checklist");

for (const item of checklist) {
  const li = document.createElement("li");
  li.textContent = item;
  list.appendChild(li);
}
