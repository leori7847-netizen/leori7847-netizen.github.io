import { readFile } from "node:fs/promises";

const routes = [
  "#/",
  "#/bank",
  "#/exam",
  "#/practice/python",
  "#/practice/labeling",
  "#/practice/flow",
  "#/practice/bbox",
  "#/practice/dify",
  "#/wrong",
  "#/analytics",
  "#/settings",
];

const questions = JSON.parse(await readFile(new URL("../data/questions.json", import.meta.url), "utf-8"));
const requiredTypes = ["python_coding", "text_labeling", "flow_design"];
const errors = [];

for (const type of requiredTypes) {
  if (!questions.some((q) => q.practiceType === type)) errors.push(`missing practiceType ${type}`);
}
for (const q of questions) {
  if (!q.sourcePages?.length) errors.push(`${q.id} missing sourcePages`);
  if (!q.rubric?.length) errors.push(`${q.id} missing rubric`);
}
const html = await readFile(new URL("../index.html", import.meta.url), "utf-8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf-8");
for (const route of routes) {
  if (!app.includes(route)) errors.push(`route not wired: ${route}`);
}
if (!html.includes("app.js")) errors.push("index.html does not load app.js");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${routes.length} routes and ${questions.length} questions.`);
