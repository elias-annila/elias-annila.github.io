const detailTitle = document.getElementById('detailTitle');
const detailText = document.getElementById('detailText');
const detailMedia = document.getElementById('detailMedia');
const detailImage = document.getElementById('detailImage');
const detailVideo = document.getElementById('detailVideo');
const detailVideoSource = document.getElementById('detailVideoSource');
const detailPopup = document.getElementById('detailPopup');
const closePopupButton = document.getElementById('detailCloseButton');
const hotspots = document.querySelectorAll('.hotspot');
const carouselViewport = document.querySelector('[data-carousel]');
const defaultTitle = detailTitle.textContent;
const defaultText = detailText.textContent;
const defaultImage = detailImage ? detailImage.src : '';
const defaultImageAlt = detailImage ? detailImage.alt : 'Hover image placeholder';

// 1. Updated to detect both images and videos
const carouselItems = carouselViewport
  ? Array.from(carouselViewport.querySelectorAll('.carousel-slide')).map((slide) => {
      const image = slide.querySelector('img');
      const video = slide.querySelector('video');
      const caption = slide.querySelector('figcaption')?.textContent?.trim() || '';

      if (video) {
        return {
          type: 'video',
          src: video.src,
          alt: video.getAttribute('alt') || caption || 'Video',
          caption,
        };
      }

      return {
        type: 'image',
        src: image?.src || '',
        alt: image?.alt || caption,
        caption,
      };
    }).filter((item) => item.src)
  : [];

let popupCarouselState = null;

/* NOTE: parseImageSources() was removed because images are now 
  extracted straight out of the .hotspot-content element.
*/

function renderDetailImages(images, label) {
  if (!detailMedia) {
    return;
  }

  detailMedia.style.display = 'flex';
  detailMedia.innerHTML = '';

  if (!images.length) {
    const placeholder = document.createElement('img');
    placeholder.className = 'detail-image';
    placeholder.src = defaultImage;
    placeholder.alt = defaultImageAlt;
    detailMedia.appendChild(placeholder);
    return;
  }

  images.forEach((src, index) => {
    const img = document.createElement('img');
    img.className = 'detail-image';
    img.src = src;
    img.alt = `${label} kuva ${index + 1}`;
    detailMedia.appendChild(img);
  });
}

