/* eslint max-params: "off" */
/* eslint consistent-return: "off" */
/* eslint no-param-reassign: "off" */
/* eslint no-implicit-coercion: "off" */

import 'classlist-polyfill';
// eslint-disable-next-line
import Promise from 'bluebird';

import writeChar, {
	writeSimpleChar, handleChar, writeTerminal, handleTerminalChar,
} from './lib/writeChar';

// template
import containerHTML from './views/container.html';
import whyJoinUsHTML from './views/whyJoinUs.html';
import workTextTitleRaw from './views/workTextTitle.html';
import introCEOTitleRaw from './views/introCEOTitle.html';
import preStyles from './styles/prestyles.css';
import replaceURLs from './lib/replaceURLs';
import insetStyleVariable from './lib/insetStyleVariable';
import template from './lib/template';
import {runScroll} from './lib/animate';

import getPrefix from './lib/getPrefix';
import isMobile from './lib/isMobile';
import getMd from './lib/getMd';

import {workImgs, teddyImg, logoImg} from './lib/imgs';

import easterEgg from './lib/easterEgg';
import ga from './lib/ga';

const workText = [0].map(function (i) {
	return require('./views/work' + i + '.md');
});
const introText = [0, 1].map(function (i) {
	return require('./views/intro' + i + '.md');
});

// image element
const aftershipTitle = template(workTextTitleRaw, {logoImg});
const introCEOTitle = template(introCEOTitleRaw, {teddyImg});

let styleText = [0, 1, 2, 3, 4, 5, 6].map(function (i) {
	const txt = require('./styles/styles' + i + '.css');
	return insetStyleVariable(txt);
});

// Vars that will help us get er done
const isDev = window.location.hostname === 'localhost';
const speed = isDev ? 0 : 16;

// Type speed: code * 0.5  comment * 1  words * 1.5  begining * 2.5
const codeSpeed = speed * 0;
const codeCommentSpeed = speed * 1;
const wordsSpeed = speed * 1;
const beginingSpeed = speed * 2;
const endSpeed = speed * 2;


// Chars per type: words comment * 1  link code * 2
// NOTE: code chars can only be 1 per typing.
const wordsTypingChars = 1;
const linkTypingChars = 2;

const PAGE_PADDING = 12;
let containerEl;
let contentEl;
let contentElH;
let style;
let styleEl;
let workEl;
let introEl;
let skipAnimationEl;
let pauseEl;
let animationSkipped = false;
let done = false;
let paused = false;
let browserPrefix;
// Wait for load to get started.
document.addEventListener('DOMContentLoaded', function () {
	populateContainer();
	preSetStyle();
	getBrowserPrefix();
	getEls();
	createEventHandlers();
	startAnimation();
	!isDev && easterEgg();
	!isDev && ga();
});

async function startAnimation() {
	try {
		await writeTo(styleEl, styleText[0], 0, beginingSpeed, true, wordsTypingChars, 'fixed-speed'); // introduction
		await writeTo(styleEl, styleText[1], 0, codeSpeed, true, 1); // initial styling
		await fastWrite(workEl, aftershipTitle); // md of company introduction
		await writeTo(workEl, workText[0], 0, wordsSpeed, false, wordsTypingChars); // md of company introduction
		createWorkBox();	// convert md
		await Promise.delay(800);

		await scrollToMdBottom(workEl); // scroll to the badge
		await writeTo(styleEl, styleText[3], 0, codeSpeed, true, 1); // continue to add work text
		await addMoreWorkIntro(workEl, whyJoinUsHTML); // add more text
		await writeTo(styleEl, styleText[6], 0, codeSpeed, true, 1); // md styling, prepare to show CEO introduction
		await fastWrite(introEl, introCEOTitle);
		await writeTo(styleEl, styleText[4], 0, codeSpeed, true, 1); // nothing
		await writeTo(introEl, introText[1], 0, endSpeed, 'terminal', wordsTypingChars); // CEO introduction
		looseLayout(); // remove the limit wrapper height
		await writeTo(styleEl, styleText[5], 0, codeSpeed, true, 1); // end
	} catch (e) {
		// Flow control straight from the ghettos of Milwaukee
		if (e.message === 'SKIP IT') {
			surprisinglyShortAttentionSpan();
		} else {
			throw e;
		}
	}
}

