/**
 * 支持自定义字幕功能的视频 Web Component
 * @author zmm@simmir-visiontech.com
 */
customElements.define(
	'video-with-custom-subtitles',
	class extends HTMLElement {
		private styleElement: HTMLStyleElement;
		private videoElement: HTMLVideoElement;
		private videoScreen: HTMLElement;
		private playButton: HTMLSpanElement;
		private muteButton: HTMLSpanElement;
		private controlBar: HTMLDivElement;
		private progressBar: HTMLInputElement;

		private resizeObserver: ResizeObserver;

		private activeCueStartTime: number = -1;

		constructor() {
			super();
			// 创建 shadow DOM
			const shadowRoot = this.attachShadow({ mode: 'open' });

			this.styleElement = document.createElement('style');
			this.videoElement = document.createElement('video');
			this.videoScreen = document.createElement('div');
			this.playButton = document.createElement('span');
			this.muteButton = document.createElement('span');
			this.controlBar = document.createElement('div');
			this.progressBar = document.createElement('input');

			this.styleElement.textContent = [
				`:host { display: inline-block; position: relative; }`,
				`:host(:hover) .fade-out { opacity: 1; }`,
				`:host(:not(:hover)) .fade-out { opacity: 0; transition-delay: 1s; }`,
				`video { vertical-align: top; width: 100%; height: 100%; background-color: var(--video-bg-color, black); pointer-events: none !important; }`,
				`video::cue { font-size: 80%; font-family: Arial, sans-serif; text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.7); border-radius: 4px; background-color: rgba(169, 169, 169, 0.5); }`,
				`[part="videoScreen"] { position: absolute; inset: 0px; margin: auto; pointer-events: none !important; }`,
				`[part="playButton"] { position: absolute; inset: 0px; width: fit-content; height: fit-content; margin: auto; color: white; font-size: 0.7em; text-shadow: 0 0 0.5em rgba(0, 0, 0, 0.8); user-select: none; pointer-events: none !important; }`,
				`[part="muteButton"] { position: absolute; top: 0.5em; right: 0.5em; color: white; font-size: 0.7em; text-shadow: 0 0 0.5em rgba(0, 0, 0, 0.8); user-select: none; cursor: pointer; }`,
				`[part="controlBar"] { position: absolute; inset: 0px; top: unset; padding: 0.5em; background: linear-gradient(to top, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0)); user-select: none; pointer-events: none !important; }`,
				`[part="progressBar"] { display: block; width: 100%; margin: 0; cursor: pointer; pointer-events: auto; }`,
				`.fade-out { opacity: 0; transition: opacity 0.5s ease; }`,
			].join('\n');

			// 使用 ::part 伪类暴露样式接口
			this.videoElement.setAttribute('part', 'video');
			// videoScreen
			this.videoScreen.setAttribute('part', 'videoScreen');
			// playButton
			this.playButton.setAttribute('part', 'playButton');
			// muteButton
			this.muteButton.setAttribute('part', 'muteButton');
			this.muteButton.classList.add('fade-out');
			// controlBar
			this.controlBar.setAttribute('part', 'controlBar');
			this.controlBar.classList.add('fade-out');
			// progressBar
			this.progressBar.setAttribute('part', 'progressBar');
			this.progressBar.type = 'range';
			this.progressBar.min = '0';
			this.progressBar.max = '100';
			this.progressBar.step = 'any';

			shadowRoot.appendChild(this.styleElement);
			shadowRoot.appendChild(this.videoElement);
			shadowRoot.appendChild(this.videoScreen);
			shadowRoot.appendChild(this.playButton);
			shadowRoot.appendChild(this.muteButton);
			shadowRoot.appendChild(this.controlBar);
			this.controlBar.appendChild(this.progressBar);

			this.addEventListener('click', () => {
				if (this.videoElement.paused) {
					this.videoElement.play();
				} else {
					this.videoElement.pause();
				}
			});

			this.addEventListener('dblclick', () => {
				if (document.fullscreenElement) {
					this.exitFullScreen();
				} else {
					this.enterFullScreen(this);
				}
			});

			// 播放事件
			this.videoElement.addEventListener('play', () => {
				this.playButton.innerText = ''; // '\u{23F8}'
			});

			// 暂停事件
			this.videoElement.addEventListener('pause', () => {
				this.playButton.innerText = '\u{25B6}';
			});

			// 监听 volumechange 事件
			this.videoElement.addEventListener('volumechange', (ev: Event) => {
				const target = ev.target as HTMLVideoElement; // 类型断言
				this.muteButton.textContent = target.muted ? '\u{1F507}' : '\u{1F50A}';
			});

			// 更新进度条
			this.videoElement.addEventListener('timeupdate', (ev: Event) => {
				const target = ev.target as HTMLVideoElement; // 类型断言
				const progress = (target.currentTime / target.duration) * 100;
				this.progressBar.value = progress.toString();
			});

			// 用户拖动进度条时更新视频播放时间
			this.progressBar.addEventListener('input', (ev: Event) => {
				const target = ev.target as HTMLInputElement; // 类型断言
				const value = Number(target.value);
				const seekTime = (value / 100) * this.videoElement.duration;
				this.videoElement.currentTime = seekTime;
			});

			this.progressBar.addEventListener('click', (ev: Event) => {
				ev.stopPropagation();
			});

			this.muteButton.addEventListener('click', (ev: Event) => {
				ev.stopPropagation();
				this.videoElement.muted = !this.videoElement.muted;
			});

			// 使用 ResizeObserver 监听容器的 resize 事件
			this.resizeObserver = new ResizeObserver(this.handleResizeObserverCallback.bind(this));
		}

		// 生命周期钩子 - 元素添加到 DOM 时触发
		connectedCallback() {
			if (this.shadowRoot) {
				// 观察 shadow DOM 内部的元素（container）
				this.resizeObserver.observe(this.videoElement);

				// 将宿主元素的所有属性移植到 video 元素上
				for (const { name, value } of this.attributes) {
					if (name in this.videoElement) {
						if ('controls' === name) {
							// 为了覆盖原生 controls
							this.videoElement.controls = false;
						} else {
							// 如果是 DOM 属性，直接赋值
							(this.videoElement as Record<string, any>)[name] = value || true;
						}
					} else {
						// 如果是自定义属性或非 DOM 属性，使用 setAttribute
						this.videoElement.setAttribute(name, value || 'true');
					}
				}

				// 将宿主元素的所有子元素移植到 video 元素内
				for (const node of this.childNodes) {
					this.videoElement.appendChild(node.cloneNode());
				}

				// 获取第一个字幕轨道
				const track = this.videoElement.textTracks[0] as TextTrack | null;
				if (track) {
					this.extTrack(track);
				}

				this.muteButton.textContent = this.videoElement.muted ? '\u{1F507}' : '\u{1F50A}';
			}
		}

		// 生命周期钩子 - 元素从 DOM 中移除时触发
		disconnectedCallback(name, oldValue, newValue) {
			console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
			// 当元素从 DOM 移除时，清理 ResizeObserver
			this.resizeObserver.disconnect();
		}

		handleResizeObserverCallback(entries: ResizeObserverEntry[]) {
			entries.forEach((entry) => {
				let realWidth: number, realHeight: number;
				const { width, height } = entry.contentRect ?? {};
				const { videoWidth, videoHeight } = this.videoElement ?? { videoWidth: 0, videoHeight: 0 };
				const videoAspectRatio = videoHeight / videoWidth;
				const clientAspectRatio = height / width;

				if (videoAspectRatio <= clientAspectRatio) {
					realWidth = width;
					realHeight = width * videoAspectRatio;
				} else {
					realWidth = height * (1 / videoAspectRatio);
					realHeight = height;
				}

				this.videoScreen.style.width = `${realWidth || width}px`;
				this.videoScreen.style.height = `${realHeight || height}px`;

				// 根据组件宽度调整字体大小
				const minSideLength = Math.min(width, height);
				const fontSize = Math.max(minSideLength / 10, 12);
				this.style.fontSize = `${fontSize}px`;
			});
		}

		extTrack(track: TextTrack) {
			// 确保字幕显示
			track.mode = 'showing';
			// 监听字幕事件
			track.oncuechange = () => {
				// 获取当前显示的字幕
				const activeCue = track.activeCues?.[0] as VTTCue | undefined;
				if (
					activeCue &&
					// 因`track.addCue()`方法会触发`oncuechange`回调，故设置过滤。
					activeCue.startTime !== this.activeCueStartTime
				) {
					this.activeCueStartTime = activeCue.startTime;
					track.removeCue(activeCue);
					const newCue = new VTTCue(activeCue.startTime, activeCue.endTime, `&nbsp;${activeCue.text}&nbsp;`);
					newCue.align = activeCue.align;
					newCue.id = activeCue.id;
					newCue.line = activeCue.line;
					newCue.position = activeCue.position;
					newCue.size = activeCue.size;
					newCue.snapToLines = activeCue.snapToLines;
					newCue.vertical = activeCue.vertical;
					track.addCue(newCue);
				}
			};
		}

		enterFullScreen(element: HTMLElement) {
			if (element.requestFullscreen) {
				element.requestFullscreen();
			}
			// @ts-ignore
			else if (element.mozRequestFullScreen) {
				// @ts-ignore
				element.mozRequestFullScreen(); // Firefox
			}
			// @ts-ignore
			else if (element.webkitRequestFullscreen) {
				// @ts-ignore
				element.webkitRequestFullscreen(); // Chrome, Safari, Opera
			}
			// @ts-ignore
			else if (element.msRequestFullscreen) {
				// @ts-ignore
				element.msRequestFullscreen(); // IE/Edge
			}
		}

		exitFullScreen() {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
			// @ts-ignore
			else if (document.mozCancelFullScreen) {
				// @ts-ignore
				document.mozCancelFullScreen(); // Firefox
			}
			// @ts-ignore
			else if (document.webkitExitFullscreen) {
				// @ts-ignore
				document.webkitExitFullscreen(); // Chrome, Safari, Opera
			}
			// @ts-ignore
			else if (document.msExitFullscreen) {
				// @ts-ignore
				document.msExitFullscreen(); // IE/Edge
			}
		}
	}
);
