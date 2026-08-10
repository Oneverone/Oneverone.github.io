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
      setAudioState("paused");
      const sequence = await fadeAudioTo(0, fadeOutDuration);
      if (sequence !== audioFadeSequence || !pausedByUser) return;
      audio.pause();
    };
    const resumePlayback = async () => {
      pausedByUser = false;
      if (audio.paused) {
        audio.volume = 0;
        await audio.play();
        return;
      }
      setAudioState("playing");
      fadeAudioTo(backgroundVolume, fadeInDuration);
    };
    const markAudioReady = () => {
      if (audio.paused) setAudioState(audio.currentTime ? "paused" : "ready");
    };
    audio.addEventListener("loadedmetadata", markAudioReady);
    audio.addEventListener("canplay", markAudioReady);
    audio.addEventListener("play", () => {
      setAudioState("playing");
      fadeAudioTo(backgroundVolume, fadeInDuration);
    });
    audio.addEventListener("pause", () => setAudioState(audio.currentTime ? "paused" : "ready"));
    audio.addEventListener("error", () => setAudioState(audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ? "missing" : "error"));
    audioToggle?.addEventListener("click", async () => {
      try {
        if (pausedByUser || audio.paused) {
          await resumePlayback();
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
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) markAudioReady();
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
  let detailGeoLayer;
  let cityOverviewLayer;
  let cityOverviewOutlineLayer;
  let cityOverviewLabels = [];
  let cityOverviewPromise;
  let cityOverviewRenderer;
  let targetCityResolution = "overview";
  let cityBoundaryLoadToken = 0;
  let cityBoundaryVisibleKey = "";
  let cityBoundaryRequestedKey = "";
  let cityBoundaryEntries = [];
  const cityBoundaryLayers = new Map();
  const cityBoundaryLoaders = new Map();
  const cityBoundaryBuilders = new Map();
  let cityBoundaryBuildQueue = Promise.resolve();
  let regionLabelMarkers = [];
  let cityMarkers = [];
  let mapPositionFrame = 0;
  let mapHierarchyFrame = 0;
  let mapHierarchyPreviewFrame = 0;
  let previewHierarchy = null;
  let mapScopeSwitchFrame = 0;
  let pendingMapScope = "";
  let mapHierarchyIdleTimer = 0;
  let mapWheelGestureActive = false;
  let mapWheelInputIdle = false;
  let mapZoomAnimationActive = false;
  let renderedHierarchyKey = "";
  let presentedHierarchyKey = "";
  let activeHierarchyKey = "";
  let selectedBoundary = null;
  let activeBoundaryLabel = null;
  let boundaryLabelClickInProgress = false;
  let cityBoundaryPrefetchScheduled = false;
  let cityBoundaryPrefetchHandle = 0;
  let cityBoundaryPrefetchToken = 0;
  let cityBoundaryRevealFrame = 0;
  let cityBoundaryDeactivateTimer = 0;
  let worldProvincePrefetchScheduled = false;
  let worldProvincePrefetchHandle = 0;
  let worldProvinceDataPromise = null;
  let renderedCityListKey = "";
  const scopeBaseZoom = { world: 1.5, china: 3.5 };
  const hierarchyZoomOffset = { world: 0.25, china: 0.25 };
  const hierarchyPrefetchLead = { world: 0.55, china: 0.55 };
  const wheelPxPerZoomLevel = { world: 22, china: 30 };
  const hierarchyLevels = {
    world: { base: "country", detail: "province" },
    china: { base: "province", detail: "city" }
  };
  const targetHierarchyLevel = { world: "country", china: "province" };
  const manualHierarchyLevel = { world: "", china: "" };
  const scopeCameraState = { world: null, china: null };
  const cityBoundaryCacheLimit = 36;
  const travelParams = new URLSearchParams(location.search);
  const restoredTravelScope = travelParams.get("travelScope");
  let mapScope = ["world", "china"].includes(restoredTravelScope) ? restoredTravelScope : "world";
  const restoredTravelPlace = travelParams.get("travelPlace");
  const restoredTravelIndex = mapPoints.findIndex(point => point.id === restoredTravelPlace);
  let selectedPlace = restoredTravelIndex >= 0 ? restoredTravelIndex : mapPoints.length > 1 ? 1 : mapPoints.length ? 0 : -1;
  let travelStateTouched = travelParams.has("travelScope") || travelParams.has("travelPlace");
  const placeButtons = qa("[data-place]");
  const placeButtonByIndex = new Map(placeButtons.map(button => [Number(button.dataset.place), button]));
  const placeSelector = q(".place-selector");
  const placeScrollButtons = qa("[data-place-scroll]");
  const scopeButtons = qa("[data-scope]");
  const levelSwitch = q("[data-map-level-switch]");
  const levelButtons = qa("[data-map-level-option]", levelSwitch || document);
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

  const comparePlaceIndexesByVisit = (left, right) => String(mapPoints[right]?.date || "").localeCompare(String(mapPoints[left]?.date || "")) || left - right;
  const orderedPlaceIndexes = indexes => [...indexes].sort(comparePlaceIndexesByVisit);
  const visiblePlaceIndexesForHierarchy = level => orderedPlaceIndexes(mapPoints.reduce((indexes, point, index) => {
    if (point.status !== "visited") return indexes;
    if (mapScope === "china" && point.scope === "china") indexes.push(index);
    else if (mapScope === "world" && (level === "country" || point.scope !== "china")) indexes.push(index);
    return indexes;
  }, []));
  const orderVisiblePlaceButtons = indexes => {
    if (!placeSelector) return [];
    const ordered = orderedPlaceIndexes(indexes);
    const visible = new Set(ordered);
    placeButtons.forEach(button => button.classList.toggle("hidden", !visible.has(Number(button.dataset.place))));
    ordered.forEach((index, order) => {
      const button = placeButtonByIndex.get(index);
      if (!button) return;
      const number = button.querySelector(":scope > span");
      if (number) number.textContent = String(order + 1).padStart(2, "0");
      placeSelector.append(button);
    });
    return ordered;
  };

  const availablePlaceIndexes = scope => orderedPlaceIndexes(mapPoints.reduce((indexes, point, index) => {
    if ((scope === "world" && point.scope !== "china") || (scope === "china" && point.scope === "china")) indexes.push(index);
    return indexes;
  }, []));

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

  const presentedMapLevel = () => presentedHierarchyKey.startsWith(`${mapScope}:`)
    ? presentedHierarchyKey.split(":")[1]
    : mapRoot?.dataset.mapLevel || hierarchyLevels[mapScope].base;

  const syncMapLevelSwitchUi = (level = presentedMapLevel(), pendingLevel = "") => {
    if (!levelSwitch) return;
    const config = hierarchyLevels[mapScope];
    const allowed = new Set([config.base, config.detail]);
    const currentLevel = allowed.has(level) ? level : config.base;
    const pending = allowed.has(pendingLevel) && pendingLevel !== currentLevel ? pendingLevel : "";
    levelSwitch.dataset.scope = mapScope;
    levelSwitch.setAttribute("aria-label", `${mapScope === "world" ? "世界" : "中国"}地图粒度`);
    levelSwitch.setAttribute("aria-busy", String(Boolean(pending)));
    levelButtons.forEach(button => {
      const option = button.dataset.mapLevelOption || "";
      const visible = allowed.has(option);
      const active = visible && option === currentLevel;
      const isPending = visible && option === pending;
      button.hidden = !visible;
      button.disabled = !travelMap || mapRoot?.dataset.mapState === "error";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      if (isPending) button.dataset.pending = "true";
      else delete button.dataset.pending;
      button.textContent = option === "country" ? "国家" : option === "city" ? "市" : mapScope === "world" ? "省州" : "省";
      button.setAttribute("aria-label", `显示${button.textContent}${option === "country" ? "边界" : "级边界"}`);
    });
  };

  const syncTravelScopeUi = () => {
    scopeButtons.forEach(item => {
      const active = item.dataset.scope === mapScope;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    placeButtons.forEach(item => item.classList.toggle("hidden", mapScope === "china" && item.dataset.placeScope !== "china"));
    syncMapLevelSwitchUi();
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
  const regionName = feature => mapScope === "china" ? (provinceNames[feature?.properties?.adcode] || feature?.properties?.name || "") : regionKey(feature);
  const regionState = key => mapRegions.find(region => region.scope === mapScope && String(region.key) === String(key));
  const chinaRegionState = key => mapRegions.find(region => region.scope === "china" && String(region.key) === String(key));
  const compactProvinceLabel = name => name
    .replace("维吾尔自治区", "")
    .replace("壮族自治区", "")
    .replace("回族自治区", "")
    .replace("特别行政区", "")
    .replace("自治区", "")
    .replace(/[省市]$/, "");

  const normalizeAdminName = value => String(value || "")
    .replace(/(壮族|回族|维吾尔|蒙古族|哈萨克|朝鲜族|藏族|彝族|白族|苗族|傣族|侗族|土家族|布依族|傈僳族|佤族|拉祜族|纳西族|瑶族|景颇族|柯尔克孜族|哈尼族|羌族|仡佬族|黎族|畲族|土族|仫佬族|水族|毛南族|撒拉族|锡伯族|普米族|达斡尔族|阿昌族|塔吉克族|怒族|乌孜别克族|俄罗斯族|鄂温克族|德昂族|保安族|裕固族|京族|塔塔尔族|独龙族|鄂伦春族|赫哲族|门巴族|珞巴族|基诺族)?自治(州|区|县)/g, "")
    .replace(/特别行政区|地区|盟|市|省/g, "")
    .replace(/\s+/g, "")
    .trim();
  const worldAdminAliases = new Map([
    ["伊斯坦堡", "伊斯坦布尔"],
    ["伊茲密爾次分區", "伊兹密尔"]
  ]);
  const normalizeWorldAdminName = value => {
    const normalized = normalizeAdminName(value)
      .replace(/[州都府道县区]$/g, "")
      .trim();
    return worldAdminAliases.get(normalized) || normalized;
  };
  const worldProvinceGroupKey = (country, province) => `${normalizeWorldAdminName(country)}\u0000${normalizeWorldAdminName(province)}`;
  const worldProvinceVisitGroups = mapPoints.reduce((groups, point, index) => {
    if (point.scope === "china" || point.status !== "visited") return groups;
    const parts = point.region.split(" · ");
    const country = parts[0];
    const label = parts[1] || parts[0];
    const key = worldProvinceGroupKey(country, label);
    const group = groups.get(key) || { country, label, indexes: [] };
    group.indexes.push(index);
    groups.set(key, group);
    return groups;
  }, new Map());
  const worldProvinceVisit = feature => {
    const provinceCode = String(feature?.properties?.adcode || "");
    if (feature?.properties?.countryCode === "CHN") {
      const label = provinceNames[provinceCode] || feature?.properties?.name || "";
      return { status: "unvisited", label, indexes: [] };
    }
    const label = feature?.properties?.name || "";
    const country = feature?.properties?.country || "";
    const hierarchyKey = worldProvinceGroupKey(country, label);
    const group = worldProvinceVisitGroups.get(hierarchyKey);
    return { status: group?.indexes?.length ? "visited" : "unvisited", label, hierarchyKey, indexes: group?.indexes || [] };
  };
  const chinaPointByAdminName = new Map();
  mapPoints.forEach((point, index) => {
    if (point.scope === "china") chinaPointByAdminName.set(normalizeAdminName(point.name), { point, index });
  });
  const cityFeatureName = feature => feature?.properties?.fullname || feature?.properties?.name || "";
  const cityFeatureVisit = (feature, provinceCode) => {
    const direct = chinaPointByAdminName.get(normalizeAdminName(cityFeatureName(feature)));
    const municipality = /^(11|12|31|50|81|82)/.test(String(provinceCode));
    const parentVisited = municipality && chinaRegionState(provinceCode)?.status === "visited";
    return { direct, visited: Boolean(direct || parentVisited), inherited: !direct && parentVisited };
  };

  const primaryBoundaryStyle = feature => {
    const visited = regionState(regionKey(feature))?.status === "visited";
    return visited
      ? { className: "map-region-visited", color: "#f0b367", weight: 1.45, opacity: 1, fillColor: "#9b5b42", fillOpacity: 0.82, lineCap: "round", lineJoin: "round" }
      : { className: "map-region-unvisited", color: "#748593", weight: 0.82, opacity: 0.84, fillColor: "#132431", fillOpacity: 0.76, lineCap: "round", lineJoin: "round" };
  };

  const featureOuterRings = feature => {
    const geometry = feature?.geometry;
    if (!geometry?.coordinates) return [];
    if (geometry.type === "Polygon") return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
    if (geometry.type === "MultiPolygon") return geometry.coordinates.map(polygon => polygon[0]).filter(Boolean);
    return [];
  };

  const ringVisualMetrics = ring => {
    if (!Array.isArray(ring) || ring.length < 3) return null;
    let crossTotal = 0;
    let longitudeTotal = 0;
    let latitudeTotal = 0;
    for (let index = 0; index < ring.length; index += 1) {
      const current = ring[index];
      const next = ring[(index + 1) % ring.length];
      if (!Array.isArray(current) || !Array.isArray(next)) continue;
      const cross = current[0] * next[1] - next[0] * current[1];
      crossTotal += cross;
      longitudeTotal += (current[0] + next[0]) * cross;
      latitudeTotal += (current[1] + next[1]) * cross;
    }
    if (Math.abs(crossTotal) < 1e-8) return null;
    return {
      area: Math.abs(crossTotal / 2),
      center: [latitudeTotal / (3 * crossTotal), longitudeTotal / (3 * crossTotal)]
    };
  };

  const featureVisualCenter = (feature, featureLayer) => {
    const centroid = feature?.properties?.centroid;
    if (Array.isArray(centroid) && centroid.length >= 2 && centroid.every(Number.isFinite)) return [centroid[1], centroid[0]];
    if (typeof featureLayer?.getCenter === "function" && featureLayer?._map) {
      const center = featureLayer.getCenter();
      if (Number.isFinite(center?.lat) && Number.isFinite(center?.lng)) return center;
    }
    const largest = featureOuterRings(feature)
      .map(ringVisualMetrics)
      .filter(Boolean)
      .sort((a, b) => b.area - a.area)[0];
    if (largest?.center.every(Number.isFinite)) return largest.center;
    return featureLayer?.getBounds?.().getCenter?.() || [0, 0];
  };

  const closeBoundaryLabel = () => {
    if (!activeBoundaryLabel) return false;
    const { layer, tooltip } = activeBoundaryLabel;
    if (travelMap && tooltip && travelMap.hasLayer(tooltip)) travelMap.removeLayer(tooltip);
    layer?.getElement?.()?.setAttribute("aria-expanded", "false");
    activeBoundaryLabel = null;
    if (mapRoot) delete mapRoot.dataset.boundaryLabel;
    return true;
  };

  const toggleBoundaryLabel = (layer, event = null) => {
    const descriptor = layer?.__boundaryLabel;
    if (!travelMap || !leaflet || !descriptor) return false;
    if (activeBoundaryLabel?.layer === layer) {
      closeBoundaryLabel();
      if (selectedBoundary?.layer === layer) clearBoundarySelection();
      return false;
    }
    closeBoundaryLabel();
    if (selectedBoundary?.layer !== layer) clearBoundarySelection();
    const fallback = descriptor.anchor?.() || featureVisualCenter(layer.feature, layer);
    const latLng = event?.latlng || fallback;
    const tooltip = leaflet.tooltip({
      direction: "top",
      className: descriptor.className,
      opacity: descriptor.opacity,
      offset: [0, -5],
      interactive: false,
      permanent: false
    })
      .setLatLng(latLng)
      .setContent(descriptor.content)
      .addTo(travelMap);
    activeBoundaryLabel = { layer, tooltip };
    selectBoundary(
      layer,
      typeof descriptor.owner === "function" ? descriptor.owner() : descriptor.owner,
      descriptor.visited,
      descriptor.name
    );
    layer.getElement?.()?.setAttribute("aria-expanded", "true");
    if (mapRoot) mapRoot.dataset.boundaryLabel = descriptor.name;
    descriptor.onOpen?.();
    return true;
  };

  const registerBoundaryLabel = (layer, descriptor) => {
    if (!layer || !descriptor?.name) return;
    layer.__boundaryLabel = {
      className: "map-region-label city click-locked",
      opacity: 0.94,
      ...descriptor
    };
    layer.on("click", event => {
      boundaryLabelClickInProgress = true;
      if (event.originalEvent) event.originalEvent.__mapBoundaryLabelHandled = true;
      toggleBoundaryLabel(layer, event);
      queueMicrotask(() => {
        boundaryLabelClickInProgress = false;
      });
    });
    layer.on("remove", () => {
      if (activeBoundaryLabel?.layer === layer) closeBoundaryLabel();
    });
  };

  const clearBoundarySelection = () => {
    if (!selectedBoundary) return;
    const { layer, owner } = selectedBoundary;
    owner?.resetStyle?.(layer);
    const element = layer?.getElement?.();
    element?.classList.remove("selected");
    element?.setAttribute("aria-pressed", "false");
    selectedBoundary = null;
    if (mapRoot) delete mapRoot.dataset.selectedBoundary;
  };

  const selectBoundary = (layer, owner, visited, name) => {
    if (!layer) return;
    if (selectedBoundary?.layer !== layer) clearBoundarySelection();
    selectedBoundary = { layer, owner };
    layer.setStyle(visited
      ? { color: "#ffd18e", weight: 2.45, opacity: 1, fillColor: "#a86749", fillOpacity: 0.92 }
      : { color: "#9aabb5", weight: 1.75, opacity: 1, fillColor: "#183240", fillOpacity: 0.84 });
    const element = layer.getElement?.();
    element?.classList.add("selected");
    element?.setAttribute("aria-pressed", "true");
    layer.bringToFront?.();
    if (mapRoot) mapRoot.dataset.selectedBoundary = name || "";
  };

  const makeBoundaryAccessible = (layer, name, stateText, activate) => {
    const element = layer?.getElement?.();
    if (!element || !name) return;
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `${name}，${stateText}`);
    element.setAttribute("aria-pressed", String(selectedBoundary?.layer === layer));
    element.setAttribute("aria-expanded", String(activeBoundaryLabel?.layer === layer));
    if (layer.__boundaryLabel) layer.__boundaryLabel.onOpen = activate;
    if (element.dataset.boundaryKeyboard === "true") return;
    element.dataset.boundaryKeyboard = "true";
    element.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleBoundaryLabel(layer);
    });
  };

  const removeBoundaryFromTabOrder = layer => {
    const element = layer?.getElement?.();
    if (!element) return;
    element.setAttribute("tabindex", "-1");
    if (element.dataset.boundaryKeyboard !== "true") {
      element.removeAttribute("role");
      element.removeAttribute("aria-label");
      element.removeAttribute("aria-pressed");
    }
  };

  const resetBoundaryHover = (owner, layer) => {
    if (selectedBoundary?.layer === layer) return;
    owner?.resetStyle?.(layer);
  };

  const hierarchyThreshold = scope => scopeBaseZoom[scope] + hierarchyZoomOffset[scope];

  const activeCityBoundaryEntries = () => [...cityBoundaryLayers.values()].filter(entry => entry.active);
  const hasActiveCityBoundaries = () => activeCityBoundaryEntries().length > 0;

  const setBoundaryLevelPresentation = (level, cityReady = Boolean(cityOverviewLayer), cityResolution = "overview") => {
    if (!travelMap) return;
    const showCity = mapScope === "china" && level === "city" && cityReady;
    const showCityOverview = showCity && cityResolution === "overview";
    const showCityDetail = showCity && cityResolution === "detail";
    const showWorldProvince = mapScope === "world" && level === "province" && Boolean(detailGeoLayer);
    const primaryPane = travelMap.getPane("primaryBoundary");
    const primaryLabelPane = travelMap.getPane("primaryLabels");
    const provincePane = travelMap.getPane("provinceDetail");
    const cityPane = travelMap.getPane("cityBoundary");
    const cityOverviewPane = travelMap.getPane("cityOverview");
    const provinceOutlinePane = travelMap.getPane("provinceOutline");
    const cityOverviewOutlinePane = travelMap.getPane("cityOverviewOutline");
    const cityLabelPane = travelMap.getPane("cityLabels");
    const cityOverviewLabelPane = travelMap.getPane("cityOverviewLabels");
    if (primaryPane) {
      primaryPane.style.zIndex = "400";
      // The city layer already owns the full base fill. Hiding the province
      // layer prevents two independent renderers from visibly chasing each
      // other during animated zoom.
      primaryPane.style.opacity = showCity ? "0" : showWorldProvince ? "0.16" : "1";
      primaryPane.style.pointerEvents = showCity || showWorldProvince ? "none" : "auto";
      primaryPane.inert = showCity || showWorldProvince;
      primaryPane.setAttribute("aria-hidden", String(showCity || showWorldProvince));
    }
    if (primaryLabelPane) {
      primaryLabelPane.style.opacity = showCity || showWorldProvince ? "0" : "1";
      primaryLabelPane.style.pointerEvents = "none";
      primaryLabelPane.inert = showCity || showWorldProvince;
      primaryLabelPane.setAttribute("aria-hidden", String(showCity || showWorldProvince));
    }
    if (provincePane) {
      provincePane.style.opacity = showWorldProvince ? "1" : "0";
      provincePane.style.pointerEvents = showWorldProvince ? "auto" : "none";
      provincePane.inert = !showWorldProvince;
      provincePane.setAttribute("aria-hidden", String(!showWorldProvince));
    }
    if (cityPane) {
      cityPane.style.opacity = showCityDetail ? "1" : "0";
      cityPane.style.pointerEvents = showCityDetail ? "auto" : "none";
      cityPane.inert = !showCityDetail;
      cityPane.setAttribute("aria-hidden", String(!showCityDetail));
    }
    if (cityOverviewPane) {
      cityOverviewPane.style.opacity = showCityOverview ? "1" : "0";
      cityOverviewPane.style.pointerEvents = showCityOverview ? "auto" : "none";
      cityOverviewPane.inert = !showCityOverview;
      cityOverviewPane.setAttribute("aria-hidden", String(!showCityOverview));
    }
    if (provinceOutlinePane) {
      provinceOutlinePane.style.opacity = showCityDetail ? "1" : "0";
      provinceOutlinePane.style.pointerEvents = "none";
      provinceOutlinePane.inert = !showCityDetail;
      provinceOutlinePane.setAttribute("aria-hidden", String(!showCityDetail));
    }
    if (cityOverviewOutlinePane) {
      cityOverviewOutlinePane.style.opacity = showCityOverview ? "1" : "0";
      cityOverviewOutlinePane.style.pointerEvents = "none";
      cityOverviewOutlinePane.inert = !showCityOverview;
      cityOverviewOutlinePane.setAttribute("aria-hidden", String(!showCityOverview));
    }
    if (cityLabelPane) {
      cityLabelPane.style.opacity = showCityDetail ? "1" : "0";
      cityLabelPane.style.pointerEvents = "none";
      cityLabelPane.inert = !showCityDetail;
      cityLabelPane.setAttribute("aria-hidden", String(!showCityDetail));
    }
    if (cityOverviewLabelPane) {
      cityOverviewLabelPane.style.opacity = showCityOverview ? "1" : "0";
      cityOverviewLabelPane.style.pointerEvents = "none";
      cityOverviewLabelPane.inert = !showCityOverview;
      cityOverviewLabelPane.setAttribute("aria-hidden", String(!showCityOverview));
    }
    mapRoot.dataset.cityResolution = showCity ? cityResolution : "none";
    mapRoot.dataset.boundaryPresentation = showCity ? "city" : showWorldProvince ? "province" : mapScope === "world" ? "country" : "province";
    const preparing = (mapScope === "china" && level === "city" && !cityReady)
      || (mapScope === "world" && level === "province" && !detailGeoLayer);
    mapRoot.dataset.mapTransition = preparing ? "preparing" : "settled";
    mapRoot.setAttribute("aria-busy", String(preparing));
  };

  const hierarchyLevelAtZoom = (scope, zoom) => {
    const config = hierarchyLevels[scope];
    const current = targetHierarchyLevel[scope] || config.base;
    const threshold = hierarchyThreshold(scope);
    return current === config.detail
      ? zoom >= threshold - 0.12 ? config.detail : config.base
      : zoom >= threshold - 0.01 ? config.detail : config.base;
  };

  // Granularity is semantic, not camera-dependent: once the user selects
  // "city", every visible part of China remains city-level at every zoom.
  const cityResolutionAtZoom = () => {
    targetCityResolution = "overview";
    return targetCityResolution;
  };

  const mapLevel = () => {
    const config = hierarchyLevels[mapScope];
    const manualLevel = manualHierarchyLevel[mapScope];
    if (manualLevel && [config.base, config.detail].includes(manualLevel)) {
      targetHierarchyLevel[mapScope] = manualLevel;
      return manualLevel;
    }
    if (previewHierarchy?.scope === mapScope && [config.base, config.detail].includes(previewHierarchy.level)) {
      targetHierarchyLevel[mapScope] = previewHierarchy.level;
      return previewHierarchy.level;
    }
    const zoom = travelMap?.getZoom() ?? scopeBaseZoom[mapScope];
    const next = hierarchyLevelAtZoom(mapScope, zoom);
    targetHierarchyLevel[mapScope] = next;
    return next;
  };

  const updateZoomControls = () => {
    if (!travelMap) return;
    const zoom = travelMap.getZoom();
    const min = travelMap.getMinZoom();
    const max = travelMap.getMaxZoom();
    const zoomIn = q("[data-map-zoom=in]");
    const zoomOut = q("[data-map-zoom=out]");
    if (zoomIn) zoomIn.disabled = zoom >= max - 0.01;
    if (zoomOut) zoomOut.disabled = zoom <= min + 0.01;
    mapRoot.dataset.mapZoom = zoom.toFixed(3);
    mapRoot.dataset.mapBaseZoom = scopeBaseZoom[mapScope].toFixed(2);
    mapRoot.dataset.mapHierarchyThreshold = hierarchyThreshold(mapScope).toFixed(2);
    delete mapRoot.dataset.mapCityThreshold;
    const center = travelMap.getCenter();
    mapRoot.dataset.mapCenter = `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`;
  };

  const stopTravelMapMotion = () => {
    if (!travelMap) return;
    if (mapHierarchyPreviewFrame) cancelAnimationFrame(mapHierarchyPreviewFrame);
    mapHierarchyPreviewFrame = 0;
    previewHierarchy = null;
    const wheel = travelMap.scrollWheelZoom;
    if (wheel?._timer) clearTimeout(wheel._timer);
    if (wheel) {
      wheel._timer = null;
      wheel._delta = 0;
      wheel._startTime = null;
    }
    travelMap.stop();
    if (travelMap._animatingZoom && typeof travelMap._onZoomTransitionEnd === "function") {
      travelMap._onZoomTransitionEnd();
    }
    travelMap._panAnim?.stop?.();
  };

  const hardSetTravelMapView = (center, zoom) => {
    if (!travelMap) return;
    stopTravelMapMotion();
    const targetZoom = clamp(zoom, travelMap.getMinZoom(), travelMap.getMaxZoom());
    // Leaflet may have queued an animated zoom for the next frame. `reset`
    // bypasses that queue so a scope change always lands on one camera state.
    travelMap.setView(center, targetZoom, { animate: false, reset: true });
  };

  const focusMapAt = (lat, lng, zoom) => {
    if (!travelMap) return;
    const targetZoom = clamp(zoom, travelMap.getMinZoom(), travelMap.getMaxZoom());
    stopTravelMapMotion();
    if (reduceMotion) hardSetTravelMapView([lat, lng], targetZoom);
    else travelMap.flyTo([lat, lng], targetZoom, { duration: 0.46, easeLinearity: 0.22 });
  };

  const updateMapHierarchyUi = level => {
    const legendLabel = q("[data-map-legend-label]");
    if (legendLabel) legendLabel.textContent = "已经抵达";
    mapRoot.dataset.mapLevel = level;
    const label = q("[data-map-label]");
    const levelLabel = mapScope === "world"
      ? level === "country" ? "国家总览" : "省州边界"
      : level === "province" ? "省份总览" : "市级边界";
    if (label) label.textContent = `${mapScope === "world" ? "世界" : "中国"} · ${levelLabel}`;
    const note = q("[data-map-level-note]");
    const manualLevel = manualHierarchyLevel[mapScope];
    mapRoot.dataset.mapLevelMode = manualLevel ? "manual" : "auto";
    if (note) note.textContent = manualLevel
      ? `已手动显示${level === "country" ? "国家" : level === "province" ? (mapScope === "world" ? "省州" : "省份") : "城市"}边界 · 缩放比例未改变`
      : level === hierarchyLevels[mapScope].base
        ? `继续放大查看${mapScope === "world" ? "省州" : "城市"}`
        : `缩小返回${mapScope === "world" ? "国家" : "省份"}`;
    const listNoun = level === "country" ? "国家" : level === "province" ? (mapScope === "world" ? "省州" : "省份") : "城市";
    qa("[data-place-scroll]").forEach(button => {
      const direction = Number(button.dataset.placeScroll) < 0 ? "向左" : "向右";
      button.setAttribute("aria-label", `${direction}浏览已到访${listNoun}`);
    });
    syncMapLevelSwitchUi(level);
    updateZoomControls();
  };

  const showMapPreparationNote = message => {
    const note = q("[data-map-level-note]");
    if (note) note.textContent = message;
  };

  const setActiveHierarchyButton = (button, focus = false) => {
    if (!button || !placeSelector) return;
    activeHierarchyKey = button.dataset.hierarchyKey || "";
    qa("[data-hierarchy-place]", placeSelector).forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    centerSelectedPlace(button);
    if (focus) button.focus({ preventScroll: true });
  };

  const syncHierarchyBoundary = key => {
    if (!key || !placeSelector) return;
    const button = qa("[data-hierarchy-place]", placeSelector).find(item => item.dataset.hierarchyKey === key);
    if (button) setActiveHierarchyButton(button);
  };

  const syncPlaceHierarchy = level => {
    if (!placeSelector) return;
    mapRoot.dataset.mapListMode = "visited-only";
    placeSelector.setAttribute("aria-label", level === "country" ? "选择已经到访的国家或地区" : level === "province" ? `选择已经到访的${mapScope === "world" ? "省州" : "省份"}` : "选择已经到访的城市");
    qa("[data-hierarchy-place]", placeSelector).forEach(button => button.remove());
    const visibleIndexes = visiblePlaceIndexesForHierarchy(level);
    const visiblePoints = visibleIndexes.map(index => mapPoints[index]);
    const cityMode = level === "city";
    placeButtons.forEach(button => {
      const point = mapPoints[Number(button.dataset.place)];
      const inScope = mapScope === "world" || button.dataset.placeScope === "china";
      const isVisited = point?.status === "visited";
      button.classList.toggle("hidden", !cityMode || !inScope || !isVisited);
    });
    if (cityMode) {
      orderVisiblePlaceButtons(visibleIndexes);
      schedulePlaceScrollControls();
      return;
    }
    const countryMeta = mapScope === "world" && level === "province"
      ? visiblePoints.reduce((result, point) => {
        const country = point.region.split(" · ")[0];
        const pointIndex = mapPoints.indexOf(point);
        const meta = result.get(country) || { latest: point.date, firstIndex: pointIndex };
        if (point.date > meta.latest) {
          meta.latest = point.date;
          meta.firstIndex = pointIndex;
        } else if (point.date === meta.latest && pointIndex < meta.firstIndex) {
          meta.firstIndex = pointIndex;
        }
        result.set(country, meta);
        return result;
      }, new Map())
      : null;
    const groups = [...visiblePoints.reduce((result, point) => {
      const parts = point.region.split(" · ");
      const parent = parts[0];
      const key = level === "country" ? (point.scope === "china" ? "中国" : parent) : (parts[1] || parent);
      const hierarchyKey = mapScope === "world" && level === "province" ? worldProvinceGroupKey(parent, key) : key;
      const pointIndex = mapPoints.indexOf(point);
      const group = result.get(hierarchyKey) || { key, hierarchyKey, parent, indexes: [], latest: point.date, firstIndex: pointIndex, latTotal: 0, lngTotal: 0 };
      group.indexes.push(pointIndex);
      group.latTotal += point.lat;
      group.lngTotal += point.lng;
      if (point.date > group.latest) {
        group.latest = point.date;
        group.firstIndex = pointIndex;
      } else if (point.date === group.latest && pointIndex < group.firstIndex) {
        group.firstIndex = pointIndex;
      }
      result.set(hierarchyKey, group);
      return result;
    }, new Map()).values()].sort((left, right) => {
      if (countryMeta) {
        const leftCountry = countryMeta.get(left.parent);
        const rightCountry = countryMeta.get(right.parent);
        const countryOrder = rightCountry.latest.localeCompare(leftCountry.latest) || leftCountry.firstIndex - rightCountry.firstIndex;
        if (countryOrder) return countryOrder;
      }
      return right.latest.localeCompare(left.latest) || left.firstIndex - right.firstIndex || left.key.localeCompare(right.key, "zh-CN");
    });
    const selectedPoint = mapPoints[selectedPlace];
    const selectedParts = selectedPoint?.region?.split(" · ") || [];
    const selectedLabel = level === "country"
      ? (selectedPoint?.scope === "china" ? "中国" : selectedParts[0])
      : (selectedParts[1] || selectedParts[0]);
    const selectedGroupKey = mapScope === "world" && level === "province"
      ? worldProvinceGroupKey(selectedParts[0], selectedLabel)
      : selectedLabel;
    if (!groups.some(group => group.hierarchyKey === activeHierarchyKey)) {
      activeHierarchyKey = groups.some(group => group.hierarchyKey === selectedGroupKey) ? selectedGroupKey : groups[0]?.hierarchyKey || "";
    }
    groups.forEach((group, order) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.hierarchyPlace = level;
      button.dataset.hierarchyKey = group.hierarchyKey;
      const active = activeHierarchyKey === group.hierarchyKey;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.tabIndex = active || (!activeHierarchyKey && order === 0) ? 0 : -1;
      const detail = mapScope === "world" && level === "province"
        ? `${group.parent} · ${group.latest}`
        : `${group.latest} · ${String(group.indexes.length).padStart(2, "0")} 处`;
      button.innerHTML = `<span>${String(order + 1).padStart(2, "0")}</span><b>${group.key}<small>${detail}</small></b><i class="visited" aria-hidden="true"></i>`;
      button.setAttribute("aria-label", `${group.parent && level === "province" ? `${group.parent}，` : ""}${group.key}，${group.indexes.length} 个到访城市`);
      button.addEventListener("click", () => {
        setActiveHierarchyButton(button);
        const lat = group.latTotal / group.indexes.length;
        const lng = group.lngTotal / group.indexes.length;
        const targetZoom = level === hierarchyLevels[mapScope].base
          ? hierarchyThreshold(mapScope) + (mapScope === "china" ? 0.55 : 0.45)
          : Math.max(travelMap?.getZoom() || hierarchyThreshold(mapScope), hierarchyThreshold(mapScope) + 0.35);
        focusMapAt(lat, lng, targetZoom);
      });
      button.addEventListener("keydown", event => {
        const direction = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : 0;
        if (!direction) return;
        event.preventDefault();
        const buttons = qa("[data-hierarchy-place]", placeSelector);
        const index = buttons.indexOf(button);
        const next = buttons[(index + direction + buttons.length) % buttons.length];
        setActiveHierarchyButton(next, true);
      });
      placeSelector.append(button);
    });
    placeSelector.scrollLeft = 0;
    schedulePlaceScrollControls();
  };

  const presentHierarchyLevel = (level, { refreshList = false } = {}) => {
    const key = `${mapScope}:${level}`;
    const changed = key !== presentedHierarchyKey;
    if (changed) closeBoundaryLabel();
    presentedHierarchyKey = key;
    updateMapHierarchyUi(level);
    if (changed || refreshList) {
      const eligibleIndexes = visiblePlaceIndexesForHierarchy(level);
      if (!eligibleIndexes.includes(selectedPlace) && eligibleIndexes.length) choosePlace(eligibleIndexes[0], false);
      activeHierarchyKey = "";
      renderedCityListKey = "";
      syncPlaceHierarchy(level);
      if (level !== "city") mapRoot.dataset.mapMarkerCount = "0";
    }
  };

  const cityBoundaryViewportLimit = () => {
    if (!travelMap) return 0;
    if (innerWidth <= 700) return travelMap.getZoom() >= hierarchyThreshold("china") + 1.6 ? 6 : 4;
    return travelMap.getZoom() >= hierarchyThreshold("china") + 1.6 ? 8 : 6;
  };

  const visibleProvinceCodes = (limit = cityBoundaryViewportLimit()) => {
    if (!travelMap || !geoLayer || mapScope !== "china") return [];
    const mapBounds = travelMap.getBounds();
    const viewport = mapBounds.pad(0.14);
    const retentionViewport = mapBounds.pad(0.3);
    const activeCodes = new Set(activeCityBoundaryEntries().map(entry => entry.code));
    const mapCenter = travelMap.getSize().divideBy(2);
    const candidates = [];
    geoLayer.eachLayer(layer => {
      const code = String(layer.feature?.properties?.adcode || "");
      if (!/^\d{6}$/.test(code) || typeof layer.getBounds !== "function") return;
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      const point = travelMap.latLngToContainerPoint(center);
      const distance = point.distanceTo(mapCenter);
      candidates.push({ code, center, visible: bounds.intersects(viewport), retained: activeCodes.has(code) && bounds.intersects(retentionViewport), distance });
    });
    const visible = candidates.filter(candidate => candidate.visible || candidate.retained);
    const ranked = (visible.length ? visible : candidates)
      .sort((left, right) => Number(right.retained) - Number(left.retained) || left.distance - right.distance)
      .slice(0, Math.max(1, limit));
    return ranked.map(candidate => candidate.code);
  };

  // High-resolution city polygons behave like map tiles. The low-resolution
  // nationwide city overview handles broad scales, so this working set can stay
  // small and stable without producing mixed province/city patches.
  const visibleProvinceCodesForCoverage = () => visibleProvinceCodes(cityBoundaryViewportLimit());

  const loadCityBoundaryData = code => {
    if (window.__CHINA_CITY_ADMIN__?.[code]) return Promise.resolve(window.__CHINA_CITY_ADMIN__[code]);
    if (cityBoundaryLoaders.has(code)) return cityBoundaryLoaders.get(code);
    const promise = loadMapScript(`./assets/maps/china-city-${code}.data.js`)
      .then(() => window.__CHINA_CITY_ADMIN__?.[code] || null)
      .catch(() => null);
    cityBoundaryLoaders.set(code, promise);
    return promise;
  };

  const waitForCityBuildSlot = () => new Promise(resolve => requestAnimationFrame(resolve));
  let cityBoundaryBuildFrameStartedAt = 0;
  const cityBoundaryBuildFrameBudget = 12;
  const enqueueCityBoundaryBuild = build => {
    const queued = cityBoundaryBuildQueue
      .catch(() => undefined)
      .then(async () => {
        if (!cityBoundaryBuildFrameStartedAt || performance.now() - cityBoundaryBuildFrameStartedAt > cityBoundaryBuildFrameBudget) {
          await waitForCityBuildSlot();
          cityBoundaryBuildFrameStartedAt = performance.now();
        }
        return build();
      });
    cityBoundaryBuildQueue = queued.catch(() => undefined);
    return queued;
  };

  const ensureCityBoundaryEntry = (code, data) => {
    const cached = cityBoundaryLayers.get(code);
    if (cached) return Promise.resolve(cached);
    if (cityBoundaryBuilders.has(code)) return cityBoundaryBuilders.get(code);
    const builder = enqueueCityBoundaryBuild(() => {
      const existing = cityBoundaryLayers.get(code);
      if (existing) return existing;
      const entry = createCityBoundaryLayer(code, data);
      entry.code = code;
      cityBoundaryLayers.set(code, entry);
      return entry;
    }).finally(() => cityBoundaryBuilders.delete(code));
    cityBoundaryBuilders.set(code, builder);
    return builder;
  };

  const mountCityBoundaryEntry = entry => {
    if (!entry || !travelMap) return;
    if (!entry.mounted) {
      entry.layer.addTo(travelMap);
      entry.outlineLayer?.addTo(travelMap);
      entry.labels.forEach(label => label.marker.addTo(travelMap));
      entry.mounted = true;
      entry.records.forEach(record => {
        removeBoundaryFromTabOrder(record.layer);
        const name = cityFeatureName(record.feature);
        const stateText = record.visit.direct ? "已有共同足迹" : record.visit.inherited ? "所属区域已到访" : "尚未共同抵达";
        if (record.visit.direct) {
          makeBoundaryAccessible(record.layer, name, stateText, () => {
            choosePlace(record.visit.direct.index, false);
          });
        }
      });
    }
  };

  const stageCityBoundaryEntry = entry => {
    mountCityBoundaryEntry(entry);
    entry.lastUsed = performance.now();
  };

  const cacheCityBoundaryEntry = entry => {
    if (entry) entry.lastUsed = performance.now();
  };

  const activateCityBoundaryEntry = entry => {
    if (!entry || !travelMap) return;
    mountCityBoundaryEntry(entry);
    entry.active = true;
    entry.lastUsed = performance.now();
  };

  const deactivateCityBoundaryEntry = entry => {
    if (!entry || !travelMap || (!entry.active && !entry.mounted)) return;
    if (entry.records.some(record => activeBoundaryLabel?.layer === record.layer)) closeBoundaryLabel();
    if (entry.records.some(record => selectedBoundary?.layer === record.layer)) clearBoundarySelection();
    if (travelMap.hasLayer(entry.layer)) travelMap.removeLayer(entry.layer);
    if (entry.outlineLayer && travelMap.hasLayer(entry.outlineLayer)) travelMap.removeLayer(entry.outlineLayer);
    entry.labels.forEach(label => travelMap.removeLayer(label.marker));
    entry.active = false;
    entry.mounted = false;
  };

  const destroyCityBoundaryEntry = (code, entry) => {
    if (!entry) return;
    deactivateCityBoundaryEntry(entry);
    cityBoundaryLayers.delete(code);
  };

  const refreshCityBoundaryEntries = () => {
    cityBoundaryEntries = activeCityBoundaryEntries().flatMap(entry => entry.records);
    mapRoot.dataset.cityBoundaryActiveCount = String(activeCityBoundaryEntries().length);
    mapRoot.dataset.cityBoundaryCacheCount = String(cityBoundaryLayers.size);
  };

  const pruneCityBoundaryCache = protectedCodes => {
    if (cityBoundaryLayers.size <= cityBoundaryCacheLimit) return;
    const removable = [...cityBoundaryLayers.entries()]
      .filter(([code, entry]) => !entry.active && !protectedCodes.has(code) && !cityBoundaryBuilders.has(code))
      .sort((left, right) => (left[1].lastUsed || 0) - (right[1].lastUsed || 0));
    while (cityBoundaryLayers.size > cityBoundaryCacheLimit && removable.length) {
      const [code, entry] = removable.shift();
      destroyCityBoundaryEntry(code, entry);
    }
  };

  const prefetchVisibleCityBoundaries = async () => {
    cityBoundaryPrefetchHandle = 0;
    const token = ++cityBoundaryPrefetchToken;
    try {
      if (!travelMap || mapScope !== "china" || travelMap.getZoom() < hierarchyThreshold("china") - hierarchyPrefetchLead.china) return;
      await prepareCityOverview();
      if (token === cityBoundaryPrefetchToken && mapScope === "china") {
        mapRoot.dataset.cityBoundaryPrefetch = cityOverviewLayer ? "ready" : "idle";
      }
    } finally {
      cityBoundaryPrefetchScheduled = false;
    }
  };

  const scheduleCityBoundaryPrefetch = () => {
    if (cityBoundaryPrefetchScheduled || !travelMap || mapScope !== "china") return;
    if (travelMap.getZoom() < hierarchyThreshold("china") - hierarchyPrefetchLead.china) return;
    cityBoundaryPrefetchScheduled = true;
    if ("requestIdleCallback" in window) {
      cityBoundaryPrefetchHandle = window.requestIdleCallback(prefetchVisibleCityBoundaries, { timeout: 80 });
    } else {
      cityBoundaryPrefetchHandle = setTimeout(prefetchVisibleCityBoundaries, 40);
    }
  };

  const deactivateCityBoundaryLayers = () => {
    cityBoundaryLayers.forEach(entry => deactivateCityBoundaryEntry(entry));
    refreshCityBoundaryEntries();
    cityBoundaryVisibleKey = "";
    cityBoundaryRequestedKey = "";
    renderedCityListKey = "";
  };

  const updateCityBoundaryLabelVisibility = () => {
    if (!travelMap || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "detail") return;
    const viewport = travelMap.getSize();
    const occupied = [];
    const decisions = [];
    const overview = travelMap.getZoom() < hierarchyThreshold("china") + 0.55;
    const labelBudget = overview
      ? (innerWidth <= 700 ? 10 : 22)
      : clamp(Math.round((viewport.x * viewport.y) / 16000), innerWidth <= 700 ? 14 : 26, innerWidth <= 700 ? 28 : 64);
    const collisionGap = travelMap.getZoom() >= 7.4 ? 2 : 5;
    const labels = [...cityBoundaryLayers.values()]
      .filter(entry => entry.active)
      .flatMap(entry => entry.labels)
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "zh-CN"));
    labels.forEach(label => {
      const element = label.marker.getElement();
      if (!element) return;
      if (overview && label.priority < 3) {
        decisions.push({ element, hidden: true });
        return;
      }
      const point = travelMap.latLngToContainerPoint(label.marker.getLatLng());
      const width = Math.min(94, Math.max(38, label.name.length * 11 + 10));
      const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - 10, bottom: point.y + 10 };
      const offscreen = box.right < 0 || box.left > viewport.x || box.bottom < 0 || box.top > viewport.y;
      const collision = occupied.some(other => !(box.right + collisionGap < other.left || box.left - collisionGap > other.right || box.bottom + 3 < other.top || box.top - 3 > other.bottom));
      const hidden = offscreen || collision || occupied.length >= labelBudget;
      decisions.push({ element, hidden });
      if (!hidden) occupied.push(box);
    });
    decisions.forEach(({ element, hidden }) => element.classList.toggle("hierarchy-hidden", hidden));
  };

  const renderCityBoundaryList = () => {
    if (!placeSelector) return;
    const visitedIndexes = orderedPlaceIndexes(mapPoints.reduce((indexes, point, index) => {
      if (point.scope === "china" && point.status === "visited") indexes.push(index);
      return indexes;
    }, []));
    const listKey = `visited:${visitedIndexes.join("|")}`;
    if (listKey !== renderedCityListKey) {
      renderedCityListKey = listKey;
      qa("[data-hierarchy-place]", placeSelector).forEach(button => button.remove());
      orderVisiblePlaceButtons(visitedIndexes);
      placeSelector.scrollLeft = 0;
    }
    placeSelector.setAttribute("aria-label", "选择已经到访的城市");
    updateMapHierarchyUi("city");
    mapRoot.dataset.mapMarkerCount = String(visitedIndexes.length);
    mapRoot.dataset.mapListMode = "visited-only";
    schedulePlaceScrollControls();
  };

  const createCityBoundaryLayer = (provinceCode, data) => {
    const records = [];
    const labels = [];
    const provinceVisited = chinaRegionState(provinceCode)?.status === "visited";
    const outlineLayer = data.provinceOutline ? leaflet.geoJSON(data.provinceOutline, {
      pane: "provinceOutline",
      interactive: false,
      style: provinceVisited
        ? { className: "map-province-outline-derived visited", color: "#efbd78", weight: 2.25, opacity: 0.98, fill: false, fillOpacity: 0, lineCap: "round", lineJoin: "round" }
        : { className: "map-province-outline-derived unvisited", color: "#91a4af", weight: 1.75, opacity: 0.8, fill: false, fillOpacity: 0, lineCap: "round", lineJoin: "round" }
    }) : null;
    const layer = leaflet.geoJSON(data, {
      pane: "cityBoundary",
      style: feature => {
        const visit = cityFeatureVisit(feature, provinceCode);
        return visit.visited
          ? { className: "map-city-boundary visited", color: "#efb36c", weight: 1.25, opacity: 1, fillColor: "#8f543f", fillOpacity: visit.inherited ? 0.5 : 0.76, lineCap: "round", lineJoin: "round" }
          : { className: "map-city-boundary unvisited", color: "#667b89", weight: 0.78, opacity: 0.86, fillColor: "#102532", fillOpacity: 0.72, lineCap: "round", lineJoin: "round" };
      },
      onEachFeature: (feature, featureLayer) => {
        const name = cityFeatureName(feature);
        const visit = cityFeatureVisit(feature, provinceCode);
        const stateText = visit.direct ? "已有共同足迹" : visit.inherited ? "所属区域已到访" : "尚未共同抵达";
        registerBoundaryLabel(featureLayer, {
          name,
          content: `<b>${name}</b><small>${stateText}</small>`,
          anchor: () => featureVisualCenter(feature, featureLayer),
          owner: () => layer,
          visited: visit.visited
        });
        featureLayer.on({
          mouseover: () => {
            if (selectedBoundary?.layer !== featureLayer) featureLayer.setStyle({ weight: visit.visited ? 2 : 1.35, opacity: 1, fillOpacity: visit.visited ? 0.86 : 0.8 });
          },
          mouseout: () => resetBoundaryHover(layer, featureLayer)
        });
        records.push({ feature, layer: featureLayer, provinceCode, visit });
      }
    });
    layer.eachLayer(featureLayer => {
      const feature = featureLayer.feature;
      const name = cityFeatureName(feature);
      if (!name || typeof featureLayer.getBounds !== "function") return;
      const visit = cityFeatureVisit(feature, provinceCode);
      const center = featureVisualCenter(feature, featureLayer);
      const marker = leaflet.marker(center, {
        interactive: false,
        pane: "cityLabels",
        icon: leaflet.divIcon({
          className: `map-region-name-marker city hierarchy-hidden ${visit.visited ? "visited" : "unvisited"}`,
          html: `<span>${feature.properties?.name || name}</span>`,
          iconSize: [96, 20],
          iconAnchor: [48, 10]
        })
      });
      labels.push({ marker, name, visited: visit.visited, priority: visit.direct ? 3 : visit.inherited ? 2 : 0 });
    });
    return { code: provinceCode, layer, outlineLayer, labels, records, active: false, mounted: false, lastUsed: performance.now() };
  };

  const updateCityOverviewLabelVisibility = () => {
    if (!travelMap || mapScope !== "china" || mapLevel() !== "city" || targetCityResolution !== "overview") return;
    const viewport = travelMap.getSize();
    const occupied = [];
    const compact = innerWidth <= 700;
    const zoom = travelMap.getZoom();
    const showEveryVisibleCity = zoom >= (compact ? 6.1 : 5.75);
    const budget = compact
      ? Math.min(32, Math.max(12, Math.round(12 + (zoom - 3) * 10)))
      : Math.min(64, Math.max(24, Math.round(24 + (zoom - 3) * 20)));
    const accepted = new Set();
    const ordered = [...cityOverviewLabels].sort((left, right) => (
      Number(Boolean(right.visit.direct)) - Number(Boolean(left.visit.direct))
      || left.name.localeCompare(right.name, "zh-CN")
    ));
    ordered.forEach(label => {
      const point = travelMap.latLngToContainerPoint(label.center);
      const width = Math.min(94, Math.max(38, label.name.length * 11 + 10));
      const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - 10, bottom: point.y + 10 };
      const offscreen = box.right < 0 || box.left > viewport.x || box.bottom < 0 || box.top > viewport.y;
      const collision = occupied.some(other => !(box.right + 5 < other.left || box.left - 5 > other.right || box.bottom + 3 < other.top || box.top - 3 > other.bottom));
      if (offscreen || (!showEveryVisibleCity && (collision || occupied.length >= budget))) return;
      accepted.add(label.key);
      occupied.push(box);
      if (!label.marker) {
        label.marker = leaflet.marker(label.center, {
          interactive: false,
          pane: "cityOverviewLabels",
          icon: leaflet.divIcon({
            className: `map-region-name-marker city ${label.visit.direct ? "visited" : "unvisited"}`,
            html: `<span>${label.shortName}</span>`,
            iconSize: [96, 20],
            iconAnchor: [48, 10]
          })
        });
      }
      if (!travelMap.hasLayer(label.marker)) label.marker.addTo(travelMap);
    });
    cityOverviewLabels.forEach(label => {
      if (label.marker && !accepted.has(label.key) && travelMap.hasLayer(label.marker)) {
        label.marker.removeFrom(travelMap);
      }
    });
    mapRoot.dataset.cityLabelTotalCount = String(cityOverviewLabels.length);
    mapRoot.dataset.cityLabelVisibleCount = String(accepted.size);
    mapRoot.dataset.cityLabelMode = showEveryVisibleCity ? "all-visible" : "decluttered";
  };

  const createCityOverviewLayer = data => {
    cityOverviewRenderer ||= leaflet.canvas({ pane: "cityOverview", padding: 0.28, tolerance: 3 });
    cityOverviewLabels = [];
    cityOverviewLayer = leaflet.geoJSON(data, {
      pane: "cityOverview",
      renderer: cityOverviewRenderer,
      style: feature => {
        const provinceCode = String(feature.properties?.provinceCode || "");
        const visit = cityFeatureVisit(feature, provinceCode);
        return visit.direct
          ? { color: "#efb66d", weight: 1.28, opacity: 0.98, fillColor: "#87513f", fillOpacity: 0.72, lineCap: "round", lineJoin: "round" }
          : { color: "#607684", weight: 0.58, opacity: 0.72, fillColor: "#102532", fillOpacity: 0.52, lineCap: "round", lineJoin: "round" };
      },
      onEachFeature: (feature, featureLayer) => {
        const provinceCode = String(feature.properties?.provinceCode || "");
        const visit = cityFeatureVisit(feature, provinceCode);
        const name = cityFeatureName(feature);
        const stateText = visit.direct ? "已有共同足迹" : visit.inherited ? "所属区域已到访" : "尚未共同抵达";
        registerBoundaryLabel(featureLayer, {
          name,
          content: `<b>${name}</b><small>${stateText}</small>`,
          anchor: () => featureVisualCenter(feature, featureLayer),
          owner: () => cityOverviewLayer,
          visited: visit.visited,
          onOpen: visit.direct ? () => choosePlace(visit.direct.index, false) : undefined
        });
        featureLayer.on({
          mouseover: () => {
            if (selectedBoundary?.layer !== featureLayer) featureLayer.setStyle({ weight: visit.direct ? 1.8 : 1.05, opacity: 1, fillOpacity: visit.direct ? 0.82 : 0.64 });
          },
          mouseout: () => resetBoundaryHover(cityOverviewLayer, featureLayer)
        });
      }
    }).addTo(travelMap);
    cityOverviewOutlineLayer = leaflet.geoJSON(window.__CHINA_ADMIN__, {
      pane: "cityOverview",
      renderer: cityOverviewRenderer,
      interactive: false,
      filter: feature => /^\d{6}$/.test(String(feature.properties?.adcode || "")),
      style: { className: "map-province-outline-overview", color: "#9aabb4", weight: 1.5, opacity: 0.82, fill: false, fillOpacity: 0, lineCap: "round", lineJoin: "round" }
    }).addTo(travelMap);
    data.features.forEach((feature, index) => {
      const provinceCode = String(feature.properties?.provinceCode || "");
      const visit = cityFeatureVisit(feature, provinceCode);
      const name = cityFeatureName(feature);
      const center = featureVisualCenter(feature);
      cityOverviewLabels.push({
        key: `${provinceCode}:${feature.properties?.adcode || feature.properties?.name || index}`,
        marker: null,
        center,
        name,
        shortName: feature.properties?.name || name,
        visit
      });
    });
    return cityOverviewLayer;
  };

  const prepareCityOverview = () => {
    if (cityOverviewLayer) return Promise.resolve(cityOverviewLayer);
    if (cityOverviewPromise) return cityOverviewPromise;
    mapRoot.dataset.cityOverviewState = "loading";
    cityOverviewPromise = loadMapScript("./assets/maps/china-city-overview.data.js")
      .then(() => {
        if (!window.__CHINA_CITY_OVERVIEW__) throw new Error("City overview data unavailable");
        const layer = createCityOverviewLayer(window.__CHINA_CITY_OVERVIEW__);
        mapRoot.dataset.cityOverviewState = "ready";
        return layer;
      })
      .catch(() => {
        cityOverviewPromise = null;
        mapRoot.dataset.cityOverviewState = "unavailable";
        return null;
      });
    return cityOverviewPromise;
  };

  const syncCityBoundaryLayers = async (force = false) => {
    if (!travelMap || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "detail") return;
    const codes = visibleProvinceCodesForCoverage();
    const key = codes.join(",");
    const desiredCodes = new Set(codes);
    const activeCoverage = codes.length > 0 && codes.every(code => cityBoundaryLayers.get(code)?.active);
    mapRoot.dataset.cityBoundaryRequiredCount = String(codes.length);
    if (!force && activeCoverage) {
      cityBoundaryLayers.forEach((entry, code) => {
        if (entry.active && !desiredCodes.has(code)) deactivateCityBoundaryEntry(entry);
      });
      cityBoundaryVisibleKey = key;
      refreshCityBoundaryEntries();
      pruneCityBoundaryCache(desiredCodes);
      mapRoot.dataset.cityBoundaryState = "ready";
      setBoundaryLevelPresentation("city", true);
      presentHierarchyLevel("city");
      renderCityBoundaryList();
      requestAnimationFrame(updateCityBoundaryLabelVisibility);
      return;
    }
    if (!force && key === cityBoundaryRequestedKey && mapRoot.dataset.cityBoundaryState === "loading") return;
    const retainOverview = Boolean(cityOverviewLayer) && mapRoot.dataset.cityResolution === "overview";
    const retainCityPresentation = retainOverview || (presentedHierarchyKey === "china:city" && hasActiveCityBoundaries());
    const token = ++cityBoundaryLoadToken;
    cityBoundaryRequestedKey = key;
    mapRoot.dataset.cityBoundaryState = "loading";
    setBoundaryLevelPresentation("city", retainCityPresentation, retainOverview ? "overview" : "detail");
    presentHierarchyLevel(retainCityPresentation ? "city" : "province");
    showMapPreparationNote(retainCityPresentation ? "正在更新当前视野的城市边界" : "正在准备城市边界，当前保持省份地图");
    if (retainCityPresentation) {
      mapRoot.dataset.mapTransition = "preparing";
      mapRoot.setAttribute("aria-busy", "true");
    }
    const results = await Promise.all(codes.map(async code => ({ code, data: await loadCityBoundaryData(code) })));
    if (token !== cityBoundaryLoadToken || cityBoundaryRequestedKey !== key || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "detail") return;
    const nextEntries = [];
    let frameStartedAt = performance.now();
    for (const { code, data } of results.filter(result => result.data)) {
      const entry = await ensureCityBoundaryEntry(code, data);
      if (token !== cityBoundaryLoadToken || cityBoundaryRequestedKey !== key || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "detail") return;
      if (!entry.mounted && performance.now() - frameStartedAt > 8) {
        await waitForCityBuildSlot();
        frameStartedAt = performance.now();
      }
      stageCityBoundaryEntry(entry);
      nextEntries.push(entry);
      if (performance.now() - frameStartedAt > 8) {
        await waitForCityBuildSlot();
        frameStartedAt = performance.now();
      }
    }
    if (!codes.length || nextEntries.length !== codes.length) {
      mapRoot.dataset.cityBoundaryState = "unavailable";
      setBoundaryLevelPresentation("city", retainCityPresentation, retainOverview ? "overview" : "detail");
      presentHierarchyLevel(retainCityPresentation ? "city" : "province");
      return;
    }
    if (token !== cityBoundaryLoadToken || cityBoundaryRequestedKey !== key || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "detail") return;
    nextEntries.forEach(activateCityBoundaryEntry);
    cityBoundaryLayers.forEach((entry, code) => {
      if (entry.active && !desiredCodes.has(code)) deactivateCityBoundaryEntry(entry);
    });
    cityBoundaryVisibleKey = key;
    refreshCityBoundaryEntries();
    pruneCityBoundaryCache(desiredCodes);
    const ready = codes.every(code => cityBoundaryLayers.get(code)?.active);
    mapRoot.dataset.cityBoundaryState = ready ? "ready" : "unavailable";
    if (cityBoundaryRevealFrame) cancelAnimationFrame(cityBoundaryRevealFrame);
    cityBoundaryRevealFrame = requestAnimationFrame(() => {
      cityBoundaryRevealFrame = 0;
      setBoundaryLevelPresentation("city", ready);
      if (ready) {
        presentHierarchyLevel("city");
        renderCityBoundaryList();
      } else {
        presentHierarchyLevel("province");
      }
      updateCityBoundaryLabelVisibility();
    });
  };

  const syncCityOverview = async () => {
    if (!travelMap || mapScope !== "china" || mapLevel() !== "city" || cityResolutionAtZoom() !== "overview") return;
    const requestScope = mapScope;
    mapRoot.dataset.cityBoundaryRequiredCount = "0";
    mapRoot.dataset.cityBoundaryState = cityOverviewLayer ? "ready" : "loading";
    setBoundaryLevelPresentation("city", Boolean(cityOverviewLayer), "overview");
    if (!cityOverviewLayer) {
      presentHierarchyLevel("province");
      syncMapLevelSwitchUi("province", "city");
      showMapPreparationNote("正在准备全国市界，当前保持省份地图");
    }
    const layer = cityOverviewLayer || await prepareCityOverview();
    if (!layer || requestScope !== mapScope || mapLevel() !== "city" || cityResolutionAtZoom() !== "overview") return;
    mapRoot.dataset.cityBoundaryState = "ready";
    requestAnimationFrame(() => {
      if (requestScope !== mapScope || mapLevel() !== "city" || cityResolutionAtZoom() !== "overview") return;
      setBoundaryLevelPresentation("city", true, "overview");
      presentHierarchyLevel("city");
      renderCityBoundaryList();
      updateCityOverviewLabelVisibility();
      if (hasActiveCityBoundaries()) {
        const deactivate = () => {
          if (mapScope === "china" && mapLevel() === "city" && cityResolutionAtZoom() === "detail") return;
          deactivateCityBoundaryLayers();
        };
        if (reduceMotion) deactivate();
        else setTimeout(deactivate, 170);
      }
    });
  };

  const createCityMarker = point => {
    const index = mapPoints.indexOf(point);
    let overlay = q(".map-city-overlay", q("#travelMap"));
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "map-city-overlay";
      q("#travelMap")?.append(overlay);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `memory-map-pin hierarchy-hidden ${point.status} ${point.scope}`;
    button.innerHTML = `<div><i></i><span><b>${point.name}</b><small>${point.date}</small></span></div>`;
    button.setAttribute("aria-label", `${point.name}，${point.date}`);
    overlay.append(button);
    const marker = {
      __memoryIndex: index,
      getElement: () => button,
      setOpacity: opacity => { button.style.opacity = String(opacity); }
    };
    marker.__memoryIndex = index;
    button.addEventListener("click", () => {
      travelStateTouched = true;
      choosePlace(index, false);
    });
    button.setAttribute("aria-hidden", "true");
    return marker;
  };

  const ensureCityMarkers = () => {
    if (!cityMarkers.length) cityMarkers = mapPoints.map(createCityMarker);
  };

  const positionCityMarkers = () => {
    if (!travelMap || mapPositionFrame) return;
    mapPositionFrame = requestAnimationFrame(() => {
      mapPositionFrame = 0;
      cityMarkers.forEach((marker, index) => {
        const point = mapPoints[index];
        const pixel = travelMap.latLngToContainerPoint([point.lat, point.lng]);
        const element = marker.getElement();
        element.style.left = `${pixel.x}px`;
        element.style.top = `${pixel.y}px`;
      });
    });
  };

  const setCityMarkerVisibility = visiblePoints => {
    const visible = new Set(visiblePoints);
    cityMarkers.forEach((marker, index) => {
      const show = visible.has(mapPoints[index]);
      marker.setOpacity(show ? 1 : 0);
      const element = marker.getElement();
      element?.classList.add("memory-map-pin", mapPoints[index].status, mapPoints[index].scope);
      element?.setAttribute("aria-hidden", String(!show));
      element?.classList.toggle("hierarchy-hidden", !show);
      element?.classList.toggle("labels-visible", show);
      if (element) element.style.pointerEvents = show ? "auto" : "none";
    });
    positionCityMarkers();
  };

  const renderMapHierarchy = (force = false) => {
    if (!travelMap || !leaflet || mapRoot?.dataset.mapState === "error") return;
    const level = mapLevel();
    const hierarchyKey = `${mapScope}:${level}`;
    const hierarchyChanged = hierarchyKey !== renderedHierarchyKey;
    mapRoot.dataset.mapTargetLevel = level;

    if (cityMarkers.length) setCityMarkerVisibility([]);
    if (hierarchyChanged) clearBoundarySelection();

    if (mapScope === "china" && level === "city") {
      if (cityBoundaryDeactivateTimer) {
        clearTimeout(cityBoundaryDeactivateTimer);
        cityBoundaryDeactivateTimer = 0;
      }
      if (geoLayer && !travelMap.hasLayer(geoLayer)) geoLayer.addTo(travelMap);
      const resolution = cityResolutionAtZoom();
      if (mapRoot.dataset.cityResolution !== "none" && mapRoot.dataset.cityResolution !== resolution) clearBoundarySelection();
      if (resolution === "overview") {
        cityBoundaryLoadToken += 1;
        cityBoundaryRequestedKey = "";
        syncCityOverview();
      } else {
        const codes = visibleProvinceCodesForCoverage();
        const ready = codes.length > 0 && codes.every(code => cityBoundaryLayers.get(code)?.active);
        const retainOverview = Boolean(cityOverviewLayer) && mapRoot.dataset.cityResolution === "overview";
        const retainCityPresentation = retainOverview || (presentedHierarchyKey === "china:city" && hasActiveCityBoundaries());
        mapRoot.dataset.cityBoundaryRequiredCount = String(codes.length);
        setBoundaryLevelPresentation(level, ready || retainCityPresentation, ready ? "detail" : retainOverview ? "overview" : "detail");
        if (ready) {
          presentHierarchyLevel("city");
          renderCityBoundaryList();
          requestAnimationFrame(updateCityBoundaryLabelVisibility);
        } else if (retainCityPresentation) {
          presentHierarchyLevel("city");
          mapRoot.dataset.mapTransition = "preparing";
          mapRoot.setAttribute("aria-busy", "true");
          showMapPreparationNote("正在细化当前视野的城市边界");
        } else {
          presentHierarchyLevel("province");
          syncMapLevelSwitchUi("province", "city");
        }
        syncCityBoundaryLayers(force);
      }
    } else {
      cityBoundaryLoadToken += 1;
      cityBoundaryRequestedKey = "";
      if (geoLayer && !travelMap.hasLayer(geoLayer)) geoLayer.addTo(travelMap);
      mapRoot.dataset.cityBoundaryRequiredCount = "0";
      mapRoot.dataset.cityBoundaryState = "idle";
      if (cityBoundaryDeactivateTimer) clearTimeout(cityBoundaryDeactivateTimer);
      const deactivate = () => {
        cityBoundaryDeactivateTimer = 0;
        if (mapScope === "china" && mapLevel() === "city") return;
        deactivateCityBoundaryLayers();
        if (mapScope === "china") scheduleCityBoundaryPrefetch();
      };
      if (hasActiveCityBoundaries() && !reduceMotion) cityBoundaryDeactivateTimer = setTimeout(deactivate, 280);
      else deactivate();
      if (mapScope === "world" && level === "province" && !detailGeoLayer) prepareWorldProvinceDetail();
      if (mapScope === "world" && level === "country") scheduleWorldProvinceDetailPrefetch();
      setBoundaryLevelPresentation(level, false);
      const presentedLevel = mapScope === "world" && level === "province" && !detailGeoLayer ? "country" : level;
      presentHierarchyLevel(presentedLevel, { refreshList: force || hierarchyChanged });
      if (presentedLevel !== level) {
        mapRoot.dataset.mapTargetLevel = level;
        mapRoot.dataset.mapTransition = "preparing";
        mapRoot.setAttribute("aria-busy", "true");
        syncMapLevelSwitchUi(presentedLevel, level);
        showMapPreparationNote("正在准备省州边界，当前保持国家地图");
      }
    }

    renderedHierarchyKey = hierarchyKey;
    const presentedLevel = presentedHierarchyKey.startsWith(`${mapScope}:`)
      ? presentedHierarchyKey.split(":")[1]
      : level;
    const visibleRegionLabels = [];
    regionLabelMarkers.forEach(marker => {
      const show = marker.__regionLabel?.level === presentedLevel;
      if (show && !travelMap.hasLayer(marker)) marker.addTo(travelMap);
      else if (!show && travelMap.hasLayer(marker)) travelMap.removeLayer(marker);
      const element = marker.getElement();
      element?.classList.toggle("hierarchy-hidden", !show);
      if (show && element) visibleRegionLabels.push(marker);
    });
    if (mapScope === "world" && (presentedLevel === "country" || presentedLevel === "province")) {
      const occupied = [];
      const viewport = travelMap.getSize();
      const labelBudget = clamp(Math.round((viewport.x * viewport.y) / (presentedLevel === "country" ? 19000 : 14000)), presentedLevel === "country" ? 26 : 34, presentedLevel === "country" ? 58 : 84);
      visibleRegionLabels
        .sort((left, right) => Number(right.__regionLabel?.visited) - Number(left.__regionLabel?.visited))
        .forEach(marker => {
          const element = marker.getElement();
          const point = travelMap.latLngToContainerPoint(marker.getLatLng());
          const name = marker.__regionLabel?.name || "";
          const width = Math.min(92, Math.max(28, name.length * 10 + 8));
          const box = { left: point.x - width / 2, right: point.x + width / 2, top: point.y - 9, bottom: point.y + 9 };
          const offscreen = box.right < 0 || box.left > viewport.x || box.bottom < 0 || box.top > viewport.y;
          const collision = occupied.some(other => !(box.right + 3 < other.left || box.left - 3 > other.right || box.bottom + 2 < other.top || box.top - 2 > other.bottom));
          const hidden = offscreen || collision || occupied.length >= labelBudget;
          element?.classList.toggle("hierarchy-hidden", hidden);
          if (!hidden) occupied.push(box);
        });
    }
    cityMarkers.forEach(marker => {
      const active = marker.__memoryIndex === selectedPlace;
      marker.getElement()?.classList.toggle("selected", active);
    });
  };

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
    qa('[data-hierarchy-place="city"]', placeSelector || document).forEach(button => {
      const active = Number(button.dataset.placeIndex) === index;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    let activeStory;
    qa("[data-place-story]").forEach((story, storyIndex) => {
      const active = storyIndex === index;
      story.classList.toggle("active", active);
      story.setAttribute("aria-hidden", String(!active));
      if (active) activeStory = story;
    });
    cityMarkers.forEach(marker => {
      const active = marker.__memoryIndex === index;
      marker.getElement()?.classList.toggle("selected", active);
    });
    const place = mapPoints[index];
    const journeyIndex = q("[data-journey-index]");
    const journeyState = q("[data-journey-state]");
    const scopedIndexes = availablePlaceIndexes(mapScope);
    const scopedPosition = Math.max(0, scopedIndexes.indexOf(index));
    if (journeyIndex) journeyIndex.textContent = `${String(scopedPosition + 1).padStart(2, "0")} / ${String(scopedIndexes.length).padStart(2, "0")}`;
    if (journeyState && place) journeyState.textContent = `${place.name} · 已抵达`;
    syncJourneyAccessibility(place);
    centerSelectedPlace(activeButton);
    schedulePlaceScrollControls();
    if (focusMap && activeStory && !reduceMotion) {
      [...activeStory.children].forEach((node, order) => node.animate([
        { opacity: .28, transform: "translateX(16px)" },
        { opacity: 1, transform: "translateX(0)" }
      ], {
        duration: 360 + order * 45,
        delay: order * 38,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both"
      }));
    }
    if (focusMap && travelMap && mapScope === "china" && mapLevel() === "city" && place) {
      const boundaryRecord = cityBoundaryEntries.find(record => record.visit.direct?.index === index);
      if (boundaryRecord) selectBoundary(boundaryRecord.layer, cityBoundaryLayers.get(boundaryRecord.provinceCode)?.layer, true, cityFeatureName(boundaryRecord.feature));
      const zoom = Math.max(travelMap.getZoom(), hierarchyThreshold("china") + 0.35);
      focusMapAt(place.lat, place.lng, zoom);
    }
    syncTravelUrl();
  };

  const addRegionLabelMarker = (latLng, name, level, state, extraClass = "") => {
    const marker = leaflet.marker(latLng, {
      interactive: false,
      pane: level === "province" && mapScope === "world" ? "provinceDetail" : "primaryLabels",
      icon: leaflet.divIcon({
        className: `map-region-name-marker ${level} ${state?.status === "visited" ? "visited" : "unvisited"} ${extraClass}`.trim(),
        html: `<span>${name}</span>`,
        iconSize: [96, 20],
        iconAnchor: [48, 10]
      })
    });
    const initialLevel = presentedHierarchyKey.startsWith(`${mapScope}:`)
      ? presentedMapLevel()
      : hierarchyLevels[mapScope].base;
    marker.__regionLabel = { name, level, visited: state?.status === "visited", extraClass };
    if (level === initialLevel) marker.addTo(travelMap);
    regionLabelMarkers.push(marker);
    return marker;
  };

  const createWorldProvinceDetail = () => {
    const internationalData = window.__WORLD_ADMIN1__;
    if (!internationalData || mapScope !== "world" || detailGeoLayer) return detailGeoLayer;
    const detailData = {
      ...internationalData,
      features: internationalData.features.filter(feature => feature?.properties?.countryCode !== "CHN")
    };
    detailGeoLayer = leaflet.geoJSON(detailData, {
      pane: "provinceDetail",
      style: feature => {
        const state = worldProvinceVisit(feature);
        return state?.status === "visited"
          ? { className: "map-province-detail visited", color: "#dda45e", weight: 1.05, opacity: .84, fillColor: "#8a543f", fillOpacity: .68 }
          : { className: "map-province-detail unvisited", color: "#60737f", weight: .72, opacity: .7, fillColor: "#122632", fillOpacity: .72 };
      },
      onEachFeature: (feature, layer) => {
        const name = feature?.properties?.name || "";
        const state = worldProvinceVisit(feature);
        registerBoundaryLabel(layer, {
          name,
          content: `<b>${name}</b><small>${state?.status === "visited" ? "已有共同足迹" : "尚未共同抵达"}</small>`,
          anchor: () => featureVisualCenter(feature, layer),
          owner: () => detailGeoLayer,
          visited: state?.status === "visited"
        });
        layer.on({
          mouseover: () => {
            if (selectedBoundary?.layer !== layer) layer.setStyle({ weight: state?.status === "visited" ? 1.85 : 1.2, opacity: 1, fillOpacity: state?.status === "visited" ? .82 : .8 });
          },
          mouseout: () => resetBoundaryHover(detailGeoLayer, layer)
        });
      }
    }).addTo(travelMap);
    detailGeoLayer.eachLayer(layer => {
      if (typeof layer.getBounds !== "function") return;
      const name = layer.feature?.properties?.name || "";
      if (!name) return;
      const state = worldProvinceVisit(layer.feature);
      removeBoundaryFromTabOrder(layer);
        if (state.status === "visited") {
          makeBoundaryAccessible(layer, name, "已有共同足迹", () => {
          syncHierarchyBoundary(state.hierarchyKey || state.label);
          });
      }
      const centroid = layer.feature?.properties?.centroid;
      const center = Array.isArray(centroid) && centroid.every(Number.isFinite)
        ? [centroid[1], centroid[0]]
        : featureVisualCenter(layer.feature, layer);
      addRegionLabelMarker(center, compactProvinceLabel(name), "province", state, "world-province");
    });
    mapRoot.dataset.worldProvinceState = "ready";
    return detailGeoLayer;
  };

  const prepareWorldProvinceDetail = async () => {
    if (detailGeoLayer || mapScope !== "world") return detailGeoLayer;
    if (!worldProvinceDataPromise) {
      worldProvinceDataPromise = loadMapScript("./assets/maps/world-admin1.data.js")
        .then(() => window.__WORLD_ADMIN1__ || null)
        .catch(() => {
          worldProvinceDataPromise = null;
          return null;
        });
    }
    mapRoot.dataset.worldProvinceState = "loading";
    const data = await worldProvinceDataPromise;
    if (!data || mapScope !== "world") {
      if (mapScope === "world") mapRoot.dataset.worldProvinceState = "unavailable";
      return null;
    }
    const layer = createWorldProvinceDetail();
    if (layer && mapScope === "world" && mapLevel() === "province") renderMapHierarchy(true);
    return layer;
  };

  const scheduleWorldProvinceDetailPrefetch = () => {
    if (worldProvincePrefetchScheduled || detailGeoLayer || !travelMap || mapScope !== "world") return;
    if (travelMap.getZoom() < hierarchyThreshold("world") - hierarchyPrefetchLead.world) return;
    worldProvincePrefetchScheduled = true;
    const run = () => {
      worldProvincePrefetchHandle = 0;
      worldProvincePrefetchScheduled = false;
      if (!travelMap || mapScope !== "world" || detailGeoLayer) return;
      prepareWorldProvinceDetail();
    };
    if ("requestIdleCallback" in window) worldProvincePrefetchHandle = window.requestIdleCallback(run, { timeout: 650 });
    else worldProvincePrefetchHandle = setTimeout(run, 100);
  };

  const resetTravelMapViewport = (animate = false, recordBase = false) => {
    if (!travelMap || !leaflet) return;
    if (mapHierarchyIdleTimer) clearTimeout(mapHierarchyIdleTimer);
    mapHierarchyIdleTimer = 0;
    mapWheelGestureActive = false;
    mapWheelInputIdle = false;
    mapZoomAnimationActive = false;
    const compactMap = innerWidth <= 700;
    const resetScope = mapScope;
    const animated = animate && !reduceMotion;
    const maxBounds = mapScope === "world"
      ? leaflet.latLngBounds([[-85, -220], [85, 220]])
      : leaflet.latLngBounds([[5, 60], [60, 145]]);
    const recordResetZoom = () => {
      if (!travelMap || mapScope !== resetScope) return;
      scopeBaseZoom[resetScope] = travelMap.getZoom();
      travelMap.setMinZoom(Math.max(0.75, scopeBaseZoom[resetScope] - 0.5));
      updateZoomControls();
    };
    stopTravelMapMotion();
    travelMap.setMaxBounds(null);
    travelMap.setMinZoom(0.75);
    const bounds = mapScope === "world"
      ? leaflet.latLngBounds([[-55, -170], [78, 180]])
      : leaflet.latLngBounds([[18, 73], [54, 135]]);
    const shouldRecordBase = recordBase || animate;
    if (shouldRecordBase && animated) travelMap.once("moveend", recordResetZoom);
    travelMap.fitBounds(bounds, {
      padding: mapScope === "world"
        ? compactMap ? [12, 12] : [26, 26]
        : compactMap ? [18, 18] : [30, 30],
      maxZoom: mapScope === "world"
        ? compactMap ? 2.45 : 2.9
        : compactMap ? 3.8 : 4.25,
      animate: animated,
      duration: 0.42,
      easeLinearity: 0.24
    });
    if (animated) travelMap.once("moveend", () => {
      if (travelMap && mapScope === resetScope) travelMap.setMaxBounds(maxBounds);
    });
    else travelMap.setMaxBounds(maxBounds);
    if (shouldRecordBase) {
      if (!animated) recordResetZoom();
    } else {
      travelMap.setMinZoom(Math.max(0.75, scopeBaseZoom[mapScope] - 0.5));
      updateZoomControls();
    }
  };

  const restoreTravelMapViewport = camera => {
    if (!travelMap || !leaflet || !camera) return false;
    const maxBounds = mapScope === "world"
      ? leaflet.latLngBounds([[-85, -220], [85, 220]])
      : leaflet.latLngBounds([[5, 60], [60, 145]]);
    stopTravelMapMotion();
    travelMap.setMaxBounds(null);
    // Keep the old scope's camera legal while moving. Raising minZoom before
    // the hard reset makes Leaflet queue a corrective zoom that can overwrite
    // the restored camera on the following frame.
    travelMap.setMinZoom(0.75);
    hardSetTravelMapView(camera.center, camera.zoom);
    travelMap.setMinZoom(Math.max(0.75, scopeBaseZoom[mapScope] - 0.5));
    travelMap.setMaxBounds(maxBounds);
    updateZoomControls();
    return true;
  };

  const renderTravelMap = () => {
    selectedPlace = resolvePlaceIndex(mapScope, selectedPlace);
    renderedHierarchyKey = "";
    presentedHierarchyKey = "";
    activeHierarchyKey = "";
    if (mapRoot) {
      mapRoot.dataset.scope = mapScope;
      mapRoot.dataset.mapState = "loading";
    }
    if (!travelMap || !leaflet) {
      choosePlace(selectedPlace, false);
      return;
    }
    if (mapHierarchyIdleTimer) clearTimeout(mapHierarchyIdleTimer);
    mapHierarchyIdleTimer = 0;
    if (mapHierarchyFrame) cancelAnimationFrame(mapHierarchyFrame);
    mapHierarchyFrame = 0;
    mapWheelGestureActive = false;
    mapWheelInputIdle = false;
    mapZoomAnimationActive = false;
    stopTravelMapMotion();
    cityBoundaryLoadToken += 1;
    cityBoundaryPrefetchToken += 1;
    cityBoundaryRequestedKey = "";
    if (cityBoundaryPrefetchHandle) {
      window.cancelIdleCallback?.(cityBoundaryPrefetchHandle);
      clearTimeout(cityBoundaryPrefetchHandle);
      cityBoundaryPrefetchHandle = 0;
    }
    cityBoundaryPrefetchScheduled = false;
    if (worldProvincePrefetchHandle) {
      window.cancelIdleCallback?.(worldProvincePrefetchHandle);
      clearTimeout(worldProvincePrefetchHandle);
      worldProvincePrefetchHandle = 0;
    }
    worldProvincePrefetchScheduled = false;
    if (cityBoundaryDeactivateTimer) {
      clearTimeout(cityBoundaryDeactivateTimer);
      cityBoundaryDeactivateTimer = 0;
    }
    closeBoundaryLabel();
    clearBoundarySelection();
    deactivateCityBoundaryLayers();
    if (geoLayer) travelMap.removeLayer(geoLayer);
    regionLabelMarkers.forEach(marker => travelMap.removeLayer(marker));
    regionLabelMarkers = [];
    if (detailGeoLayer) {
      travelMap.removeLayer(detailGeoLayer);
      detailGeoLayer = null;
    }
    const data = mapScope === "world" ? window.__WORLD_COUNTRIES__ : window.__CHINA_ADMIN__;
    if (!data) {
      qa("[data-hierarchy-place]", placeSelector || document).forEach(button => button.remove());
      renderedCityListKey = "";
      syncTravelScopeUi();
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
      pane: "primaryBoundary",
      style: feature => primaryBoundaryStyle(feature),
      onEachFeature: (feature, layer) => {
        const key = regionKey(feature);
        const name = regionName(feature);
        const state = regionState(key);
        registerBoundaryLabel(layer, {
          name,
          content: `<b>${name}</b><small>${state?.status === "visited" ? "已有共同足迹" : "尚未共同抵达"}</small>`,
          anchor: () => featureVisualCenter(feature, layer),
          owner: () => geoLayer,
          visited: state?.status === "visited"
        });
        layer.on({
          mouseover: () => {
            if (selectedBoundary?.layer !== layer) layer.setStyle({ weight: state?.status === "visited" ? 2 : 1.35, opacity: 1, fillOpacity: state?.status === "visited" ? 0.92 : 0.84 });
          },
          mouseout: () => resetBoundaryHover(geoLayer, layer)
        });
      }
    }).addTo(travelMap);
    geoLayer.eachLayer(layer => {
      const name = regionName(layer.feature);
      if (!name || typeof layer.getBounds !== "function") return;
      const state = regionState(regionKey(layer.feature));
      removeBoundaryFromTabOrder(layer);
      if (state?.status === "visited") {
        makeBoundaryAccessible(layer, name, "已有共同足迹", () => {
          syncHierarchyBoundary(state?.label || name);
        });
      }
      addRegionLabelMarker(featureVisualCenter(layer.feature, layer), mapScope === "world" ? (state?.label || name) : compactProvinceLabel(name), mapScope === "world" ? "country" : "province", state);
    });
    const restoredCamera = scopeCameraState[mapScope];
    if (!restoreTravelMapViewport(restoredCamera)) resetTravelMapViewport(false, true);
    const label = q("[data-map-label]");
    if (label) label.textContent = mapScope === "world" ? "世界 · 共同坐标" : "中国 · 省份足迹";
    mapRoot.dataset.mapReady = "true";
    mapRoot.dataset.mapState = "ready";
    q("[data-map-loading]").hidden = true;
    renderMapHierarchy(true);
    choosePlace(selectedPlace, false);
  };

  const failTravelMap = () => {
    if (!mapRoot) return;
    qa("[data-hierarchy-place]", placeSelector || document).forEach(button => button.remove());
    renderedCityListKey = "";
    syncTravelScopeUi();
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
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      scrollWheelZoom: true,
      minZoom: 0.75,
      maxZoom: 9,
      // The camera stays continuous; only the data hierarchy switches at a
      // threshold. A zero snap lets mouse wheels and trackpads keep their
      // native fractional input instead of rounding to fixed zoom steps.
      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelDebounceTime: 12,
      wheelPxPerZoomLevel: wheelPxPerZoomLevel[mapScope],
      worldCopyJump: false,
      zoomAnimation: !reduceMotion,
      fadeAnimation: false,
      markerZoomAnimation: !reduceMotion
    });
    const paneTransition = reduceMotion ? "none" : "opacity 150ms cubic-bezier(0.16, 1, 0.3, 1)";
    const primaryPane = travelMap.createPane("primaryBoundary");
    primaryPane.style.zIndex = "400";
    primaryPane.style.opacity = "1";
    primaryPane.style.transition = paneTransition;
    const primaryLabelPane = travelMap.createPane("primaryLabels");
    primaryLabelPane.style.zIndex = "405";
    primaryLabelPane.style.opacity = "1";
    primaryLabelPane.style.pointerEvents = "none";
    primaryLabelPane.style.transition = paneTransition;
    const provincePane = travelMap.createPane("provinceDetail");
    provincePane.style.zIndex = "410";
    provincePane.style.opacity = "0";
    provincePane.style.pointerEvents = "none";
    provincePane.style.transition = paneTransition;
    const cityBoundaryPane = travelMap.createPane("cityBoundary");
    cityBoundaryPane.style.zIndex = "420";
    cityBoundaryPane.style.opacity = "0";
    cityBoundaryPane.style.pointerEvents = "none";
    cityBoundaryPane.style.transition = paneTransition;
    const cityOverviewPane = travelMap.createPane("cityOverview");
    cityOverviewPane.style.zIndex = "418";
    cityOverviewPane.style.opacity = "0";
    cityOverviewPane.style.pointerEvents = "none";
    cityOverviewPane.style.transition = paneTransition;
    const provinceOutlinePane = travelMap.createPane("provinceOutline");
    provinceOutlinePane.style.zIndex = "425";
    provinceOutlinePane.style.opacity = "0";
    provinceOutlinePane.style.pointerEvents = "none";
    provinceOutlinePane.style.transition = paneTransition;
    const cityOverviewOutlinePane = travelMap.createPane("cityOverviewOutline");
    cityOverviewOutlinePane.style.zIndex = "425";
    cityOverviewOutlinePane.style.opacity = "0";
    cityOverviewOutlinePane.style.pointerEvents = "none";
    cityOverviewOutlinePane.style.transition = paneTransition;
    const cityLabelPane = travelMap.createPane("cityLabels");
    cityLabelPane.style.zIndex = "430";
    cityLabelPane.style.opacity = "0";
    cityLabelPane.style.pointerEvents = "none";
    cityLabelPane.style.transition = paneTransition;
    const cityOverviewLabelPane = travelMap.createPane("cityOverviewLabels");
    cityOverviewLabelPane.style.zIndex = "430";
    cityOverviewLabelPane.style.opacity = "0";
    cityOverviewLabelPane.style.pointerEvents = "none";
    cityOverviewLabelPane.style.transition = paneTransition;
    travelMap.on("click", event => {
      if (boundaryLabelClickInProgress || event.originalEvent?.__mapBoundaryLabelHandled) return;
      closeBoundaryLabel();
      clearBoundarySelection();
    });
    mapRoot.dataset.mapAssets = "ready";
    renderTravelMap();
    travelMap.on("move zoom", positionCityMarkers);
    const cancelMapHierarchyPreview = () => {
      if (mapHierarchyPreviewFrame) cancelAnimationFrame(mapHierarchyPreviewFrame);
      mapHierarchyPreviewFrame = 0;
      previewHierarchy = null;
    };
    const scheduleMapHierarchyPreview = () => {
      if (mapHierarchyPreviewFrame) return;
      const scopeAtSchedule = mapScope;
      mapHierarchyPreviewFrame = requestAnimationFrame(() => {
        mapHierarchyPreviewFrame = 0;
        if (!travelMap || mapRoot.dataset.mapState !== "ready" || mapScope !== scopeAtSchedule) return;
        const nextLevel = mapLevel();
        if (`${mapScope}:${nextLevel}` === renderedHierarchyKey) return;
        // Cross the semantic boundary while the camera is still moving. The
        // final zoomend commit remains the source of truth, but the layer
        // preparation and crossfade no longer wait behind the zoom animation.
        renderMapHierarchy();
      });
    };
    const scheduleMapHierarchyCommit = () => {
      if (mapHierarchyFrame) return;
      mapHierarchyFrame = requestAnimationFrame(() => {
        mapHierarchyFrame = 0;
        if (mapRoot.dataset.mapState === "error") return;
        mapRoot.dataset.mapInteraction = "idle";
        mapRoot.dataset.mapHierarchyCommitCount = String(Number(mapRoot.dataset.mapHierarchyCommitCount || 0) + 1);
        renderMapHierarchy();
        positionCityMarkers();
        updateZoomControls();
      });
    };
    const commitWheelHierarchyIfReady = () => {
      if (!mapWheelGestureActive || !mapWheelInputIdle || mapZoomAnimationActive) return;
      mapWheelGestureActive = false;
      mapWheelInputIdle = false;
      scheduleMapHierarchyCommit();
    };
    const scheduleMapHierarchyIdleCommit = () => {
      if (mapHierarchyIdleTimer) clearTimeout(mapHierarchyIdleTimer);
      mapWheelInputIdle = false;
      mapHierarchyIdleTimer = setTimeout(() => {
        mapHierarchyIdleTimer = 0;
        mapWheelInputIdle = true;
        commitWheelHierarchyIfReady();
      }, 72);
    };
    travelMap.getContainer().addEventListener("wheel", () => {
      cancelMapHierarchyPreview();
      mapWheelGestureActive = true;
      if (mapHierarchyFrame) cancelAnimationFrame(mapHierarchyFrame);
      mapHierarchyFrame = 0;
      mapRoot.dataset.mapInteraction = "zooming";
      scheduleMapHierarchyIdleCommit();
    }, { passive: true });
    travelMap.on("zoom", () => {
      updateZoomControls();
      if (mapScope === "china") scheduleCityBoundaryPrefetch();
      else scheduleWorldProvinceDetailPrefetch();
    });
    travelMap.on("zoomanim", event => {
      // An explicit level choice is sticky. Camera movement must never
      // silently replace a user-selected province/city layer.
      if (manualHierarchyLevel[mapScope]) return;
      const level = hierarchyLevelAtZoom(mapScope, event.zoom);
      if (`${mapScope}:${level}` === renderedHierarchyKey) return;
      previewHierarchy = { scope: mapScope, level };
      scheduleMapHierarchyPreview();
    });
    travelMap.on("zoomstart", () => {
      mapZoomAnimationActive = true;
      mapRoot.dataset.mapInteraction = "zooming";
      if (mapScope === "china" && mapLevel() === "city") mapRoot.dataset.cityBoundaryState = "settling";
    });
    travelMap.on("movestart", () => {
      if (mapRoot.dataset.mapInteraction !== "zooming") mapRoot.dataset.mapInteraction = "dragging";
      if (mapScope === "china" && mapLevel() === "city") mapRoot.dataset.cityBoundaryState = "settling";
    });
    travelMap.on("zoomend", () => {
      cancelMapHierarchyPreview();
      mapZoomAnimationActive = false;
      if (mapWheelGestureActive) commitWheelHierarchyIfReady();
      else scheduleMapHierarchyCommit();
    });
    travelMap.on("moveend", () => {
      if (mapWheelGestureActive) commitWheelHierarchyIfReady();
      else scheduleMapHierarchyCommit();
    });
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
  const applyTravelScope = nextScope => {
    pendingMapScope = "";
    manualHierarchyLevel[nextScope] = "";
    if (nextScope === mapScope) {
      syncTravelScopeUi();
      return;
    }
    stopTravelMapMotion();
    if (travelMap) {
      const center = travelMap.getCenter();
      scopeCameraState[mapScope] = { center: [center.lat, center.lng], zoom: travelMap.getZoom() };
    }
    mapScope = nextScope;
    if (travelMap) travelMap.options.wheelPxPerZoomLevel = wheelPxPerZoomLevel[mapScope];
    syncTravelScopeUi();
    selectedPlace = resolvePlaceIndex(mapScope, lastSelectedPlace[mapScope]);
    renderTravelMap();
    syncTravelUrl();
    requestAnimationFrame(schedulePlaceScrollControls);
  };

  const requestMapHierarchyLevel = level => {
    if (!travelMap || mapRoot?.dataset.mapState === "error") return;
    const config = hierarchyLevels[mapScope];
    if (![config.base, config.detail].includes(level)) return;
    const presentedLevel = presentedMapLevel();
    if (level === presentedLevel && level === manualHierarchyLevel[mapScope]) return;
    travelStateTouched = true;
    stopTravelMapMotion();
    if (mapHierarchyIdleTimer) clearTimeout(mapHierarchyIdleTimer);
    mapHierarchyIdleTimer = 0;
    if (mapHierarchyFrame) cancelAnimationFrame(mapHierarchyFrame);
    mapHierarchyFrame = 0;
    mapWheelGestureActive = false;
    mapWheelInputIdle = false;
    manualHierarchyLevel[mapScope] = level;
    targetHierarchyLevel[mapScope] = level;
    closeBoundaryLabel();
    clearBoundarySelection();
    syncMapLevelSwitchUi(presentedLevel, level);
    mapRoot.dataset.mapTargetLevel = level;
    mapRoot.dataset.mapLevelMode = "manual";
    mapRoot.dataset.mapTransition = "preparing";
    mapRoot.setAttribute("aria-busy", "true");
    showMapPreparationNote(level === config.detail
      ? `正在切换到${mapScope === "world" ? "省州" : "市级"}边界`
      : `正在返回${mapScope === "world" ? "国家" : "省份"}总览`);

    // Manual granularity is independent from camera scale. Keep the exact
    // center and zoom, and only prepare/swap the semantic boundary layer.
    renderMapHierarchy(true);
  };

  levelButtons.forEach(button => {
    button.addEventListener("click", () => requestMapHierarchyLevel(button.dataset.mapLevelOption || ""));
  });

  scopeButtons.forEach(button => button.addEventListener("click", () => {
    const nextScope = button.dataset.scope;
    if (nextScope !== "world" && nextScope !== "china") return;
    if (nextScope === mapScope && !pendingMapScope) return;
    travelStateTouched = true;
    pendingMapScope = nextScope;
    stopTravelMapMotion();
    if (mapScopeSwitchFrame) cancelAnimationFrame(mapScopeSwitchFrame);
    // Let Leaflet start any zoom already queued for this frame, then cancel it
    // before swapping scope. This removes the delayed camera snap seen after a
    // rapid place-focus -> scope-switch sequence.
    mapScopeSwitchFrame = requestAnimationFrame(() => {
      mapScopeSwitchFrame = 0;
      const requestedScope = pendingMapScope;
      stopTravelMapMotion();
      if (requestedScope) applyTravelScope(requestedScope);
    });
  }));
  q("[data-map-zoom=in]")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    travelMap?.stop();
    travelMap?.zoomIn(travelMap.options.zoomDelta, { animate: !reduceMotion });
  });
  q("[data-map-zoom=out]")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    travelMap?.stop();
    travelMap?.zoomOut(travelMap.options.zoomDelta, { animate: !reduceMotion });
  });
  q("[data-map-reset]")?.addEventListener("click", () => {
    travelStateTouched = true;
    if (mapScopeSwitchFrame) cancelAnimationFrame(mapScopeSwitchFrame);
    mapScopeSwitchFrame = 0;
    pendingMapScope = "";
    manualHierarchyLevel[mapScope] = "";
    mapRoot.dataset.mapLevelMode = "auto";
    scopeCameraState[mapScope] = null;
    targetHierarchyLevel[mapScope] = hierarchyLevels[mapScope].base;
    cityBoundaryLoadToken += 1;
    cityBoundaryRequestedKey = "";
    closeBoundaryLabel();
    clearBoundarySelection();
    resetTravelMapViewport(true, false);
  });
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

  const gravityHero = q("[data-gravity-hero]");
  const gravityCanvas = q("[data-gravity-canvas]", gravityHero || document);
  if (gravityHero && gravityCanvas) {
    const gravityContext = gravityCanvas.getContext("2d", { alpha: true });
    const gravityStage = q("[data-gravity-stage]", gravityHero) || gravityHero;
    const gravityDepthLayers = qa(".gravity-depth-layer", gravityHero);
    const gravityCursor = q("[data-gravity-cursor]", gravityHero);
    let gravityWidth = 0;
    let gravityHeight = 0;
    let gravityRatio = 1;
    let gravityFrame = 0;
    let gravityVisible = true;
    let gravityTargetX = .58;
    let gravityTargetY = .46;
    let gravityX = gravityTargetX;
    let gravityY = gravityTargetY;
    let gravityTime = 0;
    let gravityVelocity = 0;
    let gravityImpact = 0;
    let gravityLastPointerTime = 0;
    let gravityLastPointerX = gravityTargetX;
    let gravityLastPointerY = gravityTargetY;
    let gravityCollapse = 0;
    let gravityCursorClientX = 0;
    let gravityCursorClientY = 0;
    let gravityCursorAngle = 0;
    const gravityNodes = Array.from({ length: 28 }, (_, index) => {
      const angle = index * 2.3999632297 + .4;
      const radius = .19 + ((index * 37) % 67) / 100;
      return {
        x: .5 + Math.cos(angle) * radius * .68,
        y: .47 + Math.sin(angle) * radius * .52,
        phase: index * .71,
        size: index % 7 === 0 ? 1.45 : .7
      };
    });
    const desktopSubjects = [[.68,.22],[.81,.25],[.60,.73],[.74,.77],[.92,.74]];
    const mobileSubjects = [[.48,.28],[.67,.31],[.35,.7],[.57,.74],[.83,.7]];

    const resizeGravity = () => {
      const bounds = gravityStage.getBoundingClientRect();
      gravityWidth = Math.max(1, bounds.width);
      gravityHeight = Math.max(1, bounds.height);
      gravityRatio = Math.min(devicePixelRatio || 1, 1.6);
      gravityCanvas.width = Math.round(gravityWidth * gravityRatio);
      gravityCanvas.height = Math.round(gravityHeight * gravityRatio);
      gravityCanvas.style.width = `${gravityWidth}px`;
      gravityCanvas.style.height = `${gravityHeight}px`;
      gravityContext?.setTransform(gravityRatio, 0, 0, gravityRatio, 0, 0);
    };

    const syncGravityScroll = () => {
      const bounds = gravityHero.getBoundingClientRect();
      const stageBounds = gravityStage.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - stageBounds.height);
      const progress = clamp(-bounds.top / travel, 0, 1);
      gravityHero.style.setProperty("--gravity-scale", String(1.025 + progress * .035));
      gravityHero.style.setProperty("--gravity-fade", String(1 - progress * .5));
      gravityCollapse = Math.pow(progress, 1.2);
      gravityHero.style.setProperty("--gravity-title-left", "0px");
      gravityHero.style.setProperty("--gravity-title-right", "0px");
      gravityHero.style.setProperty("--gravity-title-opacity", String(1 - gravityCollapse * .72));
    };

    const drawGravity = now => {
      gravityFrame = 0;
      if (!gravityVisible || !gravityContext) return;
      gravityTime = now * .00032;
      if (coarsePointer && !reduceMotion) {
        gravityTargetX = .5 + Math.sin(gravityTime * .72) * .1;
        gravityTargetY = .45 + Math.cos(gravityTime * .58) * .065;
        gravityVelocity = Math.max(gravityVelocity, .075);
      }
      gravityX += (gravityTargetX - gravityX) * (reduceMotion ? 1 : .055);
      gravityY += (gravityTargetY - gravityY) * (reduceMotion ? 1 : .055);

      gravityHero.style.setProperty("--gravity-x", `${gravityX * 100}%`);
      gravityHero.style.setProperty("--gravity-y", `${gravityY * 100}%`);
      gravityHero.style.setProperty("--gravity-shift-x", `${(gravityX - .5) * -13}px`);
      gravityHero.style.setProperty("--gravity-shift-y", `${(gravityY - .5) * -9}px`);

      const pointerX = gravityX - .5;
      const pointerY = gravityY - .46;
      const layerEnergy = 1 - gravityCollapse;
      const depthMotion = [
        [-pointerX * 23 - gravityImpact * 13, -pointerY * 12 + Math.sin(gravityTime * 3.1) * 1.35, 1.012 + gravityImpact * .006],
        [pointerX * 25 + gravityImpact * 14, -pointerY * 10 - Math.sin(gravityTime * 2.8) * 1.15, 1.013 + gravityImpact * .007],
        [-pointerX * 38 - gravityImpact * 21, -pointerY * 17 + Math.sin(gravityTime * 4.2) * 2.1, 1.016 + gravityImpact * .01],
        [pointerX * 9, -pointerY * 21 + Math.sin(gravityTime * 3.7 + 1.4) * 2.45 - gravityImpact * 8, 1.018 + gravityImpact * .012],
        [pointerX * 39 + gravityImpact * 22, -pointerY * 16 + Math.sin(gravityTime * 4.5 + 2.2) * 1.9, 1.016 + gravityImpact * .01]
      ];
      gravityDepthLayers.forEach((layer, index) => {
        const [x, y, scale] = depthMotion[index] || depthMotion[0];
        layer.style.setProperty("--layer-x", `${x * layerEnergy}px`);
        layer.style.setProperty("--layer-y", `${y * layerEnergy}px`);
        layer.style.setProperty("--layer-scale", String(1 + (scale - 1) * layerEnergy));
      });

      const context = gravityContext;
      context.clearRect(0, 0, gravityWidth, gravityHeight);
      const focusX = gravityX * gravityWidth;
      const focusY = gravityY * gravityHeight;
      const influenceRadius = Math.min(gravityWidth, gravityHeight) * .38;

      gravityVelocity *= .945;
      gravityImpact *= .94;
      const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, influenceRadius * .55);
      glow.addColorStop(0, "rgba(232,184,115,.18)");
      glow.addColorStop(.12, "rgba(232,184,115,.06)");
      glow.addColorStop(1, "rgba(232,184,115,0)");
      context.fillStyle = glow;
      context.fillRect(focusX - influenceRadius, focusY - influenceRadius, influenceRadius * 2, influenceRadius * 2);

      gravityNodes.forEach((node, index) => {
        const driftX = reduceMotion ? 0 : Math.cos(gravityTime + node.phase) * 3;
        const driftY = reduceMotion ? 0 : Math.sin(gravityTime * .86 + node.phase) * 2.2;
        const baseX = node.x * gravityWidth + driftX;
        const baseY = node.y * gravityHeight + driftY;
        const dx = focusX - baseX;
        const dy = focusY - baseY;
        const distance = Math.hypot(dx, dy);
        const influence = Math.exp(-Math.pow(distance / influenceRadius, 2));
        const warpedX = baseX + dx * influence * .17;
        const warpedY = baseY + dy * influence * .17;

        if (index % 2 === 0) {
          const controlX = (baseX + focusX) * .5 - dy * .075 * influence;
          const controlY = (baseY + focusY) * .5 + dx * .075 * influence;
          context.beginPath();
          context.moveTo(baseX, baseY);
          context.quadraticCurveTo(controlX, controlY, focusX, focusY);
          context.strokeStyle = `rgba(213,166,103,${.025 + influence * .13})`;
          context.lineWidth = .55;
          context.stroke();
        }

        context.beginPath();
        context.arc(warpedX, warpedY, node.size + influence * .7, 0, Math.PI * 2);
        const particleAlpha = .28 + influence * .58;
        context.fillStyle = index % 11 === 0
          ? `rgba(239,132,165,${particleAlpha})`
          : index % 7 === 0
            ? `rgba(118,199,231,${particleAlpha})`
            : index % 5 === 0
              ? `rgba(181,165,235,${particleAlpha})`
              : `rgba(244,226,195,${particleAlpha})`;
        context.fill();
      });

      const subjectLayout = gravityWidth <= 700 ? mobileSubjects : desktopSubjects;
      const subjectOrder = [0, 2, 3, 4, 1, 0];
      const subjectPoints = subjectLayout.map(([x, y], index) => {
        const baseX = x * gravityWidth;
        const baseY = y * gravityHeight;
        const dx = focusX - baseX;
        const dy = focusY - baseY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const pull = Math.exp(-Math.pow(distance / influenceRadius, 2)) * (.04 + gravityImpact * .08);
        return [baseX + dx * pull, baseY + dy * pull, index];
      });

      context.beginPath();
      subjectOrder.forEach((subjectIndex, orderIndex) => {
        const [x, y] = subjectPoints[subjectIndex];
        if (!orderIndex) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = `rgba(225,178,109,${.1 + gravityImpact * .38})`;
      context.lineWidth = .65 + gravityImpact * .5;
      context.stroke();

      subjectPoints.forEach(([x, y], index) => {
        const pulse = .5 + Math.sin(gravityTime * 6 + index) * .5;
        context.beginPath();
        context.arc(x, y, 3.2 + pulse * 1.2 + gravityImpact * 7, 0, Math.PI * 2);
        context.strokeStyle = `rgba(236,199,141,${.18 + pulse * .18 + gravityImpact * .42})`;
        context.lineWidth = .7;
        context.stroke();
        context.beginPath();
        context.arc(x, y, 1.05 + gravityImpact * .7, 0, Math.PI * 2);
        context.fillStyle = index === 2
          ? `rgba(229,95,73,${.6 + gravityImpact * .35})`
          : `rgba(246,225,190,${.58 + gravityImpact * .38})`;
        context.fill();
      });

      context.beginPath();
      context.arc(focusX, focusY, 2.1, 0, Math.PI * 2);
      context.fillStyle = "rgba(244,216,168,.95)";
      context.shadowBlur = 16;
      context.shadowColor = "rgba(232,184,115,.8)";
      context.fill();
      context.shadowBlur = 0;

      if (!reduceMotion) gravityFrame = requestAnimationFrame(drawGravity);
    };

    const startGravity = () => {
      if (!gravityFrame) gravityFrame = requestAnimationFrame(drawGravity);
    };
    const stopGravity = () => {
      cancelAnimationFrame(gravityFrame);
      gravityFrame = 0;
    };

    gravityStage.addEventListener("pointermove", event => {
      if (reduceMotion || coarsePointer) return;
      const bounds = gravityStage.getBoundingClientRect();
      const nextX = clamp((event.clientX - bounds.left) / bounds.width, .08, .92);
      const nextY = clamp((event.clientY - bounds.top) / bounds.height, .08, .9);
      const elapsed = Math.max(8, event.timeStamp - gravityLastPointerTime);
      const distance = Math.hypot(nextX - gravityLastPointerX, nextY - gravityLastPointerY);
      gravityVelocity = Math.max(gravityVelocity, clamp(distance / elapsed * 900, 0, 1));
      gravityLastPointerTime = event.timeStamp;
      gravityLastPointerX = nextX;
      gravityLastPointerY = nextY;
      gravityTargetX = nextX;
      gravityTargetY = nextY;
      if (gravityCursor) {
        const deltaX = event.clientX - gravityCursorClientX;
        const deltaY = event.clientY - gravityCursorClientY;
        const cursorDistance = Math.hypot(deltaX, deltaY);
        if (cursorDistance > 1.5) gravityCursorAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        gravityCursorClientX = event.clientX;
        gravityCursorClientY = event.clientY;
        gravityCursor.style.setProperty("--comet-x", `${event.clientX - bounds.left}px`);
        gravityCursor.style.setProperty("--comet-y", `${event.clientY - bounds.top}px`);
        gravityCursor.style.setProperty("--comet-angle", `${gravityCursorAngle}deg`);
        gravityCursor.style.setProperty("--comet-stretch", String(clamp(.32 + cursorDistance / 30, .32, 1)));
        gravityStage.classList.add("is-comet-active");
      }
    }, { passive: true });
    gravityStage.addEventListener("pointerleave", () => {
      gravityTargetX = .58;
      gravityTargetY = .46;
      gravityStage.classList.remove("is-comet-active");
    }, { passive: true });
    gravityStage.addEventListener("pointerdown", event => {
      if (reduceMotion || event.button > 0) return;
      const titlePressed = event.target instanceof Element && event.target.closest(".gravity-wordmark h1");
      if (titlePressed) {
        gravityHero.classList.remove("is-title-sweep");
        requestAnimationFrame(() => gravityHero.classList.add("is-title-sweep"));
        window.setTimeout(() => gravityHero.classList.remove("is-title-sweep"), 2500);
        return;
      }
      gravityImpact = 1;
      gravityVelocity = 1;
      gravityHero.classList.remove("is-impact");
      requestAnimationFrame(() => gravityHero.classList.add("is-impact"));
      window.setTimeout(() => gravityHero.classList.remove("is-impact"), 900);
      gravityStage.classList.remove("is-comet-burst");
      requestAnimationFrame(() => gravityStage.classList.add("is-comet-burst"));
      window.setTimeout(() => gravityStage.classList.remove("is-comet-burst"), 440);
    }, { passive: true });

    new IntersectionObserver(entries => {
      gravityVisible = entries[0]?.isIntersecting ?? false;
      if (gravityVisible) startGravity();
      else stopGravity();
    }, { rootMargin: "12% 0px" }).observe(gravityHero);
    new ResizeObserver(resizeGravity).observe(gravityStage);
    addEventListener("scroll", syncGravityScroll, { passive: true });
    resizeGravity();
    syncGravityScroll();
    startGravity();
  }

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
