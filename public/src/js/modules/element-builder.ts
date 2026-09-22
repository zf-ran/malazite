type ElementBuilderAttributes = {
	[key: string]: any;
};

class ElementBuilder {
	public element: HTMLElement;

	constructor(tag: string) {
		this.element = document.createElement(tag);
	}

	public innerHTML(content: string): ElementBuilder {
		this.element.innerHTML = content;
		return this;
	}

	/** Set `innerText` of the element. */
	public text(content: string): ElementBuilder {
		this.element.innerText = content;
		return this;
	}

	/** Set attribute of the element, takes object of attributes. */
	public attributes(attributes: ElementBuilderAttributes): ElementBuilder {
		for (const [attribute, value] of Object.entries(attributes)) {
			if (typeof value === 'boolean')
				this.element.setAttribute(attribute, value.toString());
			else this.element.setAttribute(attribute, value);
		}

		return this;
	}

	public id(id: string): ElementBuilder {
		this.element.id = id;
		return this;
	}

	public classes(classes: string[]): ElementBuilder {
		for (const className of classes) {
			this.element.classList.add(className);
		}

		return this;
	}

	public appendTo(parent: HTMLElement): HTMLElement {
		parent.appendChild(this.element);
		return this.element;
	}

	public prependTo(parent: HTMLElement): HTMLElement {
		parent.prepend(this.element);
		return this.element;
	}
}

export default ElementBuilder;