// remove the limit wrapper height
async function looseLayout() {
	const isMob = isMobile();
	const styleElHPer = isMob ? 0.25 : 0.6;
	const workElHPer = isMob ? 0.35 : 0.6;

	contentEl.style.height = 'auto';
	window.onresize = null;
	styleEl.style.height = contentElH * styleElHPer + 'px';
	workEl.style.height = contentElH * workElHPer + 'px';
	workEl.style.maxHeight = 'none'; // the original "60%" seems has problem

	introEl.style.height = 'auto';

	// tell outside it's ended
	window.afAnimationEnd && window.afAnimationEnd();


	let isAutoScroll = true;
	function cancelAutoScroll() {
		isAutoScroll = false;
		setTimeout(() => {
			document.removeEventListener('touchmove', cancelAutoScroll, false);
		}, 0);
	}
	document.addEventListener('touchmove', cancelAutoScroll, false);

	// scroll to job introdution
	await Promise.delay(3000);


	const jobIntroPostion = document.querySelector('.jobs-info');
	jobIntroPostion && runScroll(document.scrollingElement, 'cur', jobIntroPostion.offsetTop, 400, () => {
		return isAutoScroll;
	});
}

// Skips all the animations.
async function surprisinglyShortAttentionSpan() {
	if (done) return;
	done = true;
	const txt = styleText.join('\n');

	// The work-text animations are rough
	style.textContent = '#work-text * { ' + browserPrefix + 'transition: none; }';
	style.textContent += txt;
	let styleHTML = '';
	for (let i = 0; i < txt.length; i++) {
		styleHTML = handleChar(styleHTML, txt[i]);
	}
	styleEl.innerHTML = styleHTML;

	createWorkBox();

	// introduce CEO text
	let introCEOHTML = '';
	for (let i = 0; i < introText[1].length; i++) {
		introCEOHTML = handleTerminalChar(introCEOHTML, introText[1][i]);
	}
	introEl.innerHTML = '';
	fastWrite(introEl, introCEOTitle);
	fastWrite(introEl, introCEOHTML);

	// work introduce
	await addMoreWorkIntro(workEl, whyJoinUsHTML);

	await looseLayout();

	// There's a bit of a scroll problem with this thing
	const start = Date.now();
	while (Date.now() - 1000 > start) {
		workEl.scrollTop = Infinity;
		styleEl.scrollTop = Infinity;
		await Promise.delay(16);
	}
}


/**
 * Helpers
 */

function getIntervalByCheckIsComment() {
	let openComment = false;
	return (sliced3Chars) => {
		const [preChar, curChar] = sliced3Chars;

		if (openComment && curChar !== '/') {
			// Short-circuit during a comment so we don't highlight inside it.
			return codeCommentSpeed;
		}
		if (curChar === '/' && !openComment) {
			openComment = true;
			return codeCommentSpeed;
		}
		if (curChar === '/' && preChar === '*' && openComment) {
			openComment = false;
			return codeCommentSpeed;
		}
		return null;
	};
}

const regexSpace = /\s/;
function checkIsLink(originalCharsPerInterval) {
	let isLinkLikelyBegin = false;
	let isLinkBegin = false;

	return (sliced3Chars) => {
		if (sliced3Chars === 'htt') {
			isLinkLikelyBegin = true;
		} else if (isLinkLikelyBegin && sliced3Chars === '://') {
			isLinkBegin = true;
			return linkTypingChars;
		}

		if ((isLinkLikelyBegin || isLinkBegin) && regexSpace.test(sliced3Chars)) {
			isLinkLikelyBegin = false;
			isLinkBegin = false;
		}
		if (isLinkBegin) {
			return linkTypingChars;
		}

		return originalCharsPerInterval;
	};
}

