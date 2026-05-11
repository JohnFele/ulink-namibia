/**
 * Brochures Page JavaScript
 * Handles gallery rendering, modal viewing for images and PDFs
 */

(function() {
  "use strict";

  // Configure PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  // DOM elements
  const container = document.getElementById('brochures-container');
  const modal = document.getElementById('brochureModal');
  const modalContent = document.getElementById('modalDynamicContent');
  const modalFooter = document.getElementById('modalFooter');
  const closeBtn = document.getElementById('modalCloseBtn');

  // State
  let currentPDFDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let brochuresData = [];

  // Fallback image
  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'500\' viewBox=\'0 0 400 500\'%3E%3Crect width=\'400\' height=\'500\' fill=\'%23F4E6D8\'/%3E%3Ctext x=\'30\' y=\'250\' font-family=\'Inter\' font-size=\'20\' fill=\'%23EB7439\'%3EBrochure Preview%3C/text%3E%3C/svg%3E';

  /**
   * Fetch brochure data from JSON file
   */
  async function fetchBrochures() {
    try {
      const response = await fetch('./data/brochures.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      brochuresData = await response.json();
      renderBrochures(brochuresData);
    } catch (error) {
      console.error('Error loading brochures:', error);
      if (container) {
        container.innerHTML = `<div class="col-span-full text-center py-16 text-neutral-500">
          Unable to load brochures. Please try again later.
        </div>`;
      }
    }
  }

  /**
   * Get thumbnail fit mode for an item
   * Defaults: images = 'cover', pdfs = 'contain'
   */
  function getThumbnailFit(item) {
    if (item.thumbnailFit) {
      return item.thumbnailFit; // 'cover' or 'contain'
    }
    // Default: images use cover, PDFs use contain
    return item.type === 'pdf' ? 'contain' : 'cover';
  }

  /**
   * Render brochure cards from data
   */
  function renderBrochures(brochures) {
    if (!container) return;
    
    if (!brochures || brochures.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-16 text-neutral-500">No brochures available at the moment.</div>`;
      return;
    }

    let html = '';
    brochures.forEach(item => {
      const thumbnail = item.thumbnail || item.src || fallbackImage;
      const title = item.title || 'Brochure';
      const isPDF = item.type === 'pdf';
      const thumbnailFit = getThumbnailFit(item);
      
      html += `
        <div class="brochure-card" data-id="${item.id}">
          <div class="card-image" 
               data-type="${item.type}" 
               data-src="${item.src}" 
               data-title="${title.replace(/"/g, '&quot;')}" 
               data-pages="${item.pages || 1}"
               data-thumbnail-fit="${thumbnailFit}">
            <img src="${thumbnail}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImage}';">
            ${isPDF ? `
              <div class="pdf-badge">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                PDF
              </div>
            ` : ''}
            ${isPDF && item.pages ? `<div class="page-indicator">${item.pages} pages</div>` : ''}
          </div>
          <div class="card-content">
            <h3 class="font-semibold text-(--ink) text-lg leading-tight">${title}</h3>
            <p class="text-sm text-neutral-500 mt-1 line-clamp-2">${item.description || 'View brochure'}</p>
            <div class="mt-4 flex items-center text-xs font-medium text-(--ulink-orange)">
              <span>${isPDF ? 'View PDF' : 'Preview image'}</span>
              <svg class="ml-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  /**
   * Render image modal
   */
  function renderImageModal(src, title) {
    modalContent.innerHTML = `<img src="${src}" alt="${title}" style="max-height: 85vh; width: auto;" onerror="this.src='${fallbackImage}'">`;
    
    modalFooter.innerHTML = `
      <span>${title}</span>
      <a href="${src}" download class="pdf-action-btn" style="margin-left: auto;">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        Download
      </a>
    `;
  }

  /**
   * Render PDF modal with viewer
   */
  async function renderPDFModal(src, title) {
    // Create PDF viewer structure
    modalContent.innerHTML = `
      <div class="pdf-viewer">
        <div class="pdf-controls">
          <div class="pdf-page-controls">
            <button class="pdf-page-btn" id="pdfPrev" disabled>←</button>
            <span class="pdf-page-info" id="pdfPageInfo">Page 1 / ?</span>
            <button class="pdf-page-btn" id="pdfNext" disabled>→</button>
          </div>
          <div class="pdf-actions">
            <a href="${src}" download class="pdf-action-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download PDF
            </a>
          </div>
        </div>
        <div class="pdf-canvas-container" id="pdfCanvasContainer">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;

    modalFooter.innerHTML = `<span>${title}</span>`;

    try {
      const loadingTask = pdfjsLib.getDocument(src);
      currentPDFDoc = await loadingTask.promise;
      totalPages = currentPDFDoc.numPages;
      
      document.getElementById('pdfPageInfo').textContent = `Page 1 / ${totalPages}`;
      
      // Render first page
      await renderPDFPage(1);
      
      // Setup navigation
      const prevBtn = document.getElementById('pdfPrev');
      const nextBtn = document.getElementById('pdfNext');
      
      prevBtn.disabled = false;
      nextBtn.disabled = totalPages <= 1;
      
      prevBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
          currentPage--;
          await renderPDFPage(currentPage);
          prevBtn.disabled = currentPage === 1;
          nextBtn.disabled = false;
          document.getElementById('pdfPageInfo').textContent = `Page ${currentPage} / ${totalPages}`;
        }
      });
      
      nextBtn.addEventListener('click', async () => {
        if (currentPage < totalPages) {
          currentPage++;
          await renderPDFPage(currentPage);
          nextBtn.disabled = currentPage === totalPages;
          prevBtn.disabled = false;
          document.getElementById('pdfPageInfo').textContent = `Page ${currentPage} / ${totalPages}`;
        }
      });
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      modalContent.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: white;">
          <p>Unable to load PDF. The file may be missing or inaccessible.</p>
          <a href="${src}" download class="pdf-action-btn" style="margin-top: 1rem; display: inline-flex;">Download instead</a>
        </div>
      `;
    }
  }

  /**
   * Render a specific PDF page
   */
  async function renderPDFPage(pageNum) {
    const container = document.getElementById('pdfCanvasContainer');
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
      const page = await currentPDFDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      container.innerHTML = '';
      container.appendChild(canvas);
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
    } catch (error) {
      console.error('Error rendering page:', error);
      container.innerHTML = '<p style="color: white;">Error rendering page</p>';
    }
  }

  /**
   * Open modal based on item type
   */
  function openModal(item) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    currentPage = 1;
    currentPDFDoc = null;
    
    if (item.type === 'pdf') {
      renderPDFModal(item.src, item.title);
    } else {
      renderImageModal(item.src, item.title);
    }
  }

  /**
   * Close modal
   */
  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      modalContent.innerHTML = '';
      modalFooter.innerHTML = '';
    }, 200);
  }

  /**
   * Find brochure by ID
   */
  function findBrochureById(id) {
    return brochuresData.find(item => item.id === id);
  }

  // Event delegation for card clicks
  if (container) {
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.brochure-card');
      if (!card) return;
      
      const imageDiv = card.querySelector('.card-image');
      if (!imageDiv) return;
      
      const type = imageDiv.dataset.type;
      const src = imageDiv.dataset.src;
      const title = imageDiv.dataset.title || 'Brochure';
      const pages = parseInt(imageDiv.dataset.pages) || 1;
      const id = card.dataset.id;
      
      if (src) {
        openModal({ type, src, title, pages, id });
      }
    });
  }

  // Modal controls
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Smooth scroll for "Browse library" link
  const browseLink = document.querySelector('a[href="#brochures-grid"]');
  if (browseLink) {
    browseLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('brochures-grid');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Global error handler for images
  window.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
      e.target.src = fallbackImage;
    }
  }, true);

  // Initialize: fetch data and render
  fetchBrochures();

})();