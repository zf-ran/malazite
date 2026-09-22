import ElementBuilder from '../modules/element-builder.js';
import { generateUUID } from '../modules/uuid.js';

interface ToastOptions {
	title?: string;
	message: string;
	timeMs?: number;
}

function toast({ title, message, timeMs }: ToastOptions): void {
	if (!message) {
		console.error('Message is required in toasts');
		return;
	}

	const toastContainer =
		document.getElementById('toast-container')
		?? new ElementBuilder('div').id('toast-container').appendTo(document.body);

	timeMs ??= 5_000;

	const toastId = generateUUID();

	const toastElement = new ElementBuilder('div')
		.classes(['toast'])
		.id(`toast-${toastId}`)
		.appendTo(toastContainer as HTMLElement);

	toastElement.style.setProperty('--time', `${timeMs}ms`);

	if (title) {
		new ElementBuilder('h5')
			.innerHTML(title)
			.classes(['toast-title'])
			.appendTo(toastElement);
	}

	new ElementBuilder('p')
		.innerHTML(message)
		.classes(['toast-message'])
		.appendTo(toastElement);

	toastElement.classList.add('opening');

	const toastTimeout = setTimeout(() => {
		closeToast();
	}, timeMs);

	toastElement.addEventListener('click', () => {
		closeToast();
	});

	toastElement.addEventListener('animationend', () => {
		if (toastElement.classList.contains('opening'))
			toastElement.classList.remove('opening');

		if (toastElement.classList.contains('closing')) toastElement.remove();
	});

	function closeToast(): void {
		toastElement.classList.add('closing');
		clearTimeout(toastTimeout);
	}
}

export default toast;