function writeTo(...arg) {
	const [, , , , mirrorToStyle, charsPerInterval, rules] = arg;
	// remove rule
	const passingArg = arg.slice(0, 6);

	const intervalPulgins = [];
	const charsPerIntervalPulgins = [];
	if (mirrorToStyle && rules !== 'fixed-speed') {
		intervalPulgins.push(getIntervalByCheckIsComment());
	}

	charsPerIntervalPulgins.push(checkIsLink(charsPerInterval));

	return doWriteTo(...passingArg, intervalPulgins, charsPerIntervalPulgins);
}

const comma = /\D(,\s|，|。)$/;
const endOfSentence = /[?!]\s$/;
const endOfBlock = /[^/]\n\n$/;
/**
 * write effect
 * @param {object} el html element
 * @param {string} message the text
 * @param {number} index begin index of the message
 * @param {number} interval the timing of each typing, number larger will be shower typing
 * @param {bool|string:'terminal'} mirrorToStyle if apply to style, or is a terminal style
 * @param {number} charsPerInterval how many chars of each typing
 * @param {array} intervalPulgins
 * @param {array} charsPerIntervalPulgins
 */
async function doWriteTo(
	el, message, index, interval, mirrorToStyle, charsPerInterval, intervalPulgins, charsPerIntervalPulgins,
) {
	if (animationSkipped) {
		// Lol who needs proper flow control
		throw new Error('SKIP IT');
	}
	// Write a character or multiple characters to the buffer.
	const chars = message.slice(index, index + charsPerInterval);
	index += charsPerInterval;

	// Ensure we stay scrolled to the bottom.
	el.scrollTop = el.scrollHeight;

	// If this is going to <style> it's more complex; otherwise, just write.
	if (mirrorToStyle === 'terminal') {
		writeTerminal(el, chars);
	} else if (mirrorToStyle) {
		writeChar(el, chars, style);
	} else {
		writeSimpleChar(el, chars);
	}

	// Schedule another write.
	if (index < message.length) {
		let thisInterval = interval;
		const thisSlice = message.slice(index - 2, index + 1);

		// run pulgins
		const intervalValue = intervalPulgins
			.map(pulgin => pulgin(thisSlice))
			.find(val => val !== null);

		if (typeof intervalValue !== 'undefined') {
			thisInterval = intervalValue;
		}

		charsPerInterval = charsPerIntervalPulgins
			.map(pulgin => pulgin(thisSlice))
			.find(val => val !== null) || charsPerInterval;

		if (comma.test(thisSlice)) thisInterval = interval * 8;
		else if (endOfSentence.test(thisSlice)) thisInterval = interval * 15;
		else if (endOfBlock.test(thisSlice)) thisInterval = interval * 20;

		do {
			await Promise.delay(thisInterval);
		} while (paused);

		return doWriteTo(el, message, index, interval, mirrorToStyle, charsPerInterval, intervalPulgins, charsPerIntervalPulgins);
	}
}

async function fastWrite(el, message) {
	el.innerHTML += message.replace(/\n/g, '').replace(/(\s\s|\t)+/g, '');
}

async function addMoreWorkIntro(el, html) {
	const htmlWrapper = el.querySelector('.md');
	addHtmlToFlippyElement(htmlWrapper, html, el);
}

async function scrollToMdBottom(el, timing = 300) {
	const gap = 20;
	// const mdWrapper = el.querySelector('.text');
	// const hMd = mdWrapper.offsetHeight;
	const hMd = 0;

	// scroll
	await runScroll(el, 'cur', hMd + gap, timing);
	await Promise.delay(300);
}
async function addHtmlToFlippyElement(el, html, scrollParent) {
	const originalH = el.offsetHeight;
	fastWrite(el, html);

	// jump to original view position
	scrollParent.scrollTop += el.offsetHeight - originalH;
	// animate scroll
	await scrollToMdBottom(scrollParent, 500);
}


function preSetStyle() {
	const h = document.documentElement.clientHeight;
	contentEl = document.getElementById('content');

	contentElH = (h - PAGE_PADDING * 2 - containerEl.getBoundingClientRect().top);

	contentEl.style.height = contentElH + 'px';
}

