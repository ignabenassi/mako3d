document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
  
    if (!form) return;
  
    const email = document.getElementById('email');
    const phone = document.getElementById('phone');
    const message = document.getElementById('message');
  
    // Oculta el mensaje al empezar a editar
    [email, phone, message].forEach(field => {
      field.addEventListener('input', () => {
        status.classList.remove('success', 'error', 'show');
        status.style.display = 'none';
      });
    });
  
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
  
      // Validaciones
      if (!email.value || !email.validity.valid) {
        status.innerText = "Por favor, ingresá un correo electrónico válido.";
        status.classList.add('error', 'show');
        status.style.display = 'block';
        return;
      }
  
      const phonePattern = /^\+?[\d\s\-()]{10,18}$/;
      if (!phone.value || !phonePattern.test(phone.value)) {
        status.innerText = "Por favor, ingresá un número de celular válido.";
        status.classList.add('error', 'show');
        status.style.display = 'block';
        return;
      }
  
      const formData = new FormData(form);
  
      status.classList.remove('success', 'error', 'show');
      status.style.display = 'none';
  
      try {
        const response = await fetch(form.action, {
          method: form.method,
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });
  
        if (response.ok) {
          status.innerText = "¡Mensaje enviado correctamente!";
          status.classList.add('success', 'show');
          status.style.display = 'block';
          form.reset();
        } else {
          const data = await response.json();
          status.innerText = data.errors
            ? data.errors.map(error => error.message).join(", ")
            : "Hubo un error al enviar el mensaje.";
          status.classList.add('error', 'show');
          status.style.display = 'block';
        }
      } catch (error) {
        status.innerText = "No se pudo enviar. Intentá de nuevo.";
        status.classList.add('error', 'show');
        status.style.display = 'block';
      }
    });
  });
  