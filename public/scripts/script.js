/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const api = 'http://localhost:2209/api/get';

// Change style of navbar on scroll
window.onscroll = function() { myFunction(); };
function myFunction() {
	const navbar = document.getElementById('myNavbar');
	if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
		navbar.className = 'w3-bar' + ' w3-card' + ' w3-animate-top' + ' w3-white';
	}
	else {
		navbar.className = navbar.className.replace(' w3-card w3-animate-top w3-white', '');
	}
}

// Used to toggle the menu on small screens when clicking on the menu button
function toggleFunction() {
	const navbar = document.getElementById('myNavbar');
	const x = document.getElementById('navDemo');
	if (x.className.indexOf('w3-show') === -1) {
		x.className += ' w3-show';
		navbar.className += ' w3-black';
	}
	else {
		x.className = x.className.replace(' w3-show', '');
		navbar.className = navbar.className.replace(' w3-black', '');
	}
}

function toggleAppMenu() {
	const navbar = document.getElementById('myNavbar');
	const x = document.getElementById('appMenu');
	if (x.className.indexOf('w3-show') === -1) {
		x.className = x.className.replace(' w3-hide', ' w3-show');
		navbar.className += ' w3-black';
	}
	else {
		x.className = x.className.replace(' w3-show', ' w3-hide');
		navbar.className = navbar.className.replace(' w3-black', '');
	}
}

function toggleSFW() {
	const sfw = document.getElementById('sfwbtn');
	const value = document.getElementById('sfwbtn').value;
	if (value === '2') {
		document.getElementById('sfwbtn').value = 0;
		document.getElementById('sfwbtn').textContent = 'SFW';
		sfw.className = sfw.className.replace(' w3-border-red w3-text-red w3-hover-red', ' w3-border-green w3-text-green w3-hover-green');
		return 'SFW';
	}
	if (value === '0') {
		document.getElementById('sfwbtn').value = 1;
		document.getElementById('sfwbtn').textContent = 'Sensitive';
		sfw.className = sfw.className.replace(' w3-border-green w3-text-green w3-hover-green', ' w3-border-orange w3-text-orange w3-hover-orange');
		return 'Sensitive';
	}
	else {
		document.getElementById('sfwbtn').value = 2;
		document.getElementById('sfwbtn').textContent = 'NSFW';
		sfw.className = sfw.className.replace(' w3-border-orange w3-text-orange w3-hover-orange', ' w3-border-red w3-text-red w3-hover-red');
		return 'NSFW';
	}
}

function toggleSRC() {
	if (document.getElementById('srcbtn').value === 'api') {
		document.getElementById('srcbtn').value = 'reddit';
		document.getElementById('srcbtn').textContent = 'REDDIT';
		document.getElementById('srcbtn').className = document.getElementById('srcbtn').className.replace(' w3-border-green w3-text-green w3-hover-green', ' w3-border-orange w3-text-orange w3-hover-orange');
	}
	else {
		document.getElementById('srcbtn').value = 'api';
		document.getElementById('srcbtn').textContent = 'API';
		document.getElementById('srcbtn').className = document.getElementById('srcbtn').className.replace(' w3-border-orange w3-text-orange w3-hover-orange', ' w3-border-green w3-text-green w3-hover-green');
	}
}

function closeMenu() {
	const navbar = document.getElementById('myNavbar');
	const menu = document.getElementById('appMenu');
	menu.className = menu.className.replace(' w3-show', ' w3-hide');
	navbar.className = navbar.className.replace(' w3-black', '');
}

function fetchMonika() {
	closeMenu();
	document.getElementById('image').style.opacity = 0.2;
	document.getElementById('image').src = './img/loading.gif';
	if (document.getElementById('srcbtn').value === 'api') {
		if (document.getElementById('sfwbtn').value === '1') {
			fetch(`${api}?rating=1`, { cache: 'no-cache', mode: 'cors', headers: { authorization: '' } })
				.then(res => res.json())
				.then(json => update(json));
		}
		else if (document.getElementById('sfwbtn').value === '2') {
			fetch(`${api}?rating=2`, { cache: 'no-cache', mode: 'cors', headers: { authorization: '' } })
				.then(res => res.json())
				.then(json => update(json));
		}
		else {
			fetch(api, { cache: 'no-cache', mode: 'cors', headers: { authorization: '' } })
				.then(res => res.json())
				.then(json => update(json));
		}
	}
	else {
		const url = 'https://www.reddit.com/r/Monikafandom/random/.json?f=flair_name%3A%22Found+art%22';
		fetch(url, { cache: 'no-cache' })
			.then(res => res.json())
			.then(json => updateReddit(json[0].data));
	}
}

function updateReddit(data) {
	const url = data.children[0].data.url;
	if (url !== '' && (url.split('.').pop() === 'jpg' || url.split('.').pop() === 'jpeg' || url.split('.').pop() === 'png' || url.split('.').pop() === 'gif' || url.split('.').pop() === 'mp4')) {
		const isnsfw = data.children[0].data.over_18;
		if (isnsfw && document.getElementById('sfwbtn').value === '2') {
			fetchMonika();
		}
		else {
			document.getElementById('image').src = url;
			document.getElementById('image').style.opacity = 1;
		}
	}
	else {
		fetchMonika();
	}
}

function update(json) {
	console.log(json);
	document.getElementById('image').src = json.image;
	document.getElementById('image').style.opacity = 1;
}

function disableF5(e) {
	if ((e.which || e.keyCode) === 116) { e.preventDefault(); }
}

addEventListener('keydown', disableF5);

window.onload = function() {
	// if (localStorage.justMonika !== 1) {
	//	dbox('Hi! This is your first time here,\nto get a new image click on the current one.');
	//	localStorage.justMonika = 1;
	// }
	fetchMonika();
};

function dbox(msg) {
	if (msg !== undefined) {
		document.getElementById('boxTxt').innerHTML = msg;
		document.getElementById('boxBack').classList.add('show');
	}
	else { document.getElementById('boxBack').classList.remove('show'); }
}
