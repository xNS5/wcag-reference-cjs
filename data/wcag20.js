const {JSDOM} = require('jsdom');
const got = require('got');

const {getInnerText} = require('./helper/get-inner-text.js');
const {getDescription} = require('./helper/get-wcag-description.js');

/**
 * Extracts all needed information from https://www.w3.org/TR/WCAG20/
 *
 * @returns {Object}
 */
async function getWcag20information() {
	const url = 'https://www.w3.org/TR/WCAG20/';
	const html = (await got(url)).body;
	const {window: {document}} = new JSDOM(html);

	const information = {url};

	for (const node of document.querySelectorAll('.principle')) {
		const principleContainer = node.parentElement;

		// principle
		const principle = {};
		principle.id = node.querySelector('a').id;
		principle.text = getInnerText(node);

		// guidelines
		principle.guidelines = {};

		for (const guidelineNode of principleContainer.querySelectorAll('.guideline')) {
			const guidelineContainer = guidelineNode.parentElement;
			const guideline = {};
			guideline.id = guidelineNode.querySelector('a').id;
			guideline.text = getInnerText(guidelineNode.querySelector('h3'));
			guideline.detailedReference =
				guidelineNode.querySelector('a[href*="w3.org"]').href;
			// success criterion
			guideline.successCriterions = {};
			for (const successCriterionNode of guidelineContainer.querySelectorAll('.sc')) {
				const successCriterion = {};
				const handle = getInnerText(successCriterionNode.querySelector('.sc-handle'));
				successCriterion.id = successCriterionNode.id;
				successCriterion.num = handle.split(' ')[0];
				successCriterion.handle = handle.replaceAll(/([0-9]+.[0-9]+.[0-9]+ )/g, '').replace(':', '');
				successCriterion.description = getDescription(successCriterionNode, 0);
				successCriterion.quickReference = successCriterionNode
					.querySelector('a[href*="quickref"]').href;
				successCriterion.detailedReference = successCriterionNode
					.querySelector('a[href*="UNDERSTANDING-WCAG20"]').href;
				successCriterion.level = successCriterionNode
					.querySelector('.sctxt')
					.textContent.match(/Level (?<level>A{1,3})/)
					.groups.level.split('').length;

				guideline.successCriterions[successCriterion.num.match(/^\d\.\d\.(?<number>\d+)/).groups.number] = successCriterion;
			}

			principle.guidelines[
				guideline.text.match(
					/Guideline \d\.(?<number>\d)/
				).groups.number
			] = guideline;
		}

		information[
			principle.text.match(/Principle (?<number>\d)/).groups.number
		] = principle;
	}

	return information;
}

/**
 * Parses information about wcag 2.0 techniques from
 * https://www.w3.org/TR/WCAG20-TECHS/
 *
 * @returns {Object}
 */
async function getWcag20Techniques() {
	const url = 'https://www.w3.org/TR/WCAG20-TECHS/';
	const html = (await got(url)).body;
	const {
		window: {document},
	} = new JSDOM(html);

	// groups
	const techniqueGroups = {url};

	for (const node of document.querySelectorAll('.toc li > ul')) {
		const techniqueGroupElement = node.parentElement;

		const techniqueGroup = {};
		techniqueGroup.text = getInnerText(techniqueGroupElement.childNodes[0]);
		techniqueGroup.onePage = techniqueGroupElement.querySelector('a').href;

		// techniques
		techniqueGroup.techniques = {};

		for (const techniqueNode of node.querySelectorAll('li')) {
			const idMatch = techniqueNode.textContent.match(/^(?<id>\w+):/);

			if (!idMatch) {
				continue;
			}

			const technique = {};
			technique.text = getInnerText(techniqueNode);

			techniqueGroup.techniques[
				techniqueNode.textContent.match(/^(?<id>\w+):/).groups.id
			] = technique;
		}

		techniqueGroups[
			node
				.querySelector('li')
				.textContent.match(/^(?<id>[A-Za-z]+)/).groups.id
		] = techniqueGroup;
	}

	return techniqueGroups;
}

module.exports = {
	getWcag20information,
	getWcag20Techniques
};
