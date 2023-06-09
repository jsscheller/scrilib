window.addEventListener("message", async (e) => {
  if (e.data["type"] === "init") {
    await window["root"]["init"](e.data["input"]);
  }
});
window.parent.postMessage({ type: "load" }, "*");
