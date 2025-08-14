document.addEventListener("DOMContentLoaded", function () {
  const expressionInput = document.getElementById('expressionInput');
  const tableTarget     = document.getElementById('table-target');
  // Función para eliminar el contenido del input
  // document.getElementById('clearButton').addEventListener('click', function() {
  //   document.getElementById('expressionInput').value = '';
  // });

  /* ========== Clear fórmula (y refrescar tabla) ========== */
  document
    .getElementById("clearButton")
    ?.addEventListener("click", function () {
      if (!expressionInput) return;
      expressionInput.value = "";
      // dispara el mismo flujo que al teclear (oninput="go()")
      expressionInput.dispatchEvent(new Event("input", { bubbles: true }));
      // por si tu go() no limpia del todo:
      if (tableTarget) tableTarget.innerHTML = "";
    });

  // Función para copiar el contenido del input
  document.getElementById("copyButton").addEventListener("click", function () {
    var input = document.getElementById("expressionInput");
    input.select();
    document.execCommand("copy");
  });
  // Función para copiar el contenido del input
  document.getElementById("copyButton").addEventListener("click", function () {
    var input = document.getElementById("expressionInput");
    input.select();
    document.execCommand("copy");
  });

  // Función para copiar la tabla de verdad generada
  document.getElementById("pasteButton").addEventListener("click", function () {
    var tableTarget = document.getElementById("table-target");
    var range = document.createRange();
    range.selectNode(tableTarget);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
  });

  /* ========== Botón global: Reiniciar todo ========== */
  document.getElementById("globalResetBtn")?.addEventListener("click", () => {
    // Fórmula + tabla
    if (expressionInput) {
      expressionInput.value = "";
      expressionInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (tableTarget) tableTarget.innerHTML = "";

    // IA: archivo + preview + respuesta + estado
    const exerciseImage = document.getElementById("exerciseImage");
    if (exerciseImage) exerciseImage.value = "";

    const imagePreview = document.getElementById("imagePreview");
    if (imagePreview) imagePreview.innerHTML = "";

    const aiAnswer = document.getElementById("aiAnswer");
    if (aiAnswer) aiAnswer.value = "";

    const aiStatus = document.getElementById("aiStatus");
    if (aiStatus) aiStatus.textContent = "";

    const aiFileName = document.getElementById("aiFileName");
    if (aiFileName) aiFileName.textContent = "Ningún archivo seleccionado";

    // (Opcional) scroll al inicio para ver todo limpio
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ========== Mostrar nombre de archivo elegido (opcional) ========== */
  const fileInput = document.getElementById("exerciseImage");
  const fileNameEl = document.getElementById("aiFileName");
  fileInput?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (fileNameEl)
      fileNameEl.textContent = f ? f.name : "Ningún archivo seleccionado";
  });
});
