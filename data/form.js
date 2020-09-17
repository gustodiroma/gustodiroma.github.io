"use strict";
const phone = "34678277541";

function sendForm(event) {
	event.preventDefault();
	let inputs = event.target.elements;
	let text = `Reserva para Gusto Di Roma
Nombre: ${inputs.name.value}
Correo: ${inputs.email.value}
Teléfono: ${inputs.phone.value}
Fecha: ${inputs.date.value}
Hora: ${inputs.time.value}
Personas: ${inputs.partysize.value}
Comentarios: ${inputs.specialrequests.value}`;
	location.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
