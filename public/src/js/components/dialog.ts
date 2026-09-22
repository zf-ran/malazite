import ElementBuilder from '../modules/element-builder.js';
import { generateUUID } from '../modules/uuid.js';

interface DialogOptions {
	title: string;
	message?: string;
}

interface AlertOptions extends DialogOptions {
	dismissIcon?: string;
	dismissText?: string;
}

interface ConfirmOptions extends DialogOptions {
	cancelIcon?: string;
	cancelText?: string;
	confirmIcon?: string;
	confirmText?: string;
	destructive?: boolean;
}

type FormValue = string | number | null;
type FormValues = Record<string, FormValue>;

type FieldInput = FormValue | undefined;

interface FormField {
	name: string;
	label: string;
	type: 'text' | 'password' | 'number';
	defaultValue?: FormValue;
	required?: boolean;
	icon?: string;
}

interface FormOptions extends DialogOptions {
	fields: FormField[];
	cancelIcon?: string;
	cancelText?: string;
	confirmIcon?: string;
	confirmText?: string;
	destructive?: boolean;
}

const dialog = {
	async alert({
		title,
		message,
		dismissIcon,
		dismissText,
	}: AlertOptions): Promise<void> {
		if (!title) {
			console.error('Title is required in alerts.');
			return;
		}

		const { element: dialogElement, menu: menuElement } = createDialog({
			title,
			message,
		});

		dismissText ??= 'Dismiss';

		const dismissButton = createButton({
			icon: dismissIcon,
			text: dismissText,
			type: 'primary',
		}).appendTo(menuElement);

		// Closing
		return new Promise(resolve => {
			function dismiss() {
				resolve();
				dialogElement.classList.add('closing');
			}

			dismissButton.addEventListener('click', () => {
				dismiss();
			});

			dialogElement.addEventListener('keydown', event => {
				switch (event.key) {
					case 'Escape':
					case 'Enter':
						dismiss();
						break;
				}
			});
		});
	},

	async confirm({
		title,
		message,
		confirmIcon,
		confirmText,
		cancelIcon,
		cancelText,
		destructive,
	}: ConfirmOptions): Promise<boolean> {
		if (!title) {
			console.error('Title is required in confirmations.');
			return false;
		}

		const { element: dialogElement, menu: menuElement } = createDialog({
			title,
			message,
		});

		if (destructive) dialogElement.classList.add('destructive');

		cancelText ??= 'Cancel';
		confirmText ??= 'Yes';

		const cancelButton = createButton({
			icon: cancelIcon,
			text: cancelText,
			type: 'secondary',
		}).appendTo(menuElement);

		const confirmButton = createButton({
			icon: confirmIcon,
			text: confirmText,
			type: 'primary',
		}).appendTo(menuElement);

		// Closing
		return new Promise(resolve => {
			function cancel() {
				resolve(false);
				dialogElement.classList.add('closing');
			}

			cancelButton.addEventListener('click', () => {
				cancel();
			});

			confirmButton.addEventListener('click', () => {
				resolve(true);
				dialogElement.classList.add('closing');
			});

			dialogElement.addEventListener('keydown', event => {
				switch (event.key) {
					case 'Escape':
						cancel();
						break;
					case 'Enter':
						event.preventDefault();
						break;
				}
			});
		});
	},

	async form({
		title,
		message,
		confirmIcon,
		confirmText,
		cancelIcon,
		cancelText,
		fields,
		destructive,
	}: FormOptions): Promise<FormValues | null> {
		if (!title) {
			console.error('Title is required in forms.');
			return null;
		}

		const {
			id: dialogId,
			element: dialogElement,
			menu: menuElement,
			form: formElement,
		} = createDialog({ title, message });

		if (destructive) dialogElement.classList.add('destructive');

		cancelText ??= 'Cancel';
		confirmText ??= 'Yes';

		const cancelButton = createButton({
			icon: cancelIcon,
			text: cancelText,
			type: 'secondary',
		}).appendTo(menuElement);

		const confirmButton = createButton({
			icon: confirmIcon,
			text: confirmText,
			type: 'primary',
		}).appendTo(menuElement);

		// Fields
		const fieldsContainer = new ElementBuilder('div').classes([
			'dialog-inputs',
		]).element;

		menuElement.before(fieldsContainer);

		for (const field of fields) {
			const fieldId = generateUUID();

			const fieldElement = new ElementBuilder('div')
				.classes(['input-wrapper'])
				.id(`input-wrapper-${field.name}`)
				.appendTo(fieldsContainer);

			if (field.icon) {
				new ElementBuilder('span')
					.classes(['material-symbols-outlined', 'input-icon'])
					.text(field.icon)
					.appendTo(fieldElement);
			}

			const labelElement = new ElementBuilder('label')
				.attributes({
					for: `input-${fieldId}`,
				})
				.appendTo(fieldElement);

			new ElementBuilder('span')
				.classes(['input-label'])
				.text(field.label)
				.appendTo(labelElement);

			field.required ??= false;

			const inputElement = new ElementBuilder('input')
				.id(`input-${fieldId}`)
				.attributes({
					type: field.type,
					name: field.name,
					required: field.required,
					placeholder: field.label,
				})
				.appendTo(labelElement) as HTMLInputElement;

			if (typeof field.defaultValue !== 'undefined')
				inputElement.defaultValue = String(field.defaultValue ?? '');
		}

		// Closing
		return new Promise(resolve => {
			function cancel() {
				resolve(null);
				dialogElement.classList.add('closing');
			}

			function submit() {
				const formData = new FormData(formElement);

				const data = new Map<string, FieldInput>();

				for (const [key, value] of formData) {
					data.set(key, normalizeFormDataValue(value));
				}

				let fieldsIsValid = true;

				for (const field of fields) {
					const value = data.get(field.name);

					const fieldElement = document.getElementById(
						`input-wrapper-${field.name}`,
					);

					if (!fieldElement) continue;

					const { newValue, isValid, errorMessage } = parseField(field, value);

					if (!isValid) fieldElement.dataset.errorMessage = errorMessage ?? '';
					else fieldElement.dataset.errorMessage = '';

					fieldsIsValid &&= isValid;

					data.set(field.name, newValue);
				}

				if (!fieldsIsValid) return;

				resolve(Object.fromEntries(data) as FormValues);

				dialogElement.classList.add('closing');
			}

			cancelButton.addEventListener('click', () => {
				cancel();
			});

			confirmButton.addEventListener('click', () => {
				submit();
			});

			dialogElement.addEventListener('keydown', event => {
				switch (event.key) {
					case 'Escape':
						cancel();
						break;
					case 'Enter':
						submit();
						break;
				}
			});
		});
	},
};