function renderPopupCarousel(items, startIndex) {
  if (!detailMedia || !items.length) {
    return;
  }

  const activeIndex = Math.min(Math.max(startIndex, 0), items.length - 1);

  popupCarouselState = {
    items,
    activeIndex,
    track: null,
    title: items[activeIndex]?.alt || defaultTitle,
    text: items[activeIndex]?.caption || '',
  };

  detailMedia.style.display = 'flex';
  detailMedia.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'detail-carousel-shell';

  const controls = document.createElement('div');
  controls.className = 'detail-carousel-controls';

  const previousButton = document.createElement('button');
  previousButton.type = 'button';
  previousButton.className = 'carousel-button';
  previousButton.setAttribute('aria-label', 'Edellinen kuva');
  previousButton.textContent = '‹';

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'carousel-button';
  nextButton.setAttribute('aria-label', 'Seuraava kuva');
  nextButton.textContent = '›';

  controls.append(previousButton, nextButton);

  const viewport = document.createElement('div');
  viewport.className = 'detail-carousel-viewport';

  const track = document.createElement('div');
  track.className = 'detail-carousel-track';

  const indicators = document.createElement('div');
  indicators.className = 'detail-carousel-indicators';
  indicators.setAttribute('aria-label', 'Kuvanavigaatio');

  const indicatorButtons = items.map((item, index) => {
    const slide = document.createElement('figure');
    slide.className = 'detail-carousel-slide';

    let mediaElement;
    if (item.type === 'video') {
      mediaElement = document.createElement('video');
      mediaElement.className = 'detail-image';
      mediaElement.src = item.src;
      mediaElement.controls = true;
      mediaElement.playsInline = true;
    } else {
      mediaElement = document.createElement('img');
      mediaElement.className = 'detail-image';
      mediaElement.src = item.src;
      mediaElement.alt = item.alt || `Kuva ${index + 1}`;
    }

    slide.appendChild(mediaElement);
    track.appendChild(slide);

    const indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.className = 'carousel-indicator';
    indicator.setAttribute('aria-label', item.caption || item.alt || `Kuva ${index + 1}`);
    indicator.addEventListener('click', () => {
      if (!popupCarouselState) {
        return;
      }

      popupCarouselState.activeIndex = index;
      updatePopupCarousel();
    });
    indicators.appendChild(indicator);
    return indicator;
  });

  function updatePopupCarousel() {
    if (!popupCarouselState) {
      return;
    }

    track.querySelectorAll('video').forEach(video => video.pause());

    const slideCount = popupCarouselState.items.length;
    popupCarouselState.activeIndex = (popupCarouselState.activeIndex + slideCount) % slideCount;
    track.style.transform = `translateX(-${popupCarouselState.activeIndex * 100}%)`;
    detailTitle.textContent = popupCarouselState.items[popupCarouselState.activeIndex]?.alt || defaultTitle;
    detailText.textContent = popupCarouselState.items[popupCarouselState.activeIndex]?.caption || '';

    indicatorButtons.forEach((button, index) => {
      button.classList.toggle('is-active', index === popupCarouselState.activeIndex);
      button.setAttribute('aria-current', index === popupCarouselState.activeIndex ? 'true' : 'false');
    });

    const activeSlide = track.children[popupCarouselState.activeIndex];
    const activeVideo = activeSlide?.querySelector('video');
    if (activeVideo) {
      activeVideo.play().catch(() => {});
    }
  }

  previousButton.addEventListener('click', () => {
    if (!popupCarouselState) {
      return;
    }

    popupCarouselState.activeIndex -= 1;
    updatePopupCarousel();
  });

  nextButton.addEventListener('click', () => {
    if (!popupCarouselState) {
      return;
    }

    popupCarouselState.activeIndex += 1;
    updatePopupCarousel();
  });

  viewport.appendChild(track);
  shell.append(controls, viewport, indicators);
  detailMedia.appendChild(shell);
  popupCarouselState.track = track;
  updatePopupCarousel();
}

/* =========================================================================
   UPDATED: Reads labels and rich HTML directly from .hotspot-content
   ========================================================================= */
function showDetail(element) {
  // Grabs the title from data-label, fallback to the text inside .hotspot-name
  const label = element.dataset.label || element.querySelector('.hotspot-name')?.textContent || '';
  const video = element.dataset.video;
  
  const contentContainer = element.querySelector('.hotspot-content');
  let descriptionHTML = '';
  let imageSources = [];

  if (contentContainer) {
    // 1. Find any <img> tags embedded inside your rich content block
    const embeddedImages = contentContainer.querySelectorAll('img');
    imageSources = Array.from(embeddedImages).map(img => img.src);

    // 2. Clone the content block and strip out the images so they don't break layout in the text block
    const textOnlyClone = contentContainer.cloneNode(true);
    textOnlyClone.querySelectorAll('img').forEach(img => img.remove());
    descriptionHTML = textOnlyClone.innerHTML;
  }

  // Update elements
  detailTitle.textContent = label;
  detailText.innerHTML = descriptionHTML; // Changed to innerHTML to render your paragraphs/lists!

  if (detailVideo && video) {
    if (detailVideoSource) {
      detailVideoSource.src = video;
      detailVideoSource.type = 'video/mp4';
    }

    detailVideo.load();
    detailVideo.style.display = 'block';
    if (detailMedia) {
      detailMedia.style.display = 'none';
    }
    detailVideo.play().catch(() => {});
    return;
  }

  if (detailVideo) {
    detailVideo.pause();
    detailVideo.currentTime = 0;
    detailVideo.style.display = 'none';
    if (detailVideoSource) {
      detailVideoSource.src = '';
    }
  }

  if (detailMedia) {
    renderDetailImages(imageSources, label);
  }
}

function showImageDetail(index) {
  const item = carouselItems[index];

  if (!item) {
    return;
  }

  if (detailVideo) {
    detailVideo.pause();
    detailVideo.currentTime = 0;
    detailVideo.style.display = 'none';
    if (detailVideoSource) {
      detailVideoSource.src = '';
    }
  }

  renderPopupCarousel(carouselItems, index);
  openPopup();
}

