import ElementBuilder from '../modules/element-builder';

export interface TabOption {
	id: string;
	label: string;
	selected?: boolean;
}

export interface TabItem {
	id: string;
	label: string;
	button: HTMLButtonElement;
	panel: HTMLElement; // <section>
	activate: () => void;
}

export function createTab(
	container: HTMLElement,
	options: TabOption[],
): TabItem[] {
	const tabContainer = new ElementBuilder('div')
		.classes(['tabs'])
		.attributes({
			role: 'tablist',
		})
		.appendTo(container);

	const tabItems: TabItem[] = [];

	for (const option of options) {
		const isSelected = option.selected ?? false;

		const tabButton = new ElementBuilder('button')
			.id(`${option.id}-tab`)
			.classes(['tab'])
			.attributes({
				'aria-selected': isSelected,
				'aria-controls': `${option.id}-panel`,
				role: 'tab',
			})
			.text(option.label)
			.appendTo(tabContainer) as HTMLButtonElement;

		const tabPanel = new ElementBuilder('section')
			.id(`${option.id}-panel`)
			.classes(['panel'])
			.attributes({
				'aria-labelledby': `${option.id}-tab`,
				role: 'tabpanel',
			})
			.appendTo(container);

		if (isSelected) {
			tabButton.classList.add('tab-active');
			tabPanel.classList.add('panel-active');
		} else {
			tabPanel.setAttribute('hidden', '');
		}

		tabItems.push({
			id: option.id,
			label: option.label,
			button: tabButton,
			panel: tabPanel,
			activate: () => {},
		});
	}

	for (const tabItem of tabItems) {
		tabItem.activate = () => {
			for (const otherTabItem of tabItems) {
				otherTabItem.button.classList.remove('tab-active');
				otherTabItem.button.setAttribute('aria-selected', 'false');

				otherTabItem.panel.classList.remove('panel-active');
				otherTabItem.panel.setAttribute('hidden', '');
			}

			tabItem.button.classList.add('tab-active');
			tabItem.button.setAttribute('aria-selected', 'true');

			tabItem.panel.classList.add('panel-active');
			tabItem.panel.removeAttribute('hidden');
		};
	}

	for (const tabItem of tabItems) {
		tabItem.button.addEventListener('click', () => {
			tabItem.activate();
		});
	}

	return tabItems;
}
