(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = matchMedia("(pointer: coarse)").matches;

  if (location.hash) q(".intro-curtain")?.remove();
  if (location.hash) {
    document.documentElement.style.scrollBehavior = "auto";
    requestAnimationFrame(() => {
      q(location.hash)?.scrollIntoView({ block: "start" });
      requestAnimationFrame(() => document.documentElement.style.removeProperty("scroll-behavior"));
    });
  }

  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("is-ready")));

  const menu = q("[data-menu]");
  const navigation = q("#site-navigation");
  const mobileMenuQuery = matchMedia("(max-width: 980px)");
  let menuFocusTimer = 0;
  const menuIsOpen = () => menu?.getAttribute("aria-expanded") === "true";
  const syncMenuAccessibility = () => {
    if (navigation) navigation.inert = mobileMenuQuery.matches && !menuIsOpen();
    menu?.setAttribute("aria-label", menuIsOpen() ? "关闭章节目录" : "打开章节目录");
  };
  const closeMenu = ({ restoreFocus = false } = {}) => {
    const wasOpen = menuIsOpen();
    clearTimeout(menuFocusTimer);
    menu?.setAttribute("aria-expanded", "false");
    navigation?.classList.remove("open");
    document.body.classList.remove("menu-open");
    syncMenuAccessibility();
    if (restoreFocus && wasOpen) menu?.focus({ preventScroll: true });
  };
  menu?.addEventListener("click", () => {
    const open = !menuIsOpen();
    menu.setAttribute("aria-expanded", String(open));
    navigation?.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    syncMenuAccessibility();
    if (open) {
      clearTimeout(menuFocusTimer);
      menuFocusTimer = setTimeout(
        () => q("a", navigation)?.focus({ preventScroll: true }),
        reduceMotion ? 0 : 380
      );
    }
  });
  qa("#site-navigation a").forEach(link => link.addEventListener("click", () => closeMenu()));
  addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu({ restoreFocus: true });
    if (event.key !== "Tab" || !menuIsOpen() || !mobileMenuQuery.matches) return;
    const focusable = [menu, ...qa("a", navigation)].filter(Boolean);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  mobileMenuQuery.addEventListener?.("change", () => {
    if (!mobileMenuQuery.matches) closeMenu();
    syncMenuAccessibility();
  });
  syncMenuAccessibility();

  const player = q("[data-player]");
  const audio = q("[data-audio]", player || document);
  const audioToggle = q("[data-audio-toggle]", player || document);
  const audioTrackButtons = qa("[data-audio-track]", player || document);
  const audioLabel = q("[data-player-label]", player || document);
  const audioTitle = q("[data-player-title]", player || document);
  let audioPlaylist = [];
  let audioTrackIndex = 0;
  try {
    audioPlaylist = JSON.parse(player?.dataset.audioPlaylist || "[]");
  } catch {
    audioPlaylist = [];
  }
  const setAudioState = state => {
    if (!player) return;
    player.dataset.audioState = state;
    const labels = {
      loading: "正在读取",
      ready: "点击播放",
      playing: "正在播放",
      paused: "已暂停",
      missing: "声音尚未上传",
      error: "声音读取失败"
    };
    if (audioLabel) audioLabel.textContent = labels[state] || labels.loading;
    const available = !["loading", "missing", "error"].includes(state);
    if (audioToggle) audioToggle.disabled = !available;
    audioTrackButtons.forEach(button => { button.disabled = !available || audioPlaylist.length < 2; });
    if (audioToggle) {
      const playing = state === "playing";
      audioToggle.setAttribute("aria-label", playing ? "暂停声音" : "播放声音");
      audioToggle.setAttribute("aria-pressed", String(playing));
    }
  };
  if (audio && !audio.getAttribute("src")) {
    setAudioState("missing");
  } else if (audio) {
    const backgroundVolume = clamp(Number(player?.dataset.audioDefaultVolume || audioPlaylist[0]?.defaultVolume || 0.18), 0, 0.35);
    const fadeInDuration = reduceMotion ? 80 : Math.max(0, Number(player?.dataset.audioFadeIn || audioPlaylist[0]?.fadeInMs || 900));
    const fadeOutDuration = reduceMotion ? 80 : Math.max(0, Number(player?.dataset.audioFadeOut || audioPlaylist[0]?.fadeOutMs || 900));
    let pausedByUser = false;
    let audioFadeFrame = 0;
    let audioFadeSequence = 0;
    audio.volume = 0;
    setAudioState("loading");
    const fadeAudioTo = (targetVolume, duration) => {
      cancelAnimationFrame(audioFadeFrame);
      const sequence = ++audioFadeSequence;
      const fromVolume = audio.volume;
      const volumeDelta = targetVolume - fromVolume;
      if (duration <= 0 || Math.abs(volumeDelta) < 0.001) {
        audio.volume = targetVolume;
        return Promise.resolve(sequence);
      }
      return new Promise(resolve => {
        const startedAt = performance.now();
        const step = now => {
          if (sequence !== audioFadeSequence) return resolve(sequence);
          const progress = clamp((now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          audio.volume = clamp(fromVolume + volumeDelta * eased);
          if (progress < 1) {
            audioFadeFrame = requestAnimationFrame(step);
          } else {
            resolve(sequence);
          }
        };
        audioFadeFrame = requestAnimationFrame(step);
      });
    };
    const fadeOutAndPause = async () => {
      const sequence = await fadeAudioTo(0, fadeOutDuration);
      if (sequence !== audioFadeSequence || !pausedByUser) return;
      audio.pause();
    };
    const attemptDefaultPlayback = async () => {
      if (pausedByUser || !audio.paused) return;
      try {
        audio.volume = 0;
        await audio.play();
      } catch {
        setAudioState("ready");
      }
    };
    audio.addEventListener("loadedmetadata", () => {
      setAudioState(audio.paused ? "ready" : "playing");
      attemptDefaultPlayback();
    });
    audio.addEventListener("canplay", attemptDefaultPlayback, { once: true });
    audio.addEventListener("play", () => {
      setAudioState("playing");
      fadeAudioTo(backgroundVolume, fadeInDuration);
    });
    audio.addEventListener("pause", () => setAudioState(audio.currentTime ? "paused" : "ready"));
    audio.addEventListener("error", () => setAudioState(audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? "missing" : "error"));
    audioToggle?.addEventListener("click", async () => {
      try {
        if (audio.paused) {
          pausedByUser = false;
          audio.volume = 0;
          await audio.play();
        } else {
          pausedByUser = true;
          await fadeOutAndPause();
        }
      } catch {
        setAudioState("error");
      }
    });
    audioTrackButtons.forEach(button => button.addEventListener("click", async () => {
      if (audioPlaylist.length < 2) return;
      const direction = Number(button.dataset.audioTrack) || 1;
      const continuePlaying = !audio.paused;
      if (continuePlaying) await fadeAudioTo(0, fadeOutDuration);
      audioTrackIndex = (audioTrackIndex + direction + audioPlaylist.length) % audioPlaylist.length;
      const nextTrack = audioPlaylist[audioTrackIndex];
      pausedByUser = !continuePlaying;
      setAudioState("loading");
      if (audioTitle) audioTitle.textContent = nextTrack.title;
      audio.src = nextTrack.src;
      audio.loop = audioPlaylist.length === 1;
      audio.load();
      if (continuePlaying) {
        try {
          audio.volume = 0;
          await audio.play();
        } catch {
          setAudioState("ready");
        }
      }
    }));
    const resumeDefaultAudio = event => {
      if (event.target instanceof Element && event.target.closest("[data-audio-toggle],[data-audio-track]")) return;
      attemptDefaultPlayback();
    };
    document.addEventListener("pointerdown", resumeDefaultAudio, { once: true, capture: true });
    document.addEventListener("keydown", resumeDefaultAudio, { once: true, capture: true });
    attemptDefaultPlayback();
  }

  const carousel = q("[data-carousel]");
  const memoryTabs = qa("[data-memory]");
  const memoryTotal = memoryTabs.length;
  let activeMemory = 0;
  let touchStartX = 0;

  const selectMemory = (index, { focus = false, direction, source = "manual" } = {}) => {
    if (!carousel || !memoryTotal) return;
    const next = (index + memoryTotal) % memoryTotal;
    const previous = activeMemory;
    activeMemory = next;
    carousel.dataset.direction = direction || (next >= previous ? "next" : "previous");
    memoryTabs.forEach((tab, tabIndex) => {
      const active = tabIndex === next;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    qa("[data-slide]", carousel).forEach((slide, slideIndex) => {
      const active = slideIndex === next;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    const storyRegion = q(".hero-memory-stories", carousel);
    if (storyRegion) storyRegion.setAttribute("aria-live", source === "auto" ? "off" : "polite");
    qa("[data-story]", carousel).forEach((story, storyIndex) => {
      const active = storyIndex === next;
      story.classList.toggle("active", active);
      story.setAttribute("aria-hidden", String(!active));
    });
    const count = q("[data-memory-count]");
    const number = q("[data-memory-number]");
    const formatted = String(next + 1).padStart(2, "0");
    if (count) count.textContent = formatted;
    if (number) number.textContent = formatted;
    const playerIndex = q("[data-player-index]");
    if (playerIndex) playerIndex.textContent = formatted;
    if (innerWidth <= 700) {
      const tabStrip = q(".hero-memory-tabs", carousel);
      const activeTab = memoryTabs[next];
      if (tabStrip && activeTab) {
        tabStrip.scrollTo({
          left: activeTab.offsetLeft - (tabStrip.clientWidth - activeTab.clientWidth) / 2,
          behavior: reduceMotion ? "auto" : "smooth"
        });
      }
    }
    if (focus) memoryTabs[next]?.focus({ preventScroll: true });
  };

  const autoplayProgress = q("[data-autoplay-progress]", carousel || document);
  const configuredAutoplayDuration = Number(carousel?.dataset.autoplayDuration);
  const autoplayDuration = Number.isFinite(configuredAutoplayDuration) && configuredAutoplayDuration >= 1000
    ? configuredAutoplayDuration
    : 3000;
  const autoplayEnabled = Boolean(carousel && autoplayProgress && memoryTotal > 1 && !reduceMotion);
  let autoplayVisible = true;
  let autoplayRunning = false;
  let autoplayRemaining = autoplayDuration;
  let autoplayDeadline = 0;
  let autoplayFrame = 0;
  let autoplayTimer = 0;

  const canRunAutoplay = () => autoplayEnabled
    && autoplayVisible
    && !document.hidden;

  const updateAutoplayPresentation = () => {
    const state = autoplayRunning ? "running" : autoplayEnabled ? "waiting" : "inactive";
    const pausedBy = !autoplayEnabled
      ? "reduced-motion"
      : !autoplayVisible
        ? "viewport"
        : document.hidden
          ? "visibility"
          : "none";
    carousel?.setAttribute("data-autoplay-state", state);
    carousel?.setAttribute("data-autoplay-paused-by", pausedBy);
    if (autoplayProgress) {
      autoplayProgress.style.transform = `scaleX(${clamp(autoplayRemaining / autoplayDuration)})`;
    }
  };

  const renderAutoplay = now => {
    if (!autoplayRunning) return;
    autoplayRemaining = Math.max(0, autoplayDeadline - now);
    updateAutoplayPresentation();
    autoplayFrame = requestAnimationFrame(renderAutoplay);
  };

  const advanceAutoplay = () => {
    if (!autoplayRunning) return;
    selectMemory(activeMemory + 1, { direction: "next", source: "auto" });
    autoplayRemaining = autoplayDuration;
    autoplayDeadline = performance.now() + autoplayDuration;
    updateAutoplayPresentation();
    autoplayTimer = setTimeout(advanceAutoplay, autoplayDuration);
  };

  const pauseAutoplay = () => {
    if (autoplayRunning) {
      autoplayRemaining = Math.max(0, autoplayDeadline - performance.now());
      autoplayRunning = false;
      cancelAnimationFrame(autoplayFrame);
      clearTimeout(autoplayTimer);
    }
    updateAutoplayPresentation();
  };

  const startAutoplay = () => {
    if (!canRunAutoplay() || autoplayRunning) {
      updateAutoplayPresentation();
      return;
    }
    if (autoplayRemaining <= 0) autoplayRemaining = autoplayDuration;
    autoplayDeadline = performance.now() + autoplayRemaining;
    autoplayRunning = true;
    updateAutoplayPresentation();
    autoplayTimer = setTimeout(advanceAutoplay, autoplayRemaining);
    autoplayFrame = requestAnimationFrame(renderAutoplay);
  };

  const syncAutoplay = () => canRunAutoplay() ? startAutoplay() : pauseAutoplay();
  const resetAutoplay = () => {
    autoplayRemaining = autoplayDuration;
    if (autoplayRunning) {
      autoplayDeadline = performance.now() + autoplayDuration;
      clearTimeout(autoplayTimer);
      autoplayTimer = setTimeout(advanceAutoplay, autoplayDuration);
    }
    updateAutoplayPresentation();
    syncAutoplay();
  };
  const selectMemoryManually = (index, options = {}) => {
    selectMemory(index, { ...options, source: "manual" });
    resetAutoplay();
  };

  memoryTabs.forEach((tab, index) => {
    tab.tabIndex = tab.classList.contains("active") ? 0 : -1;
    tab.addEventListener("click", () => selectMemoryManually(index));
    tab.addEventListener("keydown", event => {
      let next = index;
      let direction;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = index - 1;
        direction = "previous";
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = index + 1;
        direction = "next";
      }
      if (event.key === "Home") {
        next = 0;
        direction = "previous";
      }
      if (event.key === "End") {
        next = memoryTotal - 1;
        direction = "next";
      }
      if (next !== index) {
        event.preventDefault();
        event.stopPropagation();
        selectMemoryManually(next, { focus: true, direction });
      }
    });
  });
  q("[data-prev]")?.addEventListener("click", () => selectMemoryManually(activeMemory - 1, { direction: "previous" }));
  q("[data-next]")?.addEventListener("click", () => selectMemoryManually(activeMemory + 1, { direction: "next" }));
  q("[data-player-prev]")?.addEventListener("click", () => selectMemoryManually(activeMemory - 1, { direction: "previous" }));
  q("[data-player-next]")?.addEventListener("click", () => selectMemoryManually(activeMemory + 1, { direction: "next" }));
  carousel?.addEventListener("keydown", event => {
    if (event.target.closest("[data-memory]")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectMemoryManually(activeMemory - 1, { direction: "previous" });
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectMemoryManually(activeMemory + 1, { direction: "next" });
    }
  });
  const memorySwipeSurface = q(".hero-memory-visuals", carousel || document);
  memorySwipeSurface?.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  memorySwipeSurface?.addEventListener("touchend", event => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 46) selectMemoryManually(activeMemory + (distance < 0 ? 1 : -1), { direction: distance < 0 ? "next" : "previous" });
  }, { passive: true });
  document.addEventListener("visibilitychange", syncAutoplay);
  if (carousel && "IntersectionObserver" in window) {
    const autoplayObserver = new IntersectionObserver(([entry]) => {
      autoplayVisible = entry.isIntersecting;
      syncAutoplay();
    }, { threshold: [0, .01] });
    autoplayObserver.observe(carousel);
  }
  updateAutoplayPresentation();
  syncAutoplay();

  const parseCalendarDate = value => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  };
  const addCalendarMonths = (date, totalMonths) => {
    const monthIndex = date.getMonth() + totalMonths;
    const year = date.getFullYear() + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(date.getDate(), lastDay), 12);
  };
  const calendarDuration = value => {
    const source = parseCalendarDate(value);
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    const future = source > current;
    const start = future ? current : source;
    const end = future ? source : current;
    let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    let cursor = addCalendarMonths(start, totalMonths);
    if (cursor > end) {
      totalMonths -= 1;
      cursor = addCalendarMonths(start, totalMonths);
    }
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const days = Math.floor((end - cursor) / 86400000);
    const text = `${years ? `${years}年` : ""}${months || years ? `${months}月` : ""}${days}天`;
    const totalDays = Math.floor((end - start) / 86400000);
    return { future, text, totalDays };
  };
  const updateDurations = () => {
    qa("[data-duration-from]:not([data-duration-total]):not([data-duration-days]):not([data-live-days])").forEach(element => {
      const duration = calendarDuration(element.dataset.durationFrom);
      element.textContent = element.hasAttribute("data-duration-plain")
        ? duration.text
        : `${duration.future ? "还有" : "已过去"} ${duration.text}`;
    });
    qa("[data-duration-days]").forEach(element => {
      const duration = calendarDuration(element.dataset.durationFrom);
      element.textContent = `${duration.totalDays.toLocaleString("zh-CN")} 天`;
    });
    qa("[data-live-days]").forEach(element => {
      const duration = calendarDuration(element.dataset.durationFrom);
      element.textContent = duration.totalDays.toLocaleString("zh-CN");
    });
    const total = q("[data-duration-total]");
    if (total) total.textContent = calendarDuration(total.dataset.durationFrom).text;

    const milestoneDates = qa("[data-milestone-item][data-milestone-date]").map(element => {
      const source = parseCalendarDate(element.dataset.milestoneDate);
      const today = new Date();
      const current = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
      let occurrence = new Date(current.getFullYear(), source.getMonth(), source.getDate(), 12);
      if (occurrence < current) occurrence = new Date(current.getFullYear() + 1, source.getMonth(), source.getDate(), 12);
      return {
        label: element.dataset.milestoneLabel,
        occurrence,
        days: Math.ceil((occurrence - current) / 86400000)
      };
    }).sort((left, right) => left.occurrence - right.occurrence);
    const nextMilestone = milestoneDates[0];
    if (nextMilestone) {
      const nextLabel = q("[data-next-milestone-label]");
      const nextDate = q("[data-next-milestone-date]");
      const nextDays = q("[data-next-milestone-days]");
      const nextUnit = q("[data-next-milestone-unit]");
      if (nextLabel) nextLabel.textContent = nextMilestone.label;
      if (nextDate) {
        const year = nextMilestone.occurrence.getFullYear();
        const month = String(nextMilestone.occurrence.getMonth() + 1).padStart(2, "0");
        const day = String(nextMilestone.occurrence.getDate()).padStart(2, "0");
        nextDate.dateTime = `${year}-${month}-${day}`;
        nextDate.textContent = `${year}.${month}.${day}`;
      }
      if (nextDays) nextDays.textContent = nextMilestone.days === 0 ? "今天" : nextMilestone.days.toLocaleString("zh-CN");
      if (nextUnit) nextUnit.textContent = nextMilestone.days === 0 ? "" : "天后";
    }
  };
  updateDurations();
  setInterval(updateDurations, 3600000);

  const archive = q("[data-archive]");
  const archiveEvents = archive ? JSON.parse(archive.dataset.events || "[]") : [];
  const archiveDates = archiveEvents
    .map(event => event.date)
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort((left, right) => left.localeCompare(right));
  const latestArchiveDate = archiveDates[archiveDates.length - 1];
  const archiveFallback = new Date();
  const archiveInitialDate = latestArchiveDate || `${archiveFallback.getFullYear()}-${String(archiveFallback.getMonth() + 1).padStart(2, "0")}-${String(archiveFallback.getDate()).padStart(2, "0")}`;
  const [archiveInitialYear, archiveInitialMonth] = archiveInitialDate.split("-").map(Number);
  let archiveMonth = new Date(archiveInitialYear, archiveInitialMonth - 1, 1);
  let archiveFilter = "all";
  let archiveView = "calendar";
  let selectedDay = latestArchiveDate || "";
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const archiveYearSelect = q("[data-year-jump]");
  const archiveYearOptions = archiveYearSelect ? [...archiveYearSelect.options].map(option => Number(option.value)).filter(Number.isFinite) : [];
  const archiveMinYear = archiveYearOptions[0] ?? archiveInitialYear;
  const archiveMaxYear = archiveYearOptions[archiveYearOptions.length - 1] ?? archiveInitialYear;
  const archiveStateKeys = ["archiveYear", "archiveMonth", "archiveFilter", "archiveView", "archiveDay"];
  const archiveParams = new URLSearchParams(location.search);
  let archiveStateTouched = archiveStateKeys.some(key => archiveParams.has(key));
  const restoredYear = Number(archiveParams.get("archiveYear"));
  const restoredMonth = Number(archiveParams.get("archiveMonth"));
  if (Number.isInteger(restoredYear) && restoredYear >= archiveMinYear && restoredYear <= archiveMaxYear && Number.isInteger(restoredMonth) && restoredMonth >= 1 && restoredMonth <= 12) {
    archiveMonth = new Date(restoredYear, restoredMonth - 1, 1);
  }
  const restoredFilter = archiveParams.get("archiveFilter");
  if (["all", "日常", "纪念", "旅行"].includes(restoredFilter)) archiveFilter = restoredFilter;
  const restoredView = archiveParams.get("archiveView");
  if (["calendar", "stream"].includes(restoredView)) archiveView = restoredView;
  const restoredDay = archiveParams.get("archiveDay") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(restoredDay)) selectedDay = restoredDay;

  const syncArchiveUrl = () => {
    if (!archiveStateTouched) return;
    const url = new URL(location.href);
    url.searchParams.set("archiveYear", String(archiveMonth.getFullYear()));
    url.searchParams.set("archiveMonth", String(archiveMonth.getMonth() + 1).padStart(2, "0"));
    url.searchParams.set("archiveFilter", archiveFilter);
    url.searchParams.set("archiveView", archiveView);
    if (selectedDay) url.searchParams.set("archiveDay", selectedDay);
    else url.searchParams.delete("archiveDay");
    history.replaceState(history.state, "", url.href);
  };

  const filteredEvents = () => archiveFilter === "all" ? archiveEvents : archiveEvents.filter(event => event.type === archiveFilter);
  const createArchiveMedia = (event, dateKey) => {
    const media = document.createElement("figure");
    media.className = "day-record-media";
    media.dataset.storyMedia = "";
    const caption = document.createElement("figcaption");
    if (event?.media?.src) {
      media.dataset.mediaSource = event.media.source;
      const image = document.createElement("img");
      image.src = event.media.src;
      image.width = event.media.width;
      image.height = event.media.height;
      image.alt = event.media.alt || "档案记录影像";
      image.loading = "lazy";
      image.fetchPriority = "low";
      image.decoding = "async";
      image.style.setProperty("--media-focus-desktop", event.media.focus?.desktop || "50% 50%");
      image.style.setProperty("--media-focus-mobile", event.media.focus?.mobile || "50% 50%");
      caption.textContent = event.media.source;
      media.append(image, caption);
      return media;
    }
    const materialDate = event?.date || dateKey;
    media.classList.add("day-record-material");
    media.dataset.mediaSource = "程序生成";
    media.setAttribute("role", "img");
    media.setAttribute("aria-label", `${materialDate} 的程序化日期星图`);
    const label = document.createElement("span");
    label.textContent = "日期星图";
    label.setAttribute("aria-hidden", "true");
    const date = document.createElement("time");
    date.dateTime = materialDate;
    date.textContent = materialDate.slice(5).replace("-", "·");
    const orbit = document.createElement("b");
    orbit.setAttribute("aria-hidden", "true");
    caption.textContent = "程序生成";
    media.append(label, date, orbit, caption);
    return media;
  };
  const renderDayRecord = (event, { year, month, monthHasEvents } = {}) => {
    const record = q("[data-day-record]");
    if (!record) return;
    record.replaceChildren();
    const meta = document.createElement("span");
    const title = document.createElement("h3");
    const copy = document.createElement("p");
    const numeral = document.createElement("i");
    numeral.setAttribute("aria-hidden", "true");
    if (event) {
      meta.textContent = `${event.date.replaceAll("-", ".")} · ${event.type}`;
      title.textContent = event.title;
      copy.textContent = event.text;
      numeral.textContent = event.date.slice(-2);
    } else if (!monthHasEvents) {
      const monthLabel = `${year}.${String(month + 1).padStart(2, "0")}`;
      meta.textContent = monthLabel;
      title.textContent = archiveFilter === "all" ? "本月暂无记录" : `本月暂无${archiveFilter}记录`;
      copy.textContent = "切换月份或分类查看其他档案。";
      numeral.textContent = String(month + 1).padStart(2, "0");
    } else {
      meta.textContent = selectedDay.replaceAll("-", ".");
      title.textContent = archiveFilter === "all" ? "暂无记录" : "当前分类无记录";
      copy.textContent = "选择有标记的日期。";
      numeral.textContent = selectedDay.slice(-2);
    }
    const materialDate = event?.date || selectedDay || `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const media = createArchiveMedia(event, materialDate);
    record.append(media);
    record.append(meta, title, copy, numeral);
    if (!reduceMotion) {
      [media, meta, title, copy].forEach((node, index) => node.animate([
        { opacity: .32, transform: "translateX(14px)", clipPath: "inset(0 0 0 9%)" },
        { opacity: 1, transform: "translateX(0)", clipPath: "inset(0 0 0 0)" }
      ], {
        duration: 315 + index * 28,
        delay: index * 24,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both"
      }));
    }
  };

  const renderArchive = () => {
    if (!archive) return;
    const year = archiveMonth.getFullYear();
    const month = archiveMonth.getMonth();
    const events = filteredEvents();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthEvents = events.filter(event => event.date.startsWith(monthKey));
    const selectedDate = new Date(`${selectedDay}T00:00:00`);
    const selectedInMonth = selectedDay.startsWith(`${monthKey}-`) && !Number.isNaN(selectedDate.getTime()) && selectedDate.getFullYear() === year && selectedDate.getMonth() === month;
    if (!selectedInMonth) {
      selectedDay = monthEvents[0]?.date || "";
    }
    const title = q("[data-calendar-title]");
    const yearLabel = q("[data-month-year]");
    const numberLabel = q("[data-month-number]");
    const countLabel = q("[data-archive-count]");
    const countScope = q("[data-archive-count-scope]");
    const monthCaption = q(".month-index > p");
    if (title) title.textContent = `${year} 年 ${month + 1} 月`;
    if (yearLabel) yearLabel.textContent = String(year);
    if (numberLabel) numberLabel.textContent = String(month + 1).padStart(2, "0");
    if (countLabel) countLabel.textContent = String(archiveView === "stream" ? events.length : monthEvents.length);
    if (countScope) countScope.textContent = archiveView === "stream" ? "全部" : "本月";
    if (monthCaption) monthCaption.textContent = monthNames[month];
    if (archiveYearSelect) archiveYearSelect.value = String(year);
    qa("[data-year]").forEach(button => {
      const delta = Number(button.dataset.year);
      button.disabled = delta < 0 ? year <= archiveMinYear : year >= archiveMaxYear;
    });
    qa("[data-jump-month]").forEach(button => {
      const active = Number(button.dataset.jumpMonth) === month;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (innerWidth <= 980) {
      const rail = q(".archive-month-jump");
      const activeMonth = q("[data-jump-month].active");
      if (rail && activeMonth) {
        const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
        rail.scrollLeft = clamp(activeMonth.offsetLeft - (rail.clientWidth - activeMonth.offsetWidth) / 2, 0, maximum);
      }
    }

    const grid = q("[data-calendar-grid]");
    if (!grid) return;
    grid.setAttribute("aria-label", `${year} 年 ${month + 1} 月`);
    grid.replaceChildren();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const dayCount = new Date(year, month + 1, 0).getDate();
    const focusableDay = selectedDay || `${monthKey}-01`;
    for (let index = 0; index < offset; index += 1) {
      const blank = document.createElement("span");
      blank.className = "calendar-blank";
      grid.append(blank);
    }
    for (let day = 1; day <= dayCount; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const event = monthEvents.find(item => item.date === key);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.day = key;
      button.setAttribute("role", "gridcell");
      button.classList.toggle("has-event", Boolean(event));
      button.classList.toggle("selected", key === selectedDay);
      button.setAttribute("aria-selected", String(key === selectedDay));
      button.tabIndex = key === focusableDay ? 0 : -1;
      button.setAttribute("aria-label", `${key}${event ? `，${event.title}` : "，暂无记录"}`);
      const dayNumber = document.createElement("span");
      dayNumber.textContent = String(day);
      button.append(dayNumber);
      if (event) {
        const type = document.createElement("i");
        type.textContent = event.type;
        button.append(type);
      }
      button.addEventListener("click", () => {
        archiveStateTouched = true;
        selectedDay = key;
        qa("[data-day]", grid).forEach(item => {
          const active = item === button;
          item.classList.toggle("selected", active);
          item.setAttribute("aria-selected", String(active));
          item.tabIndex = active ? 0 : -1;
        });
        renderDayRecord(event, { year, month, monthHasEvents: monthEvents.length > 0 });
        if (event && innerWidth <= 700) q("[data-day-record]")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      });
      grid.append(button);
    }
    const selectedEvent = monthEvents.find(item => item.date === selectedDay);
    renderDayRecord(selectedEvent, { year, month, monthHasEvents: monthEvents.length > 0 });
    const streamArticles = qa("[data-event-type]", archive);
    streamArticles.forEach(article => {
      article.hidden = archiveFilter !== "all" && article.dataset.eventType !== archiveFilter;
    });
    const streamEmpty = q("[data-stream-empty]", archive);
    if (streamEmpty) streamEmpty.hidden = streamArticles.some(article => !article.hidden);
    syncArchiveUrl();
  };

  const changeArchiveMonth = delta => {
    archiveStateTouched = true;
    archiveMonth.setMonth(archiveMonth.getMonth() + delta);
    if (archiveMonth.getFullYear() < archiveMinYear) archiveMonth = new Date(archiveMinYear, 0, 1);
    if (archiveMonth.getFullYear() > archiveMaxYear) archiveMonth = new Date(archiveMaxYear, 11, 1);
    selectedDay = "";
    renderArchive();
  };
  const changeArchiveYear = delta => {
    archiveStateTouched = true;
    const nextYear = clamp(archiveMonth.getFullYear() + delta, archiveMinYear, archiveMaxYear);
    archiveMonth = new Date(nextYear, archiveMonth.getMonth(), 1);
    selectedDay = "";
    renderArchive();
  };
  qa("[data-month]").forEach(button => button.addEventListener("click", () => changeArchiveMonth(Number(button.dataset.month))));
  qa("[data-year]").forEach(button => button.addEventListener("click", () => changeArchiveYear(Number(button.dataset.year))));
  archiveYearSelect?.addEventListener("change", () => {
    archiveStateTouched = true;
    archiveMonth = new Date(Number(archiveYearSelect.value), archiveMonth.getMonth(), 1);
    selectedDay = "";
    renderArchive();
  });
  qa("[data-jump-month]").forEach(button => {
    button.addEventListener("click", () => {
      archiveStateTouched = true;
      archiveMonth = new Date(archiveMonth.getFullYear(), Number(button.dataset.jumpMonth), 1);
      selectedDay = "";
      renderArchive();
    });
    button.addEventListener("keydown", event => {
      const current = Number(button.dataset.jumpMonth);
      let next = current;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current - 1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current + 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = 11;
      if (next === current) return;
      event.preventDefault();
      const nextButton = q(`[data-jump-month="${clamp(next, 0, 11)}"]`);
      nextButton?.click();
      nextButton?.focus({ preventScroll: true });
    });
  });
  qa("[data-filter]").forEach(button => button.addEventListener("click", () => {
    archiveStateTouched = true;
    archiveFilter = button.dataset.filter;
    qa("[data-filter]").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderArchive();
  }));
  const setArchiveView = (view, moveFocus = true) => {
    archiveView = view === "stream" ? "stream" : "calendar";
    const streamMode = archiveView === "stream";
    qa("[data-view]").forEach(item => {
      const active = item.dataset.view === archiveView;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    q(".month-index", archive).hidden = streamMode;
    q(".calendar-panel", archive).hidden = streamMode;
    q("[data-day-record]", archive).hidden = streamMode;
    q("[data-stream]", archive).hidden = !streamMode;
    qa(".archive-year-jump, .archive-month-jump").forEach(control => {
      control.hidden = streamMode;
    });
    archive.classList.toggle("stream-mode", streamMode);
    renderArchive();
    if (!reduceMotion) {
      const entering = streamMode
        ? [q("[data-stream]", archive)]
        : [q(".month-index", archive), q(".calendar-panel", archive), q("[data-day-record]", archive)];
      entering.filter(Boolean).forEach((node, index) => node.animate([
        { opacity: .3, transform: "translateX(18px)", clipPath: "inset(0 0 0 7%)" },
        { opacity: 1, transform: "translateX(0)", clipPath: "inset(0 0 0 0)" }
      ], {
        duration: 360,
        delay: index * 34,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both"
      }));
    }
    if (moveFocus) {
      requestAnimationFrame(() => {
        const target = streamMode
          ? q("[data-stream]", archive)
          : q("[data-day][tabindex='0']", archive);
        target?.focus({ preventScroll: true });
      });
    }
  };
  qa("[data-view]").forEach(button => button.addEventListener("click", () => {
    archiveStateTouched = true;
    setArchiveView(button.dataset.view);
  }));
  qa("[data-filter]").forEach(button => {
    const active = button.dataset.filter === archiveFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setArchiveView(archiveView, false);
  q("[data-calendar-grid]")?.addEventListener("keydown", event => {
    const target = event.target.closest("[data-day]");
    if (!target) return;
    const cells = qa("[data-day]", event.currentTarget);
    const index = cells.indexOf(target);
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex -= 1;
    if (event.key === "ArrowRight") nextIndex += 1;
    if (event.key === "ArrowUp") nextIndex -= 7;
    if (event.key === "ArrowDown") nextIndex += 7;
    const weekday = (parseCalendarDate(target.dataset.day).getDay() + 6) % 7;
    if (event.key === "Home") nextIndex = index - weekday;
    if (event.key === "End") nextIndex = index + (6 - weekday);
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      changeArchiveMonth(event.key === "PageUp" ? -1 : 1);
      requestAnimationFrame(() => q("[data-day][tabindex='0']")?.focus());
      return;
    }
    if (nextIndex !== index) {
      event.preventDefault();
      const next = cells[clamp(nextIndex, 0, cells.length - 1)];
      next?.focus();
      next?.click();
    }
  });

  const provinceNames = {
    110000: "北京市", 120000: "天津市", 130000: "河北省", 140000: "山西省", 150000: "内蒙古自治区",
    210000: "辽宁省", 220000: "吉林省", 230000: "黑龙江省", 310000: "上海市", 320000: "江苏省",
    330000: "浙江省", 340000: "安徽省", 350000: "福建省", 360000: "江西省", 370000: "山东省",
    410000: "河南省", 420000: "湖北省", 430000: "湖南省", 440000: "广东省", 450000: "广西壮族自治区",
    460000: "海南省", 500000: "重庆市", 510000: "四川省", 520000: "贵州省", 530000: "云南省",
    540000: "西藏自治区", 610000: "陕西省", 620000: "甘肃省", 630000: "青海省", 640000: "宁夏回族自治区",
    650000: "新疆维吾尔自治区", 710000: "台湾省", 810000: "香港特别行政区", 820000: "澳门特别行政区"
  };
  const mapRoot = q("[data-map]");
  const mapPoints = mapRoot ? JSON.parse(mapRoot.dataset.mapPoints || "[]") : [];
  const mapRegions = mapRoot ? JSON.parse(mapRoot.dataset.regions || "[]") : [];
  let leaflet = window.L || null;
  let travelMap;
  let geoLayer;
  let mapMarkers = [];
  const travelParams = new URLSearchParams(location.search);
  const restoredTravelScope = travelParams.get("travelScope");
  let mapScope = ["world", "china"].includes(restoredTravelScope) ? restoredTravelScope : "world";
  const restoredTravelPlace = travelParams.get("travelPlace");
  const restoredTravelIndex = mapPoints.findIndex(point => point.id === restoredTravelPlace);
  let selectedPlace = restoredTravelIndex >= 0 ? restoredTravelIndex : mapPoints.length > 1 ? 1 : mapPoints.length ? 0 : -1;
  let travelStateTouched = travelParams.has("travelScope") || travelParams.has("travelPlace");
  const placeButtons = qa("[data-place]");
  const placeSelector = q(".place-selector");
  const placeScrollButtons = qa("[data-place-scroll]");
  const scopeButtons = qa("[data-scope]");
  const journeyDrawer = q("[data-journey-drawer]");
  const journeyToggle = q("[data-story-toggle]");
  const firstChinaPlace = mapPoints.findIndex(point => point.scope === "china");
  if (mapScope === "china" && mapPoints[selectedPlace]?.scope !== "china") selectedPlace = firstChinaPlace;
  const lastSelectedPlace = {
    world: selectedPlace,
    china: mapPoints[selectedPlace]?.scope === "china" ? selectedPlace : firstChinaPlace
  };

  let placeScrollFrame = 0;
  const updatePlaceScrollControls = () => {
    placeScrollFrame = 0;
    if (!placeSelector) return;
    const maximum = Math.max(0, placeSelector.scrollWidth - placeSelector.clientWidth);
    const shell = placeSelector.closest(".place-selector-shell");
    const canScrollLeft = placeSelector.scrollLeft > 1;
    const canScrollRight = placeSelector.scrollLeft < maximum - 1;
    placeScrollButtons.forEach(button => {
      const direction = Number(button.dataset.placeScroll);
      button.disabled = direction < 0 ? !canScrollLeft : !canScrollRight;
    });
    shell?.toggleAttribute("data-scrollable", maximum > 1);
    shell?.toggleAttribute("data-can-scroll-left", canScrollLeft);
    shell?.toggleAttribute("data-can-scroll-right", canScrollRight);
  };
  const schedulePlaceScrollControls = () => {
    if (!placeScrollFrame) placeScrollFrame = requestAnimationFrame(updatePlaceScrollControls);
  };
  placeScrollButtons.forEach(button => button.addEventListener("click", () => {
    if (!placeSelector) return;
    const direction = Number(button.dataset.placeScroll) < 0 ? -1 : 1;
    const firstVisiblePlace = q("[data-place]:not(.hidden)", placeSelector);
    const distance = Math.max(150, firstVisiblePlace?.getBoundingClientRect().width || 0) * direction;
    placeSelector.scrollBy({ left: distance, behavior: reduceMotion ? "auto" : "smooth" });
  }));
  placeSelector?.addEventListener("scroll", schedulePlaceScrollControls, { passive: true });
  if (placeSelector && "ResizeObserver" in window) new ResizeObserver(schedulePlaceScrollControls).observe(placeSelector);

  journeyDrawer?.setAttribute("aria-live", "polite");
  journeyDrawer?.setAttribute("aria-atomic", "true");
  journeyDrawer?.setAttribute("aria-relevant", "text");

  const availablePlaceIndexes = scope => mapPoints.reduce((indexes, point, index) => {
    if (scope === "world" || point.scope === "china") indexes.push(index);
    return indexes;
  }, []);

  const resolvePlaceIndex = (scope, preferred) => {
    const available = availablePlaceIndexes(scope);
    if (available.includes(preferred)) return preferred;
    if (available.includes(lastSelectedPlace[scope])) return lastSelectedPlace[scope];
    return available[0] ?? -1;
  };

  const syncTravelUrl = () => {
    if (!travelStateTouched || selectedPlace < 0) return;
    const url = new URL(location.href);
    url.searchParams.set("travelScope", mapScope);
    url.searchParams.set("travelPlace", mapPoints[selectedPlace].id);
    history.replaceState(history.state, "", url.href);
  };

  const syncTravelScopeUi = () => {
    scopeButtons.forEach(item => {
      const active = item.dataset.scope === mapScope;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    placeButtons.forEach(item => item.classList.toggle("hidden", mapScope === "china" && item.dataset.placeScope !== "china"));
  };

  const centerSelectedPlace = button => {
    if (!button) return;
    const selector = button.closest(".place-selector");
    if (!selector) return;
    requestAnimationFrame(() => {
      const maximum = Math.max(0, selector.scrollWidth - selector.clientWidth);
      const centered = button.offsetLeft - (selector.clientWidth - button.offsetWidth) / 2;
      const aligned = matchMedia("(max-width: 700px)").matches ? button.offsetLeft : centered;
      const left = clamp(aligned, 0, maximum);
      if (typeof selector.scrollTo === "function") {
        selector.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
      } else {
        selector.scrollLeft = left;
      }
      schedulePlaceScrollControls();
    });
  };

  const syncJourneyAccessibility = place => {
    if (!place) return;
    const state = "已抵达";
    const collapsed = journeyDrawer?.classList.contains("collapsed") ?? false;
    journeyDrawer?.setAttribute("aria-label", `${place.name}旅行故事，${state}，${place.date}`);
    if (journeyToggle) {
      journeyToggle.textContent = collapsed ? "展开" : "收起";
      journeyToggle.setAttribute("aria-expanded", String(!collapsed));
      journeyToggle.setAttribute("aria-label", `${collapsed ? "展开" : "收起"}${place.name}旅行故事`);
    }
  };

  const regionKey = feature => mapScope === "china" ? feature?.properties?.adcode : (feature?.properties?.name || feature?.properties?.NAME || feature?.properties?.fullname || "");
  const regionName = feature => mapScope === "china" ? (provinceNames[feature?.properties?.adcode] || "未命名区域") : regionKey(feature);
  const regionState = key => mapRegions.find(region => region.scope === mapScope && String(region.key) === String(key));

  const choosePlace = (index, focusMap = false) => {
    index = resolvePlaceIndex(mapScope, index);
    if (index < 0) return;
    selectedPlace = index;
    lastSelectedPlace[mapScope] = index;
    let activeButton;
    placeButtons.forEach(button => {
      const active = Number(button.dataset.place) === index;
      button.classList.toggle("active", active);
      button.tabIndex = active ? 0 : -1;
      button.setAttribute("aria-pressed", String(active));
      if (active) activeButton = button;
    });
    qa("[data-place-story]").forEach((story, storyIndex) => {
      const active = storyIndex === index;
      story.classList.toggle("active", active);
      story.setAttribute("aria-hidden", String(!active));
    });
    mapMarkers.forEach(marker => {
      const active = marker.__memoryIndex === index;
      marker.getElement()?.classList.toggle("selected", active);
      marker.setZIndexOffset(active ? 1000 : 0);
    });
    const place = mapPoints[index];
    const journeyIndex = q("[data-journey-index]");
    const journeyState = q("[data-journey-state]");
    if (journeyIndex) journeyIndex.textContent = `${String(index + 1).padStart(2, "0")} / ${String(mapPoints.length).padStart(2, "0")}`;
    if (journeyState && place) journeyState.textContent = `${place.name} · 已抵达`;
    syncJourneyAccessibility(place);
    centerSelectedPlace(activeButton);
    schedulePlaceScrollControls();
    if (focusMap && travelMap && mapPoints[index]) {
      travelMap.flyTo([mapPoints[index].lat, mapPoints[index].lng], mapScope === "world" ? 4 : 7, { duration: reduceMotion ? 0 : 0.8 });
    }
    syncTravelUrl();
  };

  const renderTravelMap = () => {
    selectedPlace = resolvePlaceIndex(mapScope, selectedPlace);
    if (mapRoot) {
      mapRoot.dataset.scope = mapScope;
      mapRoot.dataset.mapState = "loading";
    }
    if (!travelMap || !leaflet) {
      choosePlace(selectedPlace, false);
      return;
    }
    if (geoLayer) travelMap.removeLayer(geoLayer);
    mapMarkers.forEach(marker => travelMap.removeLayer(marker));
    mapMarkers = [];
    const data = mapScope === "world" ? window.__WORLD_COUNTRIES__ : window.__CHINA_ADMIN__;
    if (!data) {
      if (mapRoot) {
        mapRoot.dataset.mapReady = "false";
        mapRoot.dataset.mapState = "error";
      }
      q("[data-map-fallback]").hidden = false;
      q("[data-map-loading]").hidden = true;
      choosePlace(selectedPlace, false);
      return;
    }
    q("[data-map-fallback]").hidden = true;
    geoLayer = leaflet.geoJSON(data, {
      style: feature => {
        const state = regionState(regionKey(feature));
        if (state?.status === "visited") return { className: "map-region-visited", color: "#f0b367", weight: 1.45, opacity: 1, fillColor: "#9b5b42", fillOpacity: 0.82, lineCap: "round", lineJoin: "round" };
        return { className: "map-region-unvisited", color: "#748593", weight: 0.82, opacity: 0.84, fillColor: "#132431", fillOpacity: 0.76, lineCap: "round", lineJoin: "round" };
      },
      onEachFeature: (feature, layer) => {
        const key = regionKey(feature);
        const name = regionName(feature);
        const state = regionState(key);
        layer.on({
          mouseover: () => layer.setStyle({ weight: state?.status === "visited" ? 2 : 1.35, opacity: 1, fillOpacity: state?.status === "visited" ? 0.92 : 0.84 }),
          mouseout: () => geoLayer.resetStyle(layer),
          click: () => layer.bindPopup(`<b>${name}</b><br><span>${state?.status === "visited" ? "已经留下共同足迹" : "暂无共同足迹"}</span>`).openPopup()
        });
      }
    }).addTo(travelMap);
    const points = mapScope === "world" ? mapPoints : mapPoints.filter(point => point.scope === "china");
    points.forEach(point => {
      const index = mapPoints.indexOf(point);
      const icon = leaflet.divIcon({
        className: `memory-map-pin ${point.status} ${point.scope}`,
        html: `<div><i></i><span><b>${point.name}</b><small>${point.date}</small></span></div>`,
        iconSize: [112, 42],
        iconAnchor: [12, 25]
      });
      const marker = leaflet.marker([point.lat, point.lng], { icon }).addTo(travelMap);
      marker.__memoryIndex = index;
      marker.on("click", () => {
        travelStateTouched = true;
        choosePlace(index, false);
      });
      mapMarkers.push(marker);
    });
    const compactMap = innerWidth <= 700;
    if (mapScope === "world") {
      travelMap.fitBounds([[-55, -170], [78, 180]], { padding: compactMap ? [12, 12] : [26, 26], maxZoom: compactMap ? 2.45 : 2.9, animate: !reduceMotion });
    } else {
      travelMap.fitBounds(geoLayer.getBounds(), { padding: compactMap ? [18, 18] : [30, 30], maxZoom: compactMap ? 4.1 : 4.6, animate: !reduceMotion });
    }
    const visitedPoints = points.filter(point => point.status === "visited");
    const label = q("[data-map-label]");
    if (label) label.textContent = mapScope === "world" ? "世界 · 共同坐标" : "中国 · 城市足迹";
    const mapCount = q("[data-map-count]");
    if (mapCount) mapCount.textContent = `${String(visitedPoints.length).padStart(2, "0")} 处已抵达`;
    mapRoot.dataset.mapReady = "true";
    mapRoot.dataset.mapState = "ready";
    q("[data-map-loading]").hidden = true;
    choosePlace(selectedPlace, false);
  };

  const failTravelMap = () => {
    if (!mapRoot) return;
    q("[data-map-loading]")?.setAttribute("hidden", "");
    q("[data-map-fallback]")?.removeAttribute("hidden");
    mapRoot.dataset.mapReady = "false";
    mapRoot.dataset.mapState = "error";
    mapRoot.dataset.mapAssets = "error";
    choosePlace(selectedPlace, false);
  };

  const loadMapStylesheet = href => new Promise((resolve, reject) => {
    const existing = q(`link[data-map-asset="${href}"]`);
    if (existing) {
      if (existing.sheet) resolve(existing);
      else existing.addEventListener("load", () => resolve(existing), { once: true });
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.mapAsset = href;
    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", reject, { once: true });
    document.head.append(link);
  });

  const loadMapScript = src => new Promise((resolve, reject) => {
    const existing = q(`script[data-map-asset="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve(existing);
      else existing.addEventListener("load", () => resolve(existing), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.mapAsset = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve(script);
    }, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });

  const initializeTravelMap = () => {
    leaflet = window.L || null;
    if (!leaflet || !q("#travelMap") || travelMap) {
      if (!travelMap) failTravelMap();
      return;
    }
    travelMap = leaflet.map("travelMap", {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: matchMedia("(pointer:fine)").matches,
      minZoom: 0.75,
      maxZoom: 9,
      zoomSnap: 0.25,
      worldCopyJump: true
    });
    mapRoot.dataset.mapAssets = "ready";
    renderTravelMap();
    travelMap.on("zoomend", () => {
      const label = q("[data-map-label]");
      if (label) label.textContent = `${mapScope === "world" ? "世界" : "中国"} · ${travelMap.getZoom().toFixed(1)}x`;
    });
    new ResizeObserver(() => travelMap.invalidateSize(false)).observe(q("#travelMap"));
  };

  let mapAssetsPromise;
  const loadTravelAssets = () => {
    if (!mapRoot) return Promise.resolve();
    if (mapAssetsPromise) return mapAssetsPromise;
    mapRoot.dataset.mapAssets = "loading";
    mapAssetsPromise = Promise.all([
      loadMapStylesheet("./assets/vendor/leaflet/leaflet.css"),
      loadMapScript("./assets/vendor/leaflet/leaflet.js")
    ]).then(() => Promise.all([
      loadMapScript("./assets/maps/world-countries.data.js"),
      loadMapScript("./assets/maps/china-admin.data.js")
    ])).then(initializeTravelMap).catch(failTravelMap);
    return mapAssetsPromise;
  };

  if (mapRoot) {
    syncTravelScopeUi();
    choosePlace(selectedPlace, false);
    if ("IntersectionObserver" in window) {
      const travelLoader = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        travelLoader.disconnect();
        loadTravelAssets();
      }, { rootMargin: "900px 0px" });
      travelLoader.observe(mapRoot);
    } else {
      loadTravelAssets();
    }
  }

  placeButtons.forEach(button => {
    button.addEventListener("click", () => {
      travelStateTouched = true;
      choosePlace(Number(button.dataset.place), true);
    });
    button.addEventListener("keydown", event => {
      const direction = ["ArrowLeft", "ArrowUp"].includes(event.key)
        ? -1
        : ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : 0;
      if (!direction) return;
      event.preventDefault();
      const visibleButtons = placeButtons.filter(item => !item.classList.contains("hidden"));
      const current = visibleButtons.indexOf(button);
      if (current < 0 || !visibleButtons.length) return;
      const next = visibleButtons[(current + direction + visibleButtons.length) % visibleButtons.length];
      travelStateTouched = true;
      choosePlace(Number(next.dataset.place), true);
      next.focus({ preventScroll: true });
    });
  });
  qa("[data-place-step]").forEach(button => button.addEventListener("click", () => {
    const available = availablePlaceIndexes(mapScope);
    const current = available.indexOf(selectedPlace);
    if (!available.length || current < 0) return;
    const direction = Number(button.dataset.placeStep) < 0 ? -1 : 1;
    travelStateTouched = true;
    choosePlace(available[(current + direction + available.length) % available.length], true);
  }));
  scopeButtons.forEach(button => button.addEventListener("click", () => {
    const nextScope = button.dataset.scope;
    if (nextScope !== "world" && nextScope !== "china") return;
    travelStateTouched = true;
    mapScope = nextScope;
    syncTravelScopeUi();
    selectedPlace = resolvePlaceIndex(mapScope, lastSelectedPlace[mapScope]);
    renderTravelMap();
    syncTravelUrl();
    requestAnimationFrame(schedulePlaceScrollControls);
  }));
  q("[data-map-zoom=in]")?.addEventListener("click", () => travelMap?.zoomIn());
  q("[data-map-zoom=out]")?.addEventListener("click", () => travelMap?.zoomOut());
  q("[data-map-reset]")?.addEventListener("click", renderTravelMap);
  journeyToggle?.addEventListener("click", () => {
    if (!journeyDrawer) return;
    const collapsed = !journeyDrawer.classList.contains("collapsed");
    journeyDrawer.classList.toggle("collapsed", collapsed);
    syncJourneyAccessibility(mapPoints[selectedPlace]);
  });
  schedulePlaceScrollControls();

  const giscusPanel = q("[data-provider='giscus']");
  const giscusHost = q("[data-giscus-host]", giscusPanel || document);
  const giscusState = q("[data-giscus-state]", giscusPanel || document);
  const giscusCopy = q("[data-giscus-copy]", giscusPanel || document);
  const giscusRetry = q("[data-giscus-retry]", giscusPanel || document);
  const onlineHosts = new Set((giscusPanel?.dataset.giscusHosts || "").split(",").filter(Boolean).map(host => host.toLowerCase()));
  let giscusTimeout = 0;
  let giscusObserver = null;
  const setGiscusStatus = (status, label, copy, retry = false) => {
    if (!giscusPanel) return;
    giscusPanel.dataset.giscusStatus = status;
    if (giscusState) giscusState.textContent = label;
    if (giscusCopy) giscusCopy.textContent = copy;
    if (giscusRetry) giscusRetry.hidden = !retry;
  };
  const stopGiscusWatch = () => {
    clearTimeout(giscusTimeout);
    giscusObserver?.disconnect();
    giscusObserver = null;
  };
  const configureGiscus = () => {
    if (!giscusPanel || !giscusHost) return;
    stopGiscusWatch();
    if (location.protocol === "file:" || !onlineHosts.has(location.hostname.toLowerCase())) {
      setGiscusStatus("preview", "本地预览", "本地预览不收集信息；正式域名启用后通过 GitHub 登录留言。");
      return;
    }
    const repo = giscusPanel.dataset.giscusRepo;
    const repoId = giscusPanel.dataset.giscusRepoId;
    const category = giscusPanel.dataset.giscusCategory;
    const categoryId = giscusPanel.dataset.giscusCategoryId;
    const discussionsEnabled = giscusPanel.dataset.giscusEnabled === "true";
    if (!discussionsEnabled || !repo || !repoId || !category || !categoryId) {
      setGiscusStatus("configuration-required", "等待 GitHub 配置", discussionsEnabled
        ? "留言界面已就绪，写入真实分类 ID 后开放。"
        : "仓库 Discussions 尚未启用，启用并创建 Guestbook 分类后开放。");
      return;
    }
    setGiscusStatus("loading", "正在连接 GitHub", "正在安全加载留言界面，请稍候。");
    giscusHost.replaceChildren();
    const script = document.createElement("script");
    Object.assign(script.dataset, {
      repo,
      repoId,
      category,
      categoryId,
      mapping: giscusPanel.dataset.giscusMapping || "specific",
      term: giscusPanel.dataset.giscusTerm || "chen-gao-guestbook",
      strict: "1",
      reactionsEnabled: "1",
      emitMetadata: "0",
      inputPosition: "top",
      theme: "transparent_dark",
      lang: "zh-CN",
      loading: "lazy"
    });
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", () => {
      if (giscusPanel.dataset.giscusStatus !== "ready") setGiscusStatus("loading", "正在建立留言簿", "连接成功，正在等待 GitHub 留言界面。");
    });
    script.addEventListener("error", () => {
      stopGiscusWatch();
      setGiscusStatus("blocked", "留言脚本被拦截", "浏览器或网络阻止了 Giscus，可允许第三方脚本后重试。", true);
    });
    giscusObserver = new MutationObserver(() => {
      const frame = q("iframe", giscusHost);
      if (!frame) return;
      stopGiscusWatch();
      setGiscusStatus("ready", "留言框已连接", "若尚未登录，请在下方使用 GitHub 登录后留下公开留言。");
    });
    giscusObserver.observe(giscusHost, { childList: true, subtree: true });
    giscusTimeout = window.setTimeout(() => {
      stopGiscusWatch();
      setGiscusStatus("blocked", "连接等待超时", "留言脚本可能被网络或隐私扩展拦截，请检查后重试。", true);
    }, 12000);
    giscusHost.append(script);
  };
  giscusRetry?.addEventListener("click", configureGiscus);
  configureGiscus();

  const scenes = qa("[data-chapter]");
  const navLinks = qa("[data-nav]");
  const railProgress = q("[data-rail-progress]");
  const railPercent = q("[data-rail-percent]");
  const pointerLight = q(".pointer-light");
  const heroCinema = q(".hero-cinema");
  let activeSceneId = "";
  const setActiveScene = scene => {
    const id = scene.id;
    if (id === activeSceneId) return;
    activeSceneId = id;
    navLinks.forEach(link => {
      const active = link.dataset.nav === id;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.body.dataset.scene = id;
  };
  const syncActiveScene = () => {
    const readingLine = scrollY + innerHeight * .38;
    let current = scenes[0];
    scenes.forEach(scene => {
      if (scene.offsetTop <= readingLine) current = scene;
    });
    if (current) setActiveScene(current);
  };
  const sceneObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("seen");
    });
  }, { rootMargin: "-28% 0px -44%", threshold: [0, 0.1, 0.35] });
  scenes.forEach(scene => sceneObserver.observe(scene));

  let visualFrame = 0;
  let scrollDirty = true;
  let pointerDirty = false;
  let pointerX = innerWidth * 0.6;
  let pointerY = innerHeight * 0.35;
  let scrollMax = 1;
  let lastRailPercent = -1;
  const refreshScrollMetrics = () => {
    scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  };
  const renderVisuals = () => {
    visualFrame = 0;
    if (scrollDirty) {
      scrollDirty = false;
      const progress = clamp(scrollY / scrollMax);
      const percent = Math.round(progress * 100);
      if (railProgress) railProgress.style.transform = `scaleY(${progress})`;
      if (railPercent && percent !== lastRailPercent) {
        railPercent.textContent = String(percent).padStart(2, "0");
        lastRailPercent = percent;
      }
      syncActiveScene();
    }
    if (pointerDirty) {
      pointerDirty = false;
      pointerLight?.style.setProperty("--pointer-x", `${pointerX}px`);
      pointerLight?.style.setProperty("--pointer-y", `${pointerY}px`);
      heroCinema?.style.setProperty("--pointer-nx", String(pointerX / innerWidth - 0.5));
      heroCinema?.style.setProperty("--pointer-ny", String(pointerY / innerHeight - 0.5));
    }
  };
  const scheduleVisuals = () => {
    if (!visualFrame) visualFrame = requestAnimationFrame(renderVisuals);
  };
  addEventListener("scroll", () => {
    scrollDirty = true;
    scheduleVisuals();
  }, { passive: true });
  addEventListener("resize", () => {
    refreshScrollMetrics();
    scrollDirty = true;
    scheduleVisuals();
  }, { passive: true });
  new ResizeObserver(() => {
    refreshScrollMetrics();
    scrollDirty = true;
    scheduleVisuals();
  }).observe(document.documentElement);
  refreshScrollMetrics();
  scheduleVisuals();

  const alignSceneFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = scenes.find(scene => scene.id === id);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    setActiveScene(target);
  };
  const scheduleHashAlignment = () => requestAnimationFrame(() => requestAnimationFrame(alignSceneFromHash));
  addEventListener("hashchange", scheduleHashAlignment);
  if (document.readyState === "complete") scheduleHashAlignment();
  else addEventListener("load", scheduleHashAlignment, { once: true });

  if (!reduceMotion && !coarsePointer) {
    addEventListener("pointermove", event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerDirty = true;
      scheduleVisuals();
    }, { passive: true });
  }
})();