function clearDetail() {
  detailTitle.textContent = defaultTitle;
  detailText.innerHTML = defaultText;

  if (detailVideo) {
    detailVideo.pause();
    detailVideo.currentTime = 0;
    detailVideo.style.display = 'none';
    if (detailVideoSource) {
      detailVideoSource.src = '';
    }
  }

  if (detailMedia) {
    detailMedia.querySelectorAll('video').forEach(video => video.pause());
    popupCarouselState = null;
    renderDetailImages([], '');
  }
}

function openPopup() {
  if (!detailPopup) return;
  detailPopup.classList.remove('hidden');
  detailPopup.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closePopup() {
  if (!detailPopup) return;
  detailPopup.classList.add('hidden');
  detailPopup.setAttribute('aria-hidden', 'true');
  clearDetail();
  document.body.classList.remove('no-scroll');
}

function handleOverlayClick(event) {
  if (event.target === detailPopup) {
    closePopup();
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && detailPopup && !detailPopup.classList.contains('hidden')) {
    closePopup();
  }
}

function initializeCarousel(viewport) {
  if (!viewport) {
    return;
  }

  const track = viewport.querySelector('.carousel-track');
  const slides = Array.from(viewport.querySelectorAll('.carousel-slide'));
  const slideMedia = Array.from(viewport.querySelectorAll('.carousel-slide img, .carousel-slide video'));
  const previousButton = document.querySelector('[data-carousel-action="prev"]');
  const nextButton = document.querySelector('[data-carousel-action="next"]');
  const indicators = document.querySelector('.carousel-indicators'); 
  let activeIndex = Math.max(slides.findIndex((slide) => slide.classList.contains('is-active')), 0);

  if (!track || !slides.length) {
    return;
  }

  let indicatorButtons = [];
  if (indicators) {
    indicatorButtons = slides.map((slide, index) => {
      const button = document.createElement('button');
      const caption = slide.querySelector('figcaption');

      button.type = 'button';
      button.className = 'carousel-indicator';
      button.setAttribute('aria-label', caption ? caption.textContent || `Kuva ${index + 1}` : `Kuva ${index + 1}`);
      button.addEventListener('click', () => {
        activeIndex = index;
        updateCarousel();
      });
      indicators.appendChild(button);
      return button;
    });
  }

  function updateCarousel() {
    const slideCount = slides.length;
    activeIndex = (activeIndex + slideCount) % slideCount;
    
    if (track.style.transform) {
      track.style.transform = `translateX(-${activeIndex * 100}%)`;
    }

    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === activeIndex);
    });

    if (indicators) {
      indicatorButtons.forEach((button, index) => {
        button.classList.toggle('is-active', index === activeIndex);
        button.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
      });
    }
  }

  previousButton?.addEventListener('click', () => {
    activeIndex -= 1;
    updateCarousel();
  });

  nextButton?.addEventListener('click', () => {
    activeIndex += 1;
    updateCarousel();
  });

  slideMedia.forEach((media, index) => {
    media.setAttribute('role', 'button');
    media.setAttribute('tabindex', '0');
    
    const isVideo = media.tagName.toLowerCase() === 'video';
    const mediaLabel = isVideo ? 'video' : 'kuva';
    const mediaAlt = isVideo ? media.getAttribute('alt') : media.alt;
    
    media.setAttribute('aria-label', `Avaa ${mediaLabel} isompana: ${mediaAlt || `${mediaLabel} ${index + 1}`}`);

    media.addEventListener('click', () => {
      showImageDetail(index);
    });

    media.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        media.click();
      }
    });
  });

  updateCarousel();
}

hotspots.forEach((hotspot) => {
  hotspot.addEventListener('click', (event) => {
    event.preventDefault();
    showDetail(hotspot);
    openPopup();
  });
});

if (closePopupButton) {
  closePopupButton.addEventListener('click', closePopup);
}

if (detailPopup) {
  detailPopup.addEventListener('click', handleOverlayClick);
}

document.addEventListener('keydown', handleKeydown);

initializeCarousel(carouselViewport);