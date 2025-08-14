document.addEventListener('DOMContentLoaded', function() {
    var simbolos = [
      { simbolo: '¬', nombre: 'Negación lógica' },
      { simbolo: '∧', nombre: 'Conjunción lógica' },
      { simbolo: '∨', nombre: 'Disyunción lógica' },
      { simbolo: '→', nombre: 'Implicación lógica' },
      { simbolo: '↔', nombre: 'Doble implicación lógica' }
    ];
  
    // Función para mostrar los símbolos en el contenedor
    function mostrarSimbolos() {
      var simbolosContainer = document.getElementById('simbolosContainer');
  
      simbolos.forEach(function(simboloInfo) {
        var btn = document.createElement('button');
        btn.textContent = simboloInfo.simbolo;
        btn.title = simboloInfo.nombre; // Añade un tooltip con el nombre del símbolo
        btn.onclick = function() {
          insertarSimbolo(simboloInfo.simbolo);
        };
        simbolosContainer.appendChild(btn);
      });
    }
  
    // Función para insertar un símbolo en el input
    function insertarSimbolo(simbolo) {
      var input = document.getElementById('expressionInput');
      var inicio = input.selectionStart;
      var fin = input.selectionEnd;
      var texto = input.value;
  
      // Insertar el símbolo en la posición actual del cursor
      var nuevoTexto = texto.substring(0, inicio) + simbolo + texto.substring(fin);
  
      // Actualizar el contenido del input
      input.value = nuevoTexto;
  
      // Mover el cursor después del texto insertado
      var nuevaPosicion = inicio + simbolo.length;
      input.setSelectionRange(nuevaPosicion, nuevaPosicion);
  
      // Enfocar el input
      input.focus();
    }
  
    // Llama a la función para mostrar los símbolos cuando el documento esté listo
    mostrarSimbolos();
  });
  