//
// Older versions of major browsers (like Android) still use prefixes. So we figure out what that prefix is
// and use it.
//
function getBrowserPrefix() {
	// Ghetto per-browser prefixing
	browserPrefix = getPrefix(); // could be empty string, which is fine
	styleText = styleText.map(function (text) {
		return text.replace(/-webkit-/g, browserPrefix);
	});
}

//
// Put els into the module scope.
//
function getEls() {
	// We're cheating a bit on styles.
	const preStyleEl = document.createElement('style');
	preStyleEl.textContent = insetStyleVariable(preStyles);

	// For live styling container
	style = document.createElement('style');

	document.head.insertBefore(style, document.getElementsByTagName('style')[0]);
	document.head.insertBefore(preStyleEl, document.getElementsByTagName('style')[0]);


	// El refs
	styleEl = document.getElementById('style-text');
	workEl = document.getElementById('work-text');
	introEl = document.getElementById('intro-text');
	skipAnimationEl = document.getElementById('skip-animation');
	pauseEl = document.getElementById('pause-resume');
}

//
// Create links in header (now footer).
//
function populateContainer() {
	// page-body-wrapper is squarespace page's body id
	containerEl = document.getElementById('container') || document.getElementById('page-body-wrapper');

	if (!containerEl) {
		throw new Error('Container not found.');
	}

	// force id to 'container'
	containerEl.id = 'container';

	containerEl.innerHTML = containerHTML;
}

//
// Create basic event handlers for user input.
//
function createEventHandlers() {
	// Mirror user edits back to the style element.
	styleEl.addEventListener('input', function () {
		style.textContent = styleEl.textContent;
	});

	// Skip anim on click to skipAnimation
	skipAnimationEl.addEventListener('click', function (e) {
		e.preventDefault();
		animationSkipped = true;
	});

	pauseEl.addEventListener('click', function (e) {
		e.preventDefault();
		if (paused) {
			pauseEl.textContent = '暂停 ||';
			paused = false;
		} else {
			pauseEl.textContent = '继续 >>';
			paused = true;
		}
	});

	window.onresize = function () {
		preSetStyle();
	};

	window.onerror = function () {

	};
}


function getWorkContentWithMd() {
	const [txt] = workText;
	// raw text '<div class="text">' + replaceURLs(txt) + '</div>'
	return '<div class="md">' + aftershipTitle + replaceURLs(getMd(txt, workImgs)) + '<div>';
}
//
// Fire a listener when scrolling the 'work' box.
//
function createWorkBox() {
	if (workEl.classList.contains('flipped')) return;
	workEl.innerHTML = getWorkContentWithMd();
	workEl.scrollTop = 9999;
	workEl.classList.add('flipped');


	// flippy floppy
	// let flipping = false;
	// when can trigger mouse wheel, we need to disable browser's default scrolling
	let disableOriginalScroll = false;

	require('mouse-wheel')(workEl, async function (dx, dy) {
		if (!disableOriginalScroll) {
			disableOriginalScroll = true;
			workEl.style.overflow = 'hidden';
		}

		// if (flipping) return;
		const flipped = workEl.classList.contains('flipped');
		// const half = (workEl.scrollHeight - workEl.clientHeight) / 2;
		// const pastHalf = flipped ? workEl.scrollTop < half : workEl.scrollTop > half;

		// // If we're past half, flip the el.
		// if (pastHalf) {
		// 	flipping = true;
		// 	workEl.classList.toggle('flipped');
		// 	await Promise.delay(500);
		// 	workEl.scrollTop = flipped ? 0 : 99999;
		// 	flipping = false;
		// }

		// Scroll. If we've flipped, flip the scroll direction.
		workEl.scrollTop += (dy * (flipped ? -1 : 1));
	}, true);
}

// function createIntroBox() {
// 	introEl.innerHTML = '<div class="md">' + replaceURLs(getMd(introText[0], introImgs)) + '<div>';
// }
