class EdVideoThumbnail extends HTMLElement {
    constructor() {
        super();

        // SELECTORS
        this.popUp = document.querySelector('.video-popup-container')
        this.popUpVideo = this.popUp.querySelector('.video-container'); // video inside of popup

        this.openButton = this.querySelector('.btn-open');
        this.closeButton = this.popUp.querySelector('.btn-close');
        this.playButton = this.querySelector('.play-btn');

        // ENABLE EXTERNAL POPUP ELEMENT
        if (this.popUp) {
            document.querySelector('ed-video-popup').setAttribute('enabled', '');
        }

        // SETUP EVENT LISTENERS
        this._attachListeners();
    }

    get videoSrc() {
        return this.getAttribute('video-src');
    }

    get autoPlay() {
        return this.getAttribute('autoplay');
    }

    get controls() {
        return this.getAttribute('controls');
    }

    _attachListeners() {
        document.addEventListener('keydown', this.closeOnEsc.bind(this));
        this.openButton.addEventListener('click', this.openPopup.bind(this));
        this.playButton.addEventListener('click', this.openPopup.bind(this));

        // click outside
        this.popUp.addEventListener('click', this.closePopup.bind(this));
        this.closeButton.addEventListener('click', this.closePopup.bind(this));
    }

    openPopup(e) {
        e.stopPropagation();

        this.createVideo();
        this.popUp.classList.add('open');
        document.documentElement.classList.add('ed-video-popup-open');
    }

    closePopup(e) {
        e.stopPropagation();
        this.popUpVideo.innerHTML = '';
        this.popUp.classList.remove('open');
        document.documentElement.classList.remove('ed-video-popup-open');
    }

    closeOnEsc(e) {
        if (e.key === 'Escape') {
            this.popUpVideo.innerHTML = '';
            document.documentElement.classList.remove('ed-video-popup-open');
            this.popUp.classList.remove('open');
        }
    }

    createVideo() {
        let video = document.createElement('video');
        video.src = this.videoSrc;

        /** settings **/
        video.autoplay = true;
        video.controls = true;

        if (this.autoPlay === 'false') {
            video.autoplay = false;
        }

        if (this.controls === 'false') {
            video.controls = false;
        }

        this.popUpVideo.appendChild(video);
    }
}

customElements.define('ed-video-thumbnail', EdVideoThumbnail);

class EdVideoPopup extends HTMLElement {
    constructor() {
        super();
    }
}

customElements.define('ed-video-popup', EdVideoPopup);
