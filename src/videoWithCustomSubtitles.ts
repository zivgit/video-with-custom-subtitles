/**
 * 支持自定义字幕功能的视频 Web Component
 * @author zmm@simmir-visiontech.com
 */
customElements.define(
	"video-with-custom-subtitles",
	class extends HTMLElement {
		private styleElement: HTMLStyleElement;
		private videoElement: HTMLVideoElement;
		private videoScreen: HTMLElement;
		private playButton: HTMLSpanElement;
		private muteButton: HTMLSpanElement;
		private videoInfoBox: HTMLUListElement;
		private controlBar: HTMLDivElement;
		private progressBar: HTMLInputElement;
		private contextMenu: HTMLMenuElement;

		private resizeObserver: ResizeObserver;

		private isUpdatedCues: boolean = false;

		private get videoInfoBoxVisible(): boolean {
			return this.videoInfoBox.style.display === "unset";
		}

		private set videoInfoBoxVisible(value: boolean) {
			this.videoInfoBox.style.display = value ? "unset" : "none";
		}

		constructor() {
			super();
			// 创建 shadow DOM
			const shadowRoot = this.attachShadow({ mode: "open" });

			this.styleElement = document.createElement("style");
			this.videoElement = document.createElement("video");
			this.videoScreen = document.createElement("div");
			this.playButton = document.createElement("span");
			this.muteButton = document.createElement("span");
			this.videoInfoBox = document.createElement("ul");
			this.controlBar = document.createElement("div");
			this.progressBar = document.createElement("input");
			this.contextMenu = document.createElement("menu");

			this.styleElement.textContent = [
				`:host { display: inline-block; position: relative; }`,
				`:host(:hover) .fade-out { opacity: 1; }`,
				`:host(:not(:hover)) .fade-out { opacity: 0; transition-delay: 1s; }`,
				`video { vertical-align: top; width: 100%; height: 100%; box-sizing: border-box; background-color: var(--video-bg-color, black); }`,
				`video::cue { font-size: 75%; font-family: Arial, sans-serif; line-height: 2em; text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.7); background-color: rgba(0, 0, 0, 0.5); outline: 4px solid rgba(0, 0, 0, 0.5); }`,
				`menu { position: absolute; min-width: 120px; list-style-type: none; margin: 0; padding: 8px 0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); background-color: rgb(25, 29, 23); border: 0; border-radius: 8px; overflow: hidden; }`,
				`menu li { padding: 0 2em 0 3em; line-height: 28px; white-space: nowrap; color: white; font-size: 12px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); cursor: context-menu; }`,
				`menu li:hover { background-color: rgb(48, 52, 46); }`,
				`menu li::before { visibility: hidden; content: '\u{2713}'; margin: 0 1em 0 -2em; }`,
				`menu li.active::before { visibility: visible; }`,
				`menu hr { border-style: solid; border-color: rgb(71, 87, 67); border-width: 1px 0 0; margin: 8px 0; }`,
				`[part="videoScreen"] { position: absolute; inset: 0px; margin: auto; pointer-events: none !important; }`,
				`[part="playButton"] { position: absolute; inset: 0px; width: fit-content; height: fit-content; margin: auto; color: white; font-size: 0.7em; text-shadow: 0 0 0.5em rgba(0, 0, 0, 0.8); user-select: none; pointer-events: none !important; }`,
				`[part="muteButton"] { position: absolute; top: 0.5em; right: 0.5em; color: white; font-size: 0.7em; text-shadow: 0 0 0.5em rgba(0, 0, 0, 0.8); user-select: none; cursor: pointer; }`,
				`[part="videoInfoBox"] { display: none; position: absolute; top: 16px; left: 16px; list-style-type: none; margin: 0; padding: 8px 16px; border-radius: 2px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); background-color: rgba(85, 85, 85, 0.7); user-select: none; }`,
				`[part="videoInfoBox"] li { padding: 2px 0; color: white; font-size: 12px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8); }`,
				`[part="controlBar"] { position: absolute; inset: 0px; top: unset; padding: 0.5em; background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0)); user-select: none; pointer-events: none !important; }`,
				`[part="progressBar"] { display: block; width: 100%; margin: 0; cursor: pointer; pointer-events: auto; }`,
				`[popover]:popover-open { opacity: 1; transform: scale(1); }`,
				`[popover] { opacity: 0; transform: scale(0.9); transition-property: opacity, transform, overlay, display; transition-duration: 0.2s; transition-behavior: allow-discrete; }`,
				`@starting-style { [popover]:popover-open { opacity: 0; transform: scale(0.9); } }`,
				`.fade-out { opacity: 0; transition: opacity 0.5s ease; }`,
			].join("\n");

			this.videoInfoBox.innerHTML = [
				`<li data-role="duration">持续时间：<span></span></li>`,
				`<li data-role="currentTime">当前时间：<span></span></li>`,
			].join("\n");

			this.contextMenu.innerHTML = [
				`<li data-action="loop">循环</li>`,
				`<li data-action="save">视频另存为...</li>`,
				`<hr />`,
				`<li data-action="details">显示详细信息</li>`,
			].join("\n");

			// 使用 ::part 伪类暴露样式接口
			this.videoElement.setAttribute("part", "video");
			// videoScreen
			this.videoScreen.setAttribute("part", "videoScreen");
			// playButton
			this.playButton.setAttribute("part", "playButton");
			// muteButton
			this.muteButton.setAttribute("part", "muteButton");
			this.muteButton.classList.add("fade-out");
			// videoInfoBox
			this.videoInfoBox.setAttribute("part", "videoInfoBox");
			// contextMenu
			this.contextMenu.setAttribute("part", "contextMenu");
			this.contextMenu.popover = "auto";
			// controlBar
			this.controlBar.setAttribute("part", "controlBar");
			this.controlBar.classList.add("fade-out");
			// progressBar
			this.progressBar.setAttribute("part", "progressBar");
			this.progressBar.type = "range";
			this.progressBar.min = "0";
			this.progressBar.max = "100";
			this.progressBar.step = "any";
			this.progressBar.value = "0";

			shadowRoot.appendChild(this.styleElement);
			shadowRoot.appendChild(this.videoElement);
			shadowRoot.appendChild(this.videoScreen);
			shadowRoot.appendChild(this.playButton);
			shadowRoot.appendChild(this.muteButton);
			shadowRoot.appendChild(this.videoInfoBox);
			shadowRoot.appendChild(this.contextMenu);

			this.videoElement.addEventListener("click", () => {
				if (this.videoElement.paused) {
					this.videoElement.play();
				} else {
					this.videoElement.pause();
				}
			});

			this.videoElement.addEventListener("dblclick", () => {
				if (document.fullscreenElement) {
					this.exitFullScreen();
				} else {
					this.enterFullScreen(this);
				}
			});

			// 播放事件
			this.videoElement.addEventListener("play", () => {
				this.playButton.innerText = ""; // '\u{23F8}'
			});

			// 暂停事件
			this.videoElement.addEventListener("pause", () => {
				this.playButton.innerText = "\u{25B6}";
			});

			// 监听 volumechange 事件
			this.videoElement.addEventListener("volumechange", (ev: Event) => {
				const target = ev.target as HTMLVideoElement; // 类型断言
				this.muteButton.textContent = target.muted ? "\u{1F507}" : "\u{1F50A}";
			});

			// 更新进度条
			this.videoElement.addEventListener("timeupdate", (ev: Event) => {
				const target = ev.target as HTMLVideoElement; // 类型断言
				const progress = (target.currentTime / target.duration) * 100;
				this.progressBar.value = progress.toString();

				const updateTarget = this.videoInfoBox.querySelector(
					'li[data-role="currentTime"] span'
				);
				if (updateTarget) {
					updateTarget.textContent = this.formatSeconds(target.currentTime);
				}
			});

			this.videoElement.addEventListener("loadedmetadata", (ev: Event) => {
				const target = ev.target as HTMLVideoElement; // 类型断言
				if (!isNaN(target.duration)) {
					const updateTarget = this.videoInfoBox.querySelector(
						'li[data-role="duration"] span'
					);
					if (updateTarget) {
						updateTarget.textContent = this.formatSeconds(target.duration);
					}
				}
			});

			// 右键点击时显示自定义菜单
			this.videoElement.addEventListener("contextmenu", (ev: MouseEvent) => {
				ev.preventDefault(); // 防止默认右键菜单
				const x = ev.pageX; // 获取点击位置的X坐标
				const y = ev.pageY; // 获取点击位置的Y坐标
				this.contextMenu.style.left = `${x}px`; // 设置自定义菜单的X位置
				this.contextMenu.style.top = `${y}px`; // 设置自定义菜单的Y位置
				this.contextMenu.showPopover();
			});

			// 菜单事件代理
			this.contextMenu.addEventListener("click", (ev: Event) => {
				const target = ev.target as HTMLLIElement; // 类型断言
				// 确保点击的是 <li> 元素
				if (target.tagName.toLowerCase() === "li") {
					// 获取自定义的 data-action 属性
					const action = target.getAttribute("data-action");
					// 根据 data-action 值进行不同的操作
					switch (action) {
						case "loop": {
							target.classList.toggle("active");
							this.videoElement.loop = !this.videoElement.loop;
							break;
						}
						case "save":
							this.downloadVideo(this.videoElement.currentSrc);
							break;
						case "details":
							target.classList.toggle("active");
							this.videoInfoBoxVisible = !this.videoInfoBoxVisible;
							break;
						default:
							break;
					}

					// 隐藏菜单
					setTimeout(() => this.contextMenu.hidePopover(), 100);
				}
			});

			// 用户拖动进度条时更新视频播放时间
			this.progressBar.addEventListener("input", (ev: Event) => {
				const target = ev.target as HTMLInputElement; // 类型断言
				const value = Number(target.value);
				const seekTime = (value / 100) * this.videoElement.duration;
				this.videoElement.currentTime = seekTime;
			});

			this.progressBar.addEventListener("click", (ev: Event) => {
				ev.stopPropagation();
			});

			this.muteButton.addEventListener("click", (ev: Event) => {
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
				for (const { name, value } of Array.from(this.attributes)) {
					if (name in this.videoElement) {
						if ("controls" === name) {
							// 覆盖原始 controls
							this.videoElement.controls = false;
							if (value !== "false") {
								this.appendControls();
							}
						} else {
							// 如果是 DOM 属性，直接赋值
							(this.videoElement as Record<string, any>)[name] = value || true;
						}
					} else {
						// 如果是自定义属性或非 DOM 属性，使用 setAttribute
						this.videoElement.setAttribute(name, value || "true");
					}
				}

				// 将宿主元素的所有子元素移植到 video 元素内
				for (const node of Array.from(this.childNodes)) {
					this.videoElement.appendChild(node.cloneNode());
				}

				// 获取第一个字幕轨道
				const track = this.videoElement.textTracks[0] as TextTrack | null;
				if (track) {
					this.extTrack(track);
				}

				this.muteButton.textContent = this.videoElement.muted ? "\u{1F507}" : "\u{1F50A}";

				if (this.videoElement.loop) {
					this.contextMenu
						.querySelector('li[data-action="loop"]')
						?.classList.add("active");
				}
			}
		}

		// 生命周期钩子 - 元素从 DOM 中移除时触发
		disconnectedCallback(name: any, oldValue: any, newValue: any) {
			console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
			// 当元素从 DOM 移除时，清理 ResizeObserver
			this.resizeObserver.disconnect();
		}

		appendControls() {
			if (this.shadowRoot) {
				this.shadowRoot.appendChild(this.controlBar);
				this.controlBar.appendChild(this.progressBar);
			}
		}

		handleResizeObserverCallback(entries: ResizeObserverEntry[]) {
			entries.forEach((entry) => {
				let realWidth: number, realHeight: number;
				const { width, height } = entry.contentRect ?? {};
				const { videoWidth, videoHeight } = this.videoElement ?? {
					videoWidth: width,
					videoHeight: height,
				};
				const videoAspectRatio = videoHeight / videoWidth;
				const clientAspectRatio = height / width;

				if (videoAspectRatio <= clientAspectRatio) {
					realWidth = width;
					realHeight = width * videoAspectRatio;
				} else {
					realWidth = height * (1 / videoAspectRatio);
					realHeight = height;
				}

				this.videoScreen.style.width = `${realWidth}px`;
				this.videoScreen.style.height = `${realHeight}px`;

				// 根据组件宽度调整字体大小
				const minSideLength = Math.min(width, height);
				const fontSize = Math.max(minSideLength / 10, 12);
				this.style.fontSize = `${fontSize}px`;
			});
		}

		extTrack(track: TextTrack) {
			// 确保字幕显示
			track.mode = "showing";
			// 监听字幕事件
			track.oncuechange = () => {
				if (!this.isUpdatedCues) {
					this.isUpdatedCues = true;

					const cueArray = track.cues ? Array.from(track.cues) : [];
					for (const cue of cueArray) {
						const vttCue = cue as VTTCue;
						const newText = vttCue.text.replace(/\n/g, "&nbsp;\n&nbsp;");

						// Create a new VTTCue using all the properties of the original one
						const newCue = new VTTCue(vttCue.startTime, vttCue.endTime, newText);

						// Copy all relevant properties to the new cue
						newCue.id = vttCue.id;
						newCue.pauseOnExit = vttCue.pauseOnExit;
						newCue.align = vttCue.align;
						newCue.line = vttCue.line === "auto" ? 1 : vttCue.line;
						newCue.lineAlign = vttCue.lineAlign;
						newCue.position = vttCue.position;
						newCue.positionAlign = vttCue.positionAlign;
						newCue.region = vttCue.region;
						newCue.size = vttCue.size;
						newCue.snapToLines = vttCue.snapToLines;
						newCue.vertical = vttCue.vertical;

						// Remove the old cue and add the new one
						track.removeCue(vttCue);
						track.addCue(newCue);
					}
				}
			};
		}

		downloadVideo(videoSrc: string) {
			if (!videoSrc) {
				console.warn("视频当前没有播放源！");
				return;
			}

			// 创建一个<a>元素
			const anchor = document.createElement("a");
			anchor.href = videoSrc;
			anchor.download = "video.mp4"; // 设置下载的文件名
			anchor.hidden = true;

			// 将<a>元素添加到页面中以触发点击
			document.body.appendChild(anchor);
			anchor.click();

			// 下载完成后移除<a>元素
			document.body.removeChild(anchor);
		}

		formatSeconds(seconds: number) {
			seconds = Math.ceil(seconds);

			// 计算小时、分钟、秒
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			const secs = seconds % 60;

			// 格式化成两位数：如果小于10，则在前面补0
			const paddedHours = String(hours).padStart(2, "0");
			const paddedMinutes = String(minutes).padStart(2, "0");
			const paddedSeconds = String(secs).padStart(2, "0");

			// 返回格式化的时间
			return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
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