function createDialog({ title, message }: DialogOptions) {
	const dialogId = generateUUID();

	const dialogElement = new ElementBuilder('dialog')
		.id(`dialog-${dialogId}`)
		.classes(['dialog-alert'])
		.attributes({
			role: 'dialog',
			'aria-labelledby': `dialog-${dialogId}-title`,
			'aria-modal': true,
		})
		.appendTo(document.body) as HTMLDialogElement;

	// Form
	const formElement = new ElementBuilder('form')
		.id(`dialog-${dialogId}-form`)
		.attributes({
			method: 'dialog',
		})
		.appendTo(dialogElement) as HTMLFormElement;

	// Heading
	const headingElement = new ElementBuilder('div')
		.classes(['dialog-heading'])
		.appendTo(formElement);

	// Title
	new ElementBuilder('h2')
		.innerHTML(title)
		.classes(['dialog-title'])
		.id(`dialog-${dialogId}-title`)
		.appendTo(headingElement);

	// Message
	if (message) {
		new ElementBuilder('p')
			.innerHTML(message)
			.classes(['dialog-message'])
			.appendTo(headingElement);
	}

	// Buttons
	const menuElement = new ElementBuilder('menu').appendTo(formElement);

	// Open and close event
	dialogElement.addEventListener('animationend', () => {
		if (dialogElement.classList.contains('opening'))
			dialogElement.classList.remove('opening');

		if (dialogElement.classList.contains('closing')) {
			dialogElement.classList.remove('closing');
			dialogElement.close();
			dialogElement.remove();
		}
	});

	// Opening
	dialogElement.showModal();
	dialogElement.classList.add('opening');

	// Closing is handled by each type of dialog

	return {
		id: dialogId,
		element: dialogElement,
		menu: menuElement,
		form: formElement,
	};
}

interface ButtonOptions {
	icon?: string;
	text?: string;
	type: 'primary' | 'secondary';
}

function createButton({ icon, text, type }: ButtonOptions): ElementBuilder {
	const button = new ElementBuilder('button').attributes({
		type: 'button',
	});

	if (!text) {
		button.element.classList.add('icon');
	}

	switch (type) {
		case 'primary':
			button.element.classList.add('primary');
			break;
		case 'secondary':
			button.element.classList.add('secondary');
			break;
	}

	if (!icon) button.element.innerHTML = `${text}`;
	else
		button.element.innerHTML = `<span class="material-symbols-outlined">${icon}</span> ${text}`;

	return button;
}

interface FieldFeedback {
	newValue: FormValue;
	errorMessage: string | null;
	isValid: boolean;
}

function normalizeFormDataValue(value: FormDataEntryValue): FieldInput {
	if (value instanceof File) return value.name || null;
	return value ?? undefined;
}

function parseField(field: FormField, value: FieldInput): FieldFeedback {
	const feedback: FieldFeedback = {
		newValue: value ?? null,
		errorMessage: null,
		isValid: true,
	};

	switch (field.type) {
		case 'number': {
			if (value === undefined || value === null || value === '') {
				if (field.required) {
					feedback.errorMessage = 'This field must be a number!';
					feedback.isValid = false;
				} else {
					feedback.newValue = null;
				}
				break;
			}

			const numericValue = Number(value);
			if (Number.isNaN(numericValue)) {
				feedback.errorMessage = 'This field must be a number!';
				feedback.isValid = false;
				break;
			}

			feedback.newValue = numericValue;
			break;
		}
		case 'text':
		case 'password': {
			const stringValue =
				typeof value === 'number' ? String(value) : (value ?? '');
			if (stringValue.trim().length === 0 && field.required) {
				feedback.errorMessage = 'This field is requied!';
				feedback.isValid = false;
				break;
			}
			feedback.newValue = stringValue;
			break;
		}
	}

	return feedback;
}

export default dialog;
