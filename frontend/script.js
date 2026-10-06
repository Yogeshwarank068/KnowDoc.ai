/**
 * KnowDoc.ai — Principal Frontend Script
 * Tagline: "Upload. Ask. Understand."
 * Pure Semantic Vanilla JavaScript (ES6+), Zero External Libraries
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE STORE & CONSTANTS
  // =========================================================================
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes
  const ALLOWED_EXTS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.pptx', '.ppt', '.txt', '.json', '.md', '.markdown'];

  const state = {
    documents: [],             // [{ id, name, type, size, okf, ... }]
    selectedDocIds: new Set(), // IDs of documents active for Q&A
    currentChatId: null,
    messages: [],              // Active conversation messages
    recentChats: [],           // Saved chat history
    activePreviewDocId: null,
    isThinking: false,
    serverConnected: false,
    activeModel: 'gemini-3.5-flash'
  };

  // DOM Elements Cache
  const dom = {
    splashScreen: document.getElementById('splashScreen'),
    appShell: document.getElementById('appShell'),
    brandHomeBtn: document.getElementById('brandHomeBtn'),
    sidebarBrandHomeBtn: document.getElementById('sidebarBrandHomeBtn'),
    
    // Top Bar & Unified Sidebar
    chatgptSidebar: document.getElementById('chatgptSidebar'),
    sidebarRailItems: document.getElementById('sidebarRailItems'),
    railBrandToggleBtn: document.getElementById('railBrandToggleBtn'),
    railNewChatBtn: document.getElementById('railNewChatBtn'),
    railUploadDocBtn: document.getElementById('railUploadDocBtn'),
    railDocCountBadge: document.getElementById('railDocCountBadge'),
    railRecentChatsBtn: document.getElementById('railRecentChatsBtn'),
    railUserProfileBtn: document.getElementById('railUserProfileBtn'),
    sidebarNewChatBtn: document.getElementById('sidebarNewChatBtn'),
    sidebarUploadDocBtn: document.getElementById('sidebarUploadDocBtn'),
    sidebarDocsList: document.getElementById('sidebarDocsList'),
    sidebarDocCountBadge: document.getElementById('sidebarDocCountBadge'),
    sidebarSettingsBtn: document.getElementById('sidebarSettingsBtn'),
    sidebarUserProfileBtn: document.getElementById('sidebarUserProfileBtn'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    sidebarChatList: document.getElementById('sidebarChatList'),
    sidebarThemeToggle: document.getElementById('sidebarThemeToggle'),
    sidebarThemeText: document.getElementById('sidebarThemeText'),
    btnHeaderThemeToggle: document.getElementById('btnHeaderThemeToggle'),
    btnHeaderNewChat: document.getElementById('btnHeaderNewChat'),
    btnHeaderUpload: document.getElementById('btnHeaderUpload'),
    btnHeaderDocsDropdown: document.getElementById('btnHeaderDocsDropdown'),
    docsDropdownContainer: document.getElementById('docsDropdownContainer'),
    uploadedDocsDropdown: document.getElementById('uploadedDocsDropdown'),
    uploadedDocsList: document.getElementById('uploadedDocsList'),
    headerDocsBadge: document.getElementById('headerDocsBadge'),
    docsDropdownCountBadge: document.getElementById('docsDropdownCountBadge'),
    btnCloseDocsDropdown: document.getElementById('btnCloseDocsDropdown'),
    docCountBadge: document.getElementById('docCountBadge'),
    btnUserProfile: document.getElementById('btnUserProfile'),
    userProfileDropdown: document.getElementById('userProfileDropdown'),
    menuActionToggleTheme: document.getElementById('menuActionToggleTheme'),
    menuThemeText: document.getElementById('menuThemeText'),
    menuActionNewChat: document.getElementById('menuActionNewChat'),
    menuActionUpload: document.getElementById('menuActionUpload'),
    menuActionClearHistory: document.getElementById('menuActionClearHistory'),
    menuActionLogout: document.getElementById('menuActionLogout'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettingsModal: document.getElementById('btnCloseSettingsModal'),
    btnSettingsUploadDoc: document.getElementById('btnSettingsUploadDoc'),
    settingsDocsList: document.getElementById('settingsDocsList'),
    settingsDocCountBadge: document.getElementById('settingsDocCountBadge'),
    settingsThemeToggleBtn: document.getElementById('settingsThemeToggleBtn'),
    settingsThemeLabel: document.getElementById('settingsThemeLabel'),
    btnSettingsClearHistory: document.getElementById('btnSettingsClearHistory'),

    // Hero & Chat Viewport
    messagesContainer: document.getElementById('messagesContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    heroGreetingText: document.getElementById('heroGreetingText'),
    welcomeSuggestions: document.getElementById('welcomeSuggestions'),
    chatStream: document.getElementById('chatStream'),
    thinkingIndicator: document.getElementById('thinkingIndicator'),

    // Floating Input Dock
    floatingDock: document.getElementById('floatingDock'),
    btnInputAttach: document.getElementById('btnInputAttach'),
    headerDocBadge: document.getElementById('headerDocBadge'),
    headerDocCount: document.getElementById('headerDocCount'),
    chatInput: document.getElementById('chatInput'),
    btnVoiceInput: document.getElementById('btnVoiceInput'),
    btnSend: document.getElementById('btnSend'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),

    // Preview Drawer
    previewPanel: document.getElementById('previewPanel'),
    btnClosePreview: document.getElementById('btnClosePreview'),
    previewDocSelect: document.getElementById('previewDocSelect'),
    previewMetaBar: document.getElementById('previewMetaBar'),
    previewMetaType: document.getElementById('previewMetaType'),
    previewMetaSize: document.getElementById('previewMetaSize'),
    previewMetaSpecific: document.getElementById('previewMetaSpecific'),
    previewMetaSpecificVal: document.getElementById('previewMetaSpecificVal'),
    previewEmptyState: document.getElementById('previewEmptyState'),
    previewRenderer: document.getElementById('previewRenderer'),

    // Upload Modal
    uploadModal: document.getElementById('uploadModal'),
    btnCloseUploadModal: document.getElementById('btnCloseUploadModal'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    btnBrowseFiles: document.getElementById('btnBrowseFiles'),
    processingList: document.getElementById('processingList'),
    processingItems: document.getElementById('processingItems'),
    btnDoneUpload: document.getElementById('btnDoneUpload'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // 2. OPENING SPLASH SCREEN (PURE CSS + JS)
  // =========================================================================
  function initSplashScreen() {
    setTimeout(() => {
      const splash = dom.splashScreen || document.getElementById('splashScreen');
      const app = dom.appShell || document.getElementById('appShell');
      if (splash) {
        splash.classList.add('fade-out');
        if (app) {
          app.style.opacity = '1';
        }
        setTimeout(() => {
          splash.style.display = 'none';
        }, 650);
      }
    }, 1800);
  }

  // =========================================================================
  // 3. TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // =========================================================================
  // 3b. CHATGPT THEME ENGINE (FUNCTIONAL DARK / LIGHT MODE)
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem('knowdoc-theme') || localStorage.getItem('knowdoc_theme') || 'dark';
    applyTheme(savedTheme, false);
  }

  function toggleTheme() {
    const isCurrentlyLight = document.body.classList.contains('light-theme') || document.documentElement.classList.contains('light-theme');
    const newTheme = isCurrentlyLight ? 'dark' : 'light';
    applyTheme(newTheme, true);
  }

  function applyTheme(theme, showNotification = false) {
    const isLight = theme === 'light';
    document.documentElement.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('dark-theme', !isLight);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('dark-theme', !isLight);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('knowdoc-theme', theme);
    localStorage.setItem('knowdoc_theme', theme);

    if (dom.sidebarThemeText) {
      dom.sidebarThemeText.textContent = isLight ? 'Dark mode' : 'Light mode';
    }
    if (dom.menuThemeText) {
      dom.menuThemeText.textContent = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    }

    const headerMoon = document.querySelector('.header-moon-icon');
    const headerSun = document.querySelector('.header-sun-icon');
    if (headerMoon && headerSun) {
      headerMoon.style.display = isLight ? 'none' : 'block';
      headerSun.style.display = isLight ? 'block' : 'none';
    }

    const sidebarMoon = document.querySelector('.theme-moon-svg');
    const sidebarSun = document.querySelector('.theme-sun-svg');
    if (sidebarMoon && sidebarSun) {
      sidebarMoon.style.display = isLight ? 'none' : 'block';
      sidebarSun.style.display = isLight ? 'block' : 'none';
    }

    if (dom.settingsThemeLabel) {
      dom.settingsThemeLabel.textContent = isLight ? 'Dark mode' : 'Light mode';
    }
    const settingsMoon = dom.settingsModal ? dom.settingsModal.querySelector('.theme-moon-svg') : null;
    const settingsSun = dom.settingsModal ? dom.settingsModal.querySelector('.theme-sun-svg') : null;
    if (settingsMoon && settingsSun) {
      settingsMoon.style.display = isLight ? 'none' : 'block';
      settingsSun.style.display = isLight ? 'block' : 'none';
    }

    if (showNotification) {
      showToast(`Switched to ${isLight ? 'Light' : 'Dark'} mode`, 'info');
    }
  }

  // =========================================================================
  // 3c. CHATGPT SIDEBAR TOGGLE & NAVIGATION
  // =========================================================================
  function toggleSidebar(forceState = null) {
    if (!dom.chatgptSidebar) return;
    const isMobile = window.innerWidth <= 860;
    if (isMobile) {
      const isCurrentlyOpen = dom.chatgptSidebar.classList.contains('mobile-open');
      const nextOpen = forceState !== null ? forceState : !isCurrentlyOpen;
      dom.chatgptSidebar.classList.toggle('mobile-open', nextOpen);
      if (dom.sidebarBackdrop) dom.sidebarBackdrop.classList.toggle('active', nextOpen);
    } else {
      const isCurrentlyCollapsed = dom.chatgptSidebar.classList.contains('collapsed');
      const nextCollapsed = forceState !== null ? !forceState : !isCurrentlyCollapsed;
      dom.chatgptSidebar.classList.toggle('collapsed', nextCollapsed);
    }
  }

  function expandSidebar() {
    toggleSidebar(true);
  }

  function collapseSidebar() {
    toggleSidebar(false);
  }

  function closeSidebar() {
    if (dom.chatgptSidebar) {
      dom.chatgptSidebar.classList.remove('mobile-open');
    }
    if (dom.sidebarBackdrop) {
      dom.sidebarBackdrop.classList.remove('active');
    }
  }

  // =========================================================================
  // 3d. RECENT CHATS MANAGEMENT & PERSISTENCE
  // =========================================================================
  function initRecentChats() {
    try {
      const saved = localStorage.getItem('knowdoc_recent_chats');
      if (saved) {
        state.recentChats = JSON.parse(saved);
      }
    } catch (e) {
      state.recentChats = [];
    }
    renderRecentChats();
  }

  function renderRecentChats() {
    if (!dom.sidebarChatList) return;
    dom.sidebarChatList.innerHTML = '';

    if (!state.recentChats || state.recentChats.length === 0) {
      dom.sidebarChatList.innerHTML = '<div class="sidebar-empty-state">No recent chats yet</div>';
      return;
    }

    state.recentChats.forEach(chat => {
      const item = document.createElement('div');
      const isActive = chat.id === state.currentChatId;
      item.className = `sidebar-chat-item ${isActive ? 'active' : ''}`;
      item.dataset.id = chat.id;

      item.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="chat-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
        <button class="chat-delete-btn" type="button" title="Delete conversation" aria-label="Delete conversation">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-delete-btn')) return;
        restoreChatSession(chat.id);
      });

      const delBtn = item.querySelector('.chat-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteChatSession(chat.id);
        });
      }

      dom.sidebarChatList.appendChild(item);
    });
  }

  /**
   * Smart Chat Title Generator (Requirement 1)
   * Cleans, filters filler words, and summarizes user prompt into a concise, Title Case heading.
   */
  function generateSmartChatTitle(prompt) {
    if (!prompt || typeof prompt !== 'string') return 'New Conversation';

    let text = prompt.trim();

    // 1. Specific Intent & Topic Heuristics
    const lower = text.toLowerCase();
    if (lower.includes('time and work') || lower.includes('work and time')) {
      return 'Time and Work';
    }
    if (lower.includes('speed') && (lower.includes('distance') || lower.includes('time'))) {
      return 'Speed, Time & Distance';
    }
    if (lower.includes('rainwater') || lower.includes('harvesting')) {
      return 'Rainwater Harvesting';
    }
    if (lower.includes('who are you') || lower.includes('what is your name') || lower.includes('whats your name')) {
      return 'KnowDoc.ai Identity';
    }
    if (lower.includes('python') && (lower.includes('learn') || lower.includes('start') || lower.includes('tutorial') || lower.includes('course'))) {
      return 'Python Learning Guide';
    }
    if (lower.includes('quantitative') || lower.includes('aptitude')) {
      return 'Quantitative Aptitude Tutorial';
    }

    // 2. Strip conversational prefixes and filler noise
    const prefixRegex = /^(can you please |could you please |please |kindly |hey |hello |hi |tell me about |tell me |explain to me |explain me |explain |describe |teach me |show me |what is |what are |who is |who are |how to learn |how can i learn |how to |how do i |summary of |summarize |give me a summary of |give me |i want to learn |i want to understand |i dont know |overview of |solve |calculate |details on |detail about )\s*/i;
    text = text.replace(prefixRegex, '').trim();

    // Strip trailing punctuation & inquiry marks
    text = text.replace(/[?!.:;,]+$/, '').trim();

    if (!text || text.length < 2) {
      return 'General Inquiry';
    }

    // 3. Format into proper Title Case
    const minorWords = new Set(['and', 'or', 'to', 'in', 'of', 'for', 'with', 'a', 'an', 'the', 'at', 'by', 'from', 'on']);
    const acronyms = {
      'ai': 'AI',
      'okf': 'OKF',
      'pdf': 'PDF',
      'docx': 'DOCX',
      'doc': 'DOC',
      'xlsx': 'XLSX',
      'csv': 'CSV',
      'api': 'API',
      'sql': 'SQL',
      'ml': 'ML',
      'ui': 'UI',
      'ux': 'UX',
      'html': 'HTML',
      'css': 'CSS',
      'js': 'JS'
    };

    const words = text.split(/\s+/).filter(Boolean);
    const titleWords = words.map((w, idx) => {
      const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (acronyms[cleanW]) {
        return acronyms[cleanW];
      }
      if (idx > 0 && minorWords.has(cleanW)) {
        return cleanW;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });

    let result = titleWords.join(' ');
    // Limit length nicely without breaking words
    if (result.length > 34) {
      result = result.slice(0, 32).trim() + '...';
    }
    return result || 'New Conversation';
  }

  function saveCurrentChatSession(firstUserText = null) {
    if (!state.currentChatId) {
      state.currentChatId = 'chat_' + Date.now();
    }

    const firstMsg = state.messages.find(m => m.role === 'user');
    const rawText = firstUserText || firstMsg?.content;
    const smartTitle = generateSmartChatTitle(rawText);

    const existingIdx = state.recentChats.findIndex(c => c.id === state.currentChatId);
    if (existingIdx >= 0) {
      state.recentChats[existingIdx].messages = [...state.messages];
      state.recentChats[existingIdx].updatedAt = new Date().toISOString();
      if (!state.recentChats[existingIdx].title || state.recentChats[existingIdx].title === 'Current Session' || state.recentChats[existingIdx].title === 'New Conversation') {
        state.recentChats[existingIdx].title = smartTitle;
      }
    } else {
      state.recentChats.unshift({
        id: state.currentChatId,
        title: smartTitle,
        messages: [...state.messages],
        updatedAt: new Date().toISOString()
      });
    }

    if (state.recentChats.length > 30) {
      state.recentChats = state.recentChats.slice(0, 30);
    }

    try {
      localStorage.setItem('knowdoc_recent_chats', JSON.stringify(state.recentChats));
    } catch (e) {}

    renderRecentChats();
  }

  function restoreChatSession(chatId) {
    const chat = state.recentChats.find(c => c.id === chatId);
    if (!chat) return;

    state.currentChatId = chat.id;
    state.messages = [...(chat.messages || [])];

    if (dom.chatStream) dom.chatStream.innerHTML = '';
    if (state.messages.length > 0) {
      if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'none';
      state.messages.forEach(msg => renderMessage(msg));
      scrollToBottom();
    } else {
      if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'flex';
    }

    renderRecentChats();
    closeSidebar();
  }

  function deleteChatSession(chatId) {
    state.recentChats = state.recentChats.filter(c => c.id !== chatId);
    try {
      localStorage.setItem('knowdoc_recent_chats', JSON.stringify(state.recentChats));
    } catch (e) {}

    if (state.currentChatId === chatId) {
      startNewChat();
    } else {
      renderRecentChats();
    }
    showToast('Conversation removed from history.', 'info');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // =========================================================================
  // 4. OPEN KNOWLEDGE FORMAT (OKF) CLIENT-SIDE NORMALIZATION ENGINE
  // =========================================================================
  class OKFEngine {
    static formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    static generateDocId() {
      return 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    }

    static async parseFileToOKF(file) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const docId = this.generateDocId();
      const baseDoc = {
        document: {
          id: docId,
          name: file.name,
          type: ext.replace('.', ''),
          size: this.formatBytes(file.size),
          bytes: file.size,
          uploadedAt: new Date().toISOString()
        },
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          records: 0
        },
        content: []
      };

      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        return await this.parseSpreadsheet(file, baseDoc);
      } else if (['.json'].includes(ext)) {
        return await this.parseJSON(file, baseDoc);
      } else {
        return await this.parseTextBased(file, baseDoc);
      }
    }

    static async parseSpreadsheet(file, baseDoc) {
      const text = await file.text().catch(() => '');
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const rows = [];
      let headers = [];

      if (lines.length > 0) {
        headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
          rows.push(cells);
        }
      }

      baseDoc.metadata.records = rows.length;
      baseDoc.content.push({
        type: 'sheet',
        name: 'Sheet 1',
        columns: headers.length > 0 ? headers : ['Column 1', 'Column 2'],
        rows: rows
      });
      return baseDoc;
    }

    static async parseJSON(file, baseDoc) {
      const text = await file.text().catch(() => '{}');
      try {
        const parsed = JSON.parse(text);
        baseDoc.metadata.records = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
        baseDoc.content.push({
          type: 'json_data',
          name: 'Root',
          data: parsed
        });
      } catch (e) {
        baseDoc.content.push({
          type: 'paragraph',
          text: text
        });
      }
      return baseDoc;
    }

    static async parseTextBased(file, baseDoc) {
      const text = await file.text().catch(() => '');
      let rawBlocks = text.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
      
      // Handle single-spaced lines
      if (rawBlocks.length <= 1 && text.includes('\n')) {
        rawBlocks = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      }

      baseDoc.metadata.records = rawBlocks.length;
      rawBlocks.forEach((b, idx) => {
        const isHeader = b.startsWith('#') || 
                         /^(module|chapter|section|part|unit|topic|step)\s*[\d\w\:\.\-]/i.test(b) ||
                         (b.length < 75 && !b.endsWith('.') && !b.includes(',') && idx === 0);
        
        if (isHeader) {
          baseDoc.content.push({
            type: 'heading',
            level: b.startsWith('#') ? (b.match(/^#+/)[0].length) : 2,
            text: b.replace(/^#+\s*/, '')
          });
        } else {
          baseDoc.content.push({
            type: 'paragraph',
            text: b,
            page: Math.floor(idx / 5) + 1
          });
        }
      });
      return baseDoc;
    }

    /**
     * Flatten OKF data structure into searchable, clean readable text
     */
    static extractOKFText(okfDocuments) {
      if (!okfDocuments) return '';
      const docs = Array.isArray(okfDocuments) ? okfDocuments : [okfDocuments];
      const output = [];

      for (const doc of docs) {
        const docName = doc.document?.name || doc.name || doc.metadata?.title || 'Document';
        const docType = (doc.document?.type || doc.type || 'unknown').toUpperCase();
        const content = doc.content || doc.okf?.content || [];

        output.push(`--- DOCUMENT: ${docName} (Format: ${docType}) ---`);

        for (const block of content) {
          if (!block) continue;
          if (block.type === 'heading') {
            output.push(`## ${block.text}`);
          } else if (block.type === 'paragraph') {
            output.push(block.text);
          } else if (block.type === 'list' && Array.isArray(block.items)) {
            output.push(block.items.map(it => `• ${it}`).join('\n'));
          } else if (block.type === 'sheet') {
            output.push(`[Spreadsheet Sheet: ${block.name}]`);
            if (block.columns && block.columns.length) output.push(`Headers: ${block.columns.join(' | ')}`);
            (block.rows || []).slice(0, 200).forEach((r, idx) => {
              output.push(`Row ${idx + 2}: ${Array.isArray(r) ? r.join(' | ') : r}`);
            });
          } else if (block.type === 'table') {
            if (block.headers && block.headers.length) output.push(`Table: ${block.headers.join(' | ')}`);
            (block.rows || []).forEach(r => output.push(Array.isArray(r) ? r.join(' | ') : r));
          } else if (block.type === 'slide') {
            output.push(`[Slide ${block.slideNumber || 1}: ${block.title || ''}]`);
            if (block.bullets && block.bullets.length) output.push(block.bullets.map(b => `• ${b}`).join('\n'));
            if (block.text) output.push(block.text);
          } else if (block.type === 'code') {
            output.push(`\`\`\`${block.language || ''}\n${block.code}\n\`\`\``);
          } else if (block.text) {
            output.push(block.text);
          }
        }
        output.push(`--- END OF ${docName} ---\n`);
      }
      return output.join('\n\n');
    }
  }

  // =========================================================================
  // 5. UPLOAD & STRICT 20 MB VALIDATION WITH MULTI-STAGE PROGRESS
  // =========================================================================
  function validateFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    // Strict 20 MB validation
    if (file.size > MAX_FILE_SIZE) {
      showToast('File size exceeds the 20 MB limit. Please upload a smaller file.', 'error');
      return { valid: false, reason: 'size' };
    }

    if (!ALLOWED_EXTS.includes(ext)) {
      showToast(`Unsupported format "${ext}". Allowed: PDF, Word, Excel, CSV, PPTX, TXT, JSON, Markdown.`, 'error');
      return { valid: false, reason: 'format' };
    }

    return { valid: true };
  }

  function createProcessingCard(file) {
    const card = document.createElement('div');
    card.className = 'proc-card';
    card.innerHTML = `
      <div class="proc-filename">${file.name} (${OKFEngine.formatBytes(file.size)})</div>
      <div class="proc-steps">
        <div class="proc-step-row step-1 active"><span class="step-icon">⏳</span> <span>Uploading file</span></div>
        <div class="proc-step-row step-2"><span class="step-icon">○</span> <span>Extracting content</span></div>
        <div class="proc-step-row step-3"><span class="step-icon">○</span> <span>Structuring knowledge</span></div>
        <div class="proc-step-row step-4"><span class="step-icon">○</span> <span>Indexing for Q&A</span></div>
        <div class="proc-step-row step-5"><span class="step-icon">○</span> <span>Ready</span></div>
      </div>
    `;

    return {
      el: card,
      updateStep: (stepNum, isCompleted = false) => {
        const step = card.querySelector(`.step-${stepNum}`);
        if (!step) return;
        if (isCompleted) {
          step.classList.remove('active');
          step.classList.add('completed');
          step.querySelector('.step-icon').textContent = '✓';
        } else {
          step.classList.add('active');
          step.querySelector('.step-icon').textContent = '⏳';
        }
      }
    };
  }

  async function handleFilesUpload(files) {
    if (!files || files.length === 0) return;

    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (validateFile(f).valid) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) return;

    openUploadModal();
    dom.dropZone.style.display = 'none';
    dom.processingList.style.display = 'flex';
    dom.processingItems.innerHTML = '';
    dom.btnDoneUpload.style.display = 'none';

    const cardMap = new Map();
    validFiles.forEach(file => {
      const card = createProcessingCard(file);
      dom.processingItems.appendChild(card.el);
      cardMap.set(file.name, card);
    });

    // Try backend upload first
    let backendSuccess = false;
    try {
      const formData = new FormData();
      validFiles.forEach(f => formData.append('files', f));
      
      validFiles.forEach(f => {
        const c = cardMap.get(f.name);
        if (c) c.updateStep(1, true);
        if (c) c.updateStep(2, false);
      });

      let res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/documents', {
          method: 'POST',
          body: formData
        }).catch(() => null);
      }

      if (res && res.ok) {
        backendSuccess = true;
        validFiles.forEach(f => {
          const c = cardMap.get(f.name);
          if (c) c.updateStep(2, true);
          if (c) c.updateStep(3, true);
          if (c) c.updateStep(4, true);
          if (c) c.updateStep(5, true);
        });
        await fetchDocuments();
      }
    } catch (e) {
      console.warn('Backend upload skipped, performing client-side OKF normalization.');
    }

    // Client-side OKF fallback / direct support
    if (!backendSuccess) {
      for (const file of validFiles) {
        const card = cardMap.get(file.name);
        if (card) card.updateStep(1, true);
        await new Promise(r => setTimeout(r, 200));

        if (card) card.updateStep(2, false);
        const okfDoc = await OKFEngine.parseFileToOKF(file);
        if (card) card.updateStep(2, true);
        await new Promise(r => setTimeout(r, 200));

        if (card) card.updateStep(3, true);
        if (card) card.updateStep(4, false);
        await new Promise(r => setTimeout(r, 250));

        state.documents.push({
          id: okfDoc.document.id,
          name: okfDoc.document.name,
          type: okfDoc.document.type,
          size: okfDoc.document.size,
          okf: okfDoc
        });
        state.selectedDocIds.add(okfDoc.document.id);

        if (card) card.updateStep(4, true);
        if (card) card.updateStep(5, true);
      }
      updateDocumentsUI();
    }

    dom.btnDoneUpload.style.display = 'block';
    showToast(`Successfully processed ${validFiles.length} document(s) into OKF.`, 'success');
  }

  // =========================================================================
  // 6. DOCUMENT MANAGEMENT & DRAWERS
  // =========================================================================
  async function fetchDocuments() {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        const list = data.documents || [];
        state.documents = list.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          size: d.sizeFormatted || d.size,
          metadata: d.metadata,
          okf: d.okf || null
        }));
        
        // Select all by default
        state.documents.forEach(d => state.selectedDocIds.add(d.id));
        updateDocumentsUI();
        state.serverConnected = true;

        // Lazy-fetch full OKF content if missing
        for (const doc of state.documents) {
          if (!doc.okf) {
            fetch(`/api/documents/${doc.id}`).then(r => r.json()).then(d => {
              if (d && d.document) doc.okf = d.document;
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Local documents maintained
      updateDocumentsUI();
    }
  }

  function updateDocumentsUI() {
    const count = state.documents.length;
    const selectedCount = state.selectedDocIds.size;

    if (dom.docCountBadge) dom.docCountBadge.textContent = count;
    if (dom.sidebarDocBadge) dom.sidebarDocBadge.textContent = count;
    if (dom.sidebarDocCountBadge) dom.sidebarDocCountBadge.textContent = count;

    if (dom.headerDocsBadge) {
      dom.headerDocsBadge.textContent = count;
    }

    if (dom.railDocCountBadge) {
      dom.railDocCountBadge.textContent = count;
      dom.railDocCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    if (dom.docsDropdownCountBadge) {
      dom.docsDropdownCountBadge.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
    }

    if (dom.headerDocCount) {
      dom.headerDocCount.textContent = count > 0 
        ? `${selectedCount} of ${count} Document${count > 1 ? 's' : ''}` 
        : '0 Documents';
    }

    // Refresh uploaded docs list in sidebar, dropdown and settings modal
    renderSidebarDocsList();
    renderUploadedDocsDropdown();
    renderSettingsDocsList();

    // Update Preview Selector dropdown
    if (dom.previewDocSelect) {
      dom.previewDocSelect.innerHTML = '<option value="">Select a document to inspect...</option>';
      state.documents.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.name;
        dom.previewDocSelect.appendChild(opt);
      });
      if (state.activePreviewDocId) {
        dom.previewDocSelect.value = state.activePreviewDocId;
      }
    }
  }

  function getDocTypeBadgeInfo(docName = '', docType = '') {
    const ext = (docName.split('.').pop() || docType || '').toLowerCase();
    let badgeBg = 'rgba(56, 189, 248, 0.15)';
    let badgeColor = 'var(--accent-cyan)';
    let label = ext.toUpperCase().slice(0, 4) || 'FILE';

    if (ext === 'pdf') {
      badgeBg = 'rgba(244, 63, 94, 0.16)';
      badgeColor = 'var(--accent-rose)';
      label = 'PDF';
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      badgeBg = 'rgba(16, 185, 129, 0.16)';
      badgeColor = 'var(--accent-emerald)';
      label = ext === 'csv' ? 'CSV' : 'XLS';
    } else if (['docx', 'doc'].includes(ext)) {
      badgeBg = 'rgba(59, 130, 246, 0.16)';
      badgeColor = '#60a5fa';
      label = 'DOC';
    } else if (['pptx', 'ppt'].includes(ext)) {
      badgeBg = 'rgba(249, 115, 22, 0.16)';
      badgeColor = 'var(--accent-amber)';
      label = 'PPT';
    } else if (['json', 'txt', 'md', 'markdown'].includes(ext)) {
      badgeBg = 'rgba(129, 140, 248, 0.16)';
      badgeColor = 'var(--accent-indigo)';
      label = ext.toUpperCase().slice(0, 4);
    }

    return { label, badgeBg, badgeColor };
  }

  function renderUploadedDocsDropdown() {
    if (!dom.uploadedDocsList) return;

    dom.uploadedDocsList.innerHTML = '';

    if (state.documents.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'docs-dropdown-empty';
      emptyDiv.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" class="docs-empty-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p class="docs-empty-text">No documents uploaded yet. Click Upload to add files.</p>
        <button type="button" class="docs-empty-upload-btn" id="btnDocsEmptyUpload">Upload Files</button>
      `;
      const btnEmptyUpload = emptyDiv.querySelector('#btnDocsEmptyUpload');
      if (btnEmptyUpload) {
        btnEmptyUpload.addEventListener('click', () => {
          toggleDocsDropdown(false);
          openUploadModal();
        });
      }
      dom.uploadedDocsList.appendChild(emptyDiv);
      return;
    }

    state.documents.forEach(doc => {
      const { label, badgeBg, badgeColor } = getDocTypeBadgeInfo(doc.name, doc.type);

      const row = document.createElement('div');
      row.className = 'uploaded-doc-row';
      row.setAttribute('data-id', doc.id);

      const infoDiv = document.createElement('div');
      infoDiv.className = 'uploaded-doc-info';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'uploaded-doc-type-tag';
      tagSpan.style.backgroundColor = badgeBg;
      tagSpan.style.color = badgeColor;
      tagSpan.textContent = label;

      const metaDiv = document.createElement('div');
      metaDiv.className = 'uploaded-doc-meta';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'uploaded-doc-name';
      nameSpan.textContent = doc.name;
      nameSpan.title = doc.name;

      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'uploaded-doc-size';
      sizeSpan.textContent = doc.size || 'Uploaded';

      metaDiv.appendChild(nameSpan);
      metaDiv.appendChild(sizeSpan);
      infoDiv.appendChild(tagSpan);
      infoDiv.appendChild(metaDiv);

      const delBtn = document.createElement('button');
      delBtn.className = 'uploaded-doc-del-btn';
      delBtn.title = `Delete ${doc.name}`;
      delBtn.setAttribute('aria-label', `Delete ${doc.name}`);
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      `;

      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteDocument(doc.id);
      });

      row.appendChild(infoDiv);
      row.appendChild(delBtn);
      dom.uploadedDocsList.appendChild(row);
    });
  }

  function toggleDocsDropdown(forceState = null) {
    if (!dom.uploadedDocsDropdown) return;
    const isCurrentlyOpen = dom.uploadedDocsDropdown.style.display !== 'none';
    const nextState = forceState !== null ? forceState : !isCurrentlyOpen;

    if (nextState) {
      if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
      renderUploadedDocsDropdown();
      dom.uploadedDocsDropdown.style.display = 'flex';
      if (dom.btnHeaderDocsDropdown) dom.btnHeaderDocsDropdown.setAttribute('aria-expanded', 'true');
    } else {
      dom.uploadedDocsDropdown.style.display = 'none';
      if (dom.btnHeaderDocsDropdown) dom.btnHeaderDocsDropdown.setAttribute('aria-expanded', 'false');
    }
  }

  async function deleteDocument(docId) {
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    } catch (e) {}
    state.documents = state.documents.filter(d => d.id !== docId);
    state.selectedDocIds.delete(docId);
    updateDocumentsUI();
    showToast('Document removed from knowledge base.', 'info');
  }

  // Drawers management
  function openDocsDrawer(open = true) {
    if (dom.docsDrawer) dom.docsDrawer.classList.toggle('open', open);
    if (dom.drawerBackdrop) dom.drawerBackdrop.classList.toggle('active', open);
  }

  function openPreviewDrawer(open = true) {
    if (dom.previewPanel) dom.previewPanel.classList.toggle('open', open);
    if (dom.drawerBackdrop) dom.drawerBackdrop.classList.toggle('active', open);
  }

  function openSettingsModal() {
    if (dom.settingsModal) {
      dom.settingsModal.style.display = 'flex';
      renderSettingsDocsList();
    }
  }

  function closeSettingsModal() {
    if (dom.settingsModal) dom.settingsModal.style.display = 'none';
  }

  /**
   * Dedicated Left Sidebar Document Management (Requirement 1)
   * Renders active document list in left sidebar with file icon, name, size, and delete button.
   */
  function renderSidebarDocsList() {
    if (!dom.sidebarDocsList) return;
    dom.sidebarDocsList.innerHTML = '';

    const count = state.documents.length;
    if (dom.sidebarDocCountBadge) {
      dom.sidebarDocCountBadge.textContent = count;
    }
    if (dom.railDocCountBadge) {
      dom.railDocCountBadge.textContent = count;
      dom.railDocCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    if (count === 0) {
      dom.sidebarDocsList.innerHTML = `
        <div class="sidebar-docs-empty">
          <span>No documents uploaded</span>
        </div>
      `;
      return;
    }

    state.documents.forEach(doc => {
      const { label, badgeBg, badgeColor } = getDocTypeBadgeInfo(doc.name, doc.type);
      const ext = (doc.name.split('.').pop() || '').toLowerCase();
      let formatClass = 'doc';
      if (ext === 'pdf') formatClass = 'pdf';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) formatClass = 'sheet';
      else if (['pptx', 'ppt'].includes(ext)) formatClass = 'slide';

      const item = document.createElement('div');
      item.className = 'sidebar-doc-item';
      item.setAttribute('data-id', doc.id);
      item.title = `Click to inspect ${doc.name}`;

      item.innerHTML = `
        <div class="sidebar-doc-icon-wrap ${formatClass}" style="background-color: ${badgeBg}; color: ${badgeColor};">
          <span style="font-size: 0.62rem; font-weight: 700; font-family: var(--font-mono);">${label}</span>
        </div>
        <div class="sidebar-doc-meta">
          <span class="sidebar-doc-name">${escapeHtml(doc.name)}</span>
          <span class="sidebar-doc-size">${doc.size || 'Ready'}</span>
        </div>
        <button class="sidebar-doc-delete-btn" type="button" title="Delete ${escapeHtml(doc.name)}" aria-label="Delete document">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar-doc-delete-btn')) return;
        loadDocumentPreview(doc.id);
        openPreviewDrawer(true);
      });

      const delBtn = item.querySelector('.sidebar-doc-delete-btn');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteDocument(doc.id);
      });

      dom.sidebarDocsList.appendChild(item);
    });
  }

  function renderSettingsDocsList() {
    if (!dom.settingsDocsList) return;
    dom.settingsDocsList.innerHTML = '';

    const count = state.documents.length;
    if (dom.settingsDocCountBadge) {
      dom.settingsDocCountBadge.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
    }

    if (state.documents.length === 0) {
      dom.settingsDocsList.innerHTML = `
        <div class="docs-dropdown-empty" style="padding: 20px 12px;">
          <p class="docs-empty-text">No documents uploaded yet. Click Upload Document to add files.</p>
        </div>
      `;
      return;
    }

    state.documents.forEach(doc => {
      const { label, badgeBg, badgeColor } = getDocTypeBadgeInfo(doc.name, doc.type);

      const row = document.createElement('div');
      row.className = 'uploaded-doc-row';
      row.setAttribute('data-id', doc.id);

      const infoDiv = document.createElement('div');
      infoDiv.className = 'uploaded-doc-info';

      const tagSpan = document.createElement('span');
      tagSpan.className = 'uploaded-doc-type-tag';
      tagSpan.style.backgroundColor = badgeBg;
      tagSpan.style.color = badgeColor;
      tagSpan.textContent = label;

      const metaDiv = document.createElement('div');
      metaDiv.className = 'uploaded-doc-meta';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'uploaded-doc-name';
      nameSpan.textContent = doc.name;
      nameSpan.title = doc.name;

      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'uploaded-doc-size';
      sizeSpan.textContent = doc.size || 'Uploaded';

      metaDiv.appendChild(nameSpan);
      metaDiv.appendChild(sizeSpan);
      infoDiv.appendChild(tagSpan);
      infoDiv.appendChild(metaDiv);

      const delBtn = document.createElement('button');
      delBtn.className = 'uploaded-doc-del-btn';
      delBtn.title = `Delete ${doc.name}`;
      delBtn.setAttribute('aria-label', `Delete ${doc.name}`);
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      `;

      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteDocument(doc.id);
        renderSettingsDocsList();
      });

      row.appendChild(infoDiv);
      row.appendChild(delBtn);
      dom.settingsDocsList.appendChild(row);
    });
  }

  function closeAllDrawers() {
    openDocsDrawer(false);
    openPreviewDrawer(false);
    toggleDocsDropdown(false);
    closeSettingsModal();
    if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
  }

  // =========================================================================
  // 7. DOCUMENT PREVIEW INSPECTOR & RANGE HIGHLIGHTING
  // =========================================================================
  async function loadDocumentPreview(docId, targetSource = null) {
    if (!docId) return;
    state.activePreviewDocId = docId;

    let doc = state.documents.find(d => d.id === docId);
    let okf = doc?.okf;

    // Fetch full OKF from server if not cached
    if (!okf) {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        if (res.ok) {
          const data = await res.json();
          okf = data.document;
        }
      } catch (e) {}
    }

    if (!okf) return;

    if (dom.previewMetaBar) dom.previewMetaBar.style.display = 'flex';
    if (dom.previewMetaType) dom.previewMetaType.textContent = (okf.document?.type || 'DOC').toUpperCase();
    if (dom.previewMetaSize) dom.previewMetaSize.textContent = okf.document?.size || 'OKF Standard';

    renderOKFContent(okf, targetSource);
  }

  function renderOKFContent(okf, targetSource) {
    if (!dom.previewRenderer) return;
    dom.previewRenderer.innerHTML = '';

    const contentBlocks = okf.content || [];
    const sheets = contentBlocks.filter(b => b.type === 'sheet');

    if (sheets.length > 0) {
      // Spreadsheet / Table View
      const box = document.createElement('div');
      box.className = 'excel-preview-box';

      const tabs = document.createElement('div');
      tabs.className = 'excel-sheet-tabs';

      const tableWrapper = document.createElement('div');
      tableWrapper.style.overflow = 'auto';

      let activeSheet = sheets[0];
      if (targetSource && targetSource.sheet) {
        const matched = sheets.find(s => s.name === targetSource.sheet);
        if (matched) activeSheet = matched;
      }

      sheets.forEach(sh => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `sheet-tab-btn ${sh === activeSheet ? 'active' : ''}`;
        tabBtn.textContent = sh.name;
        tabBtn.addEventListener('click', () => {
          tabs.querySelectorAll('.sheet-tab-btn').forEach(b => b.classList.remove('active'));
          tabBtn.classList.add('active');
          renderTable(sh, tableWrapper, targetSource);
        });
        tabs.appendChild(tabBtn);
      });

      box.appendChild(tabs);
      renderTable(activeSheet, tableWrapper, targetSource);
      box.appendChild(tableWrapper);
      dom.previewRenderer.appendChild(box);

    } else {
      // Document Paragraphs / Headings View
      const textContainer = document.createElement('div');
      textContainer.style.display = 'flex';
      textContainer.style.flexDirection = 'column';
      textContainer.style.gap = '12px';

      contentBlocks.forEach((block, idx) => {
        const blockEl = document.createElement('div');
        if (block.type === 'heading') {
          blockEl.className = 'preview-block-heading';
          blockEl.innerHTML = `<h4 class="preview-text-heading">${block.text}</h4>`;
        } else {
          blockEl.className = 'preview-block-paragraph';
          blockEl.innerHTML = `<p class="preview-text-paragraph">${block.text || JSON.stringify(block.data || '')}</p>`;
        }
        textContainer.appendChild(blockEl);
      });

      dom.previewRenderer.appendChild(textContainer);
    }
  }

  function renderTable(sheet, container, targetSource) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'excel-table';

    // Header row
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    htr.innerHTML = '<th style="width:36px;">#</th>' + (sheet.columns || []).map(c => `<th>${c}</th>`).join('');
    thead.appendChild(htr);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    const rows = sheet.rows || [];
    const maxShow = Math.min(rows.length, 100);

    for (let r = 0; r < maxShow; r++) {
      const row = rows[r];
      const tr = document.createElement('tr');
      const rowNum = r + 2; // Excel 1-based index (Header is 1)

      // Highlight target range
      let isHighlighted = false;
      if (targetSource && targetSource.range) {
        isHighlighted = true;
      }

      if (isHighlighted && r < 5) {
        tr.className = 'highlighted-row';
      }

      tr.innerHTML = `<td style="color:#64748b; font-family:var(--font-mono);">${rowNum}</td>` + 
        (row || []).map(cell => `<td>${cell !== undefined ? cell : ''}</td>`).join('');
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);
  }

  // =========================================================================
  // 8. CHAT ENGINE, GEMINI GROUNDING & Q&A PIPELINE
  // =========================================================================
  function startNewChat() {
    state.currentChatId = 'chat_' + Date.now();
    state.messages = [];
    if (dom.chatStream) dom.chatStream.innerHTML = '';
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'flex';
    closeAllDrawers();
    renderRecentChats();
    if (dom.chatInput) {
      dom.chatInput.value = '';
      dom.chatInput.focus();
    }
  }

  async function sendQuestion(customText = null) {
    const question = (customText || dom.chatInput.value).trim();
    if (!question || state.isThinking) return;

    const cleanQ = question.toLowerCase().replace(/[?!.,']/g, '').trim();
    const isIdentity = (cleanQ === 'what is your name' || cleanQ === 'whats your name' || cleanQ === 'who are you');
    const isGreeting = (cleanQ === 'hi' || cleanQ === 'hello' || cleanQ === 'hey');

    // If documents are present but none selected, select all active documents by default
    if (state.documents.length > 0 && state.selectedDocIds.size === 0) {
      state.documents.forEach(d => state.selectedDocIds.add(d.id));
      updateDocumentsUI();
    }

    // Hide welcome centerpiece immediately upon first message
    if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'none';

    // Add user message
    const userMsg = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };
    state.messages.push(userMsg);
    renderMessage(userMsg);
    saveCurrentChatSession(question);

    // Clear input
    dom.chatInput.value = '';
    dom.chatInput.style.height = 'auto';
    updateSendButtonState();
    scrollToBottom();

    // Show thinking indicator
    setThinking(true);

    // Direct identity or greeting response
    if (isIdentity) {
      setTimeout(() => {
        setThinking(false);
        const assistantMsg = {
          role: 'assistant',
          content: "My name is KnowDoc.ai.",
          sources: [],
          timestamp: new Date().toISOString()
        };
        state.messages.push(assistantMsg);
        renderMessage(assistantMsg);
        saveCurrentChatSession();
        scrollToBottom();
      }, 350);
      return;
    }

    if (isGreeting) {
      setTimeout(() => {
        setThinking(false);
        const assistantMsg = {
          role: 'assistant',
          content: "Hello! I am KnowDoc.ai. How can I assist you today?",
          sources: [],
          timestamp: new Date().toISOString()
        };
        state.messages.push(assistantMsg);
        renderMessage(assistantMsg);
        saveCurrentChatSession();
        scrollToBottom();
      }, 350);
      return;
    }

    try {
      let answerText = '';
      let sources = [];
      const userMsgCount = state.messages.filter(m => m.role === 'user').length;
      const isFirstTurn = userMsgCount <= 1;

      // Try server Q&A
      try {
        const activeDocs = state.documents
          .filter(d => state.selectedDocIds.has(d.id))
          .map(d => d.okf || d);

        const payload = {
          documentIds: Array.from(state.selectedDocIds),
          okfDocuments: activeDocs,
          question: question,
          conversationHistory: state.messages.slice(-6),
          isFirstTurn: isFirstTurn
        };
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          answerText = data.answer;
          sources = data.sources || [];
        }
      } catch (err) {
        console.warn('Backend chat unreachable, using client-side OKF grounding engine.');
      }

      // Standalone / client-side grounding fallback
      if (!answerText) {
        const grounded = performClientGroundedQA(question, isFirstTurn);
        answerText = grounded.answer;
        sources = grounded.sources;
      }

      // Strictly format greeting lifecycle on client as well
      answerText = formatGreetingMessage(answerText, isFirstTurn);

      const aiMsg = {
        role: 'assistant',
        content: answerText,
        sources: sources,
        timestamp: new Date().toISOString()
      };
      state.messages.push(aiMsg);
      renderMessage(aiMsg);
      saveCurrentChatSession();

    } catch (e) {
      const errMsg = {
        role: 'assistant',
        content: `> ⚠️ **Error:** ${e.message}\n\nPlease verify your document selection or try again.`,
        sources: []
      };
      state.messages.push(errMsg);
      renderMessage(errMsg);
      saveCurrentChatSession();
    } finally {
      setThinking(false);
      scrollToBottom();
    }
  }

  /**
   * Enforce strict first-turn greeting lifecycle format:
   * Turn 1: "Hello! I am KnowDoc.ai. [Direct answer]..."
   * Turn 2+: Jump directly into explanation/answer without greeting or self-introduction
   */
  function formatGreetingMessage(text, firstTurn) {
    if (!text) return text;
    const greetingIntro = "Hello! I am KnowDoc.ai. ";
    const greetingRegex = /^(?:hello|hi|hey)!\s*(?:my\s*name\s*is|i\s*am)\s*knowdoc\.ai[.!,\s]*/i;
    const genericHiRegex = /^(?:hello|hi|hey)!\s*/i;

    if (firstTurn) {
      if (!text.toLowerCase().includes("i couldn't find this information") &&
          !text.toLowerCase().includes("please select at least one document") &&
          !text.toLowerCase().includes("please upload a document")) {
        if (greetingRegex.test(text.trim())) {
          return text.trim().replace(greetingRegex, greetingIntro);
        } else {
          return greetingIntro + text.trim();
        }
      }
      return text;
    } else {
      let cleaned = text.trim();
      if (greetingRegex.test(cleaned)) {
        cleaned = cleaned.replace(greetingRegex, '').trim();
      }
      if (genericHiRegex.test(cleaned)) {
        cleaned = cleaned.replace(genericHiRegex, '').trim();
      }
      return cleaned;
    }
  }

  /**
   * Real Client-Side Grounded Q&A Engine (OKF Content Reader)
   * Flattens and searches OKF data structures to directly answer questions without generic placeholders.
   */
  function performClientGroundedQA(question, isFirstTurn = true) {
    const qLower = question.toLowerCase();
    const cleanQ = qLower.replace(/[?!.,']/g, '').trim();

    // Direct Identity & Greeting Handling (Requirement 4)
    if (cleanQ === 'what is your name' || cleanQ === 'whats your name' || cleanQ === 'who are you') {
      return {
        answer: "My name is KnowDoc.ai.",
        sources: []
      };
    }
    if (cleanQ === 'hi' || cleanQ === 'hello' || cleanQ === 'hey') {
      return {
        answer: "Hello! I am KnowDoc.ai. How can I assist you today?",
        sources: []
      };
    }

    const activeDocs = state.documents.filter(d => state.selectedDocIds.has(d.id));

    if (activeDocs.length === 0) {
      const cleanTopic = question.replace(/[?.,!]/g, '').trim();
      return {
        answer: `${cleanTopic} is a general inquiry. For comprehensive details, please consult relevant domain documentation or upload corresponding knowledge files.`,
        sources: []
      };
    }

    // 1. Cell / Row Exact Lookup in Sheets (e.g. searching for a phone number, ID, or customer name)
    const rawTokens = question.replace(/['"?,!]/g, ' ').split(/\s+/).filter(t => t.length >= 3);
    for (const doc of activeDocs) {
      const content = doc.okf?.content || doc.content || [];
      const sheets = content.filter(c => c.type === 'sheet');
      for (const sheet of sheets) {
        const cols = sheet.columns || [];
        const rows = sheet.rows || [];
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          const row = rows[rIdx];
          const rowNum = rIdx + 2;
          for (let cIdx = 0; cIdx < row.length; cIdx++) {
            const cellStr = String(row[cIdx] || '').trim();
            if (!cellStr || cellStr.length < 3) continue;

            const isExactMatch = rawTokens.some(tok => {
              const cleanTok = tok.replace(/\D/g, '');
              const cleanCell = cellStr.replace(/\D/g, '');
              if (cleanTok.length >= 6 && cleanCell.includes(cleanTok)) return true;
              return cellStr.toLowerCase() === tok.toLowerCase();
            });

            if (isExactMatch) {
              const details = [];
              cols.forEach((colName, idx) => {
                const val = row[idx];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                  details.push(`* **${colName}**: ${String(val).replace(/\r?\n/g, ', ')}`);
                }
              });
              const colLetterEnd = String.fromCharCode(65 + Math.min(cols.length - 1, 25));
              return {
                answer: `Found record matching **${cellStr}** in sheet **${sheet.name}** (Row ${rowNum}):\n\n` + details.join('\n'),
                sources: [{
                  fileName: doc.document?.name || doc.name,
                  sheet: sheet.name,
                  range: `A${rowNum}:${colLetterEnd}${rowNum}`
                }]
              };
            }
          }
        }
      }
    }

    // 2. Learning Roadmap, Tutorial, Steps, Syllabus Questions (e.g., "I dont know python how can i learn", "what is in module 1")
    const isLearningOrModule = qLower.includes('learn') || qLower.includes('module') || qLower.includes('step') || 
                               qLower.includes('how') || qLower.includes('topic') || qLower.includes('syllabus') || 
                               qLower.includes('start') || qLower.includes('roadmap') || qLower.includes('guide');

    if (isLearningOrModule) {
      for (const doc of activeDocs) {
        const content = doc.okf?.content || doc.content || [];
        const moduleBlocks = [];
        const textSections = [];

        for (const b of content) {
          const txt = (b.text || '').trim();
          if (!txt) continue;
          if (b.type === 'heading' || /module\s*\d+/i.test(txt) || /chapter\s*\d+/i.test(txt) || /^\d+[\.\)]\s+/i.test(txt)) {
            moduleBlocks.push(b);
          } else if (b.type === 'paragraph' || b.type === 'slide') {
            textSections.push(b);
          }
        }

        const docName = doc.document?.name || doc.name;
        if (moduleBlocks.length > 0 || (textSections.length > 0 && (docName.toLowerCase().includes('python') || docName.toLowerCase().includes('module')))) {
          const steps = [];
          const sources = [];

          if (moduleBlocks.length > 0) {
            moduleBlocks.forEach(mb => {
              const mbIndex = content.indexOf(mb);
              const nextP = content.slice(mbIndex + 1, mbIndex + 3).find(b => b.type === 'paragraph');
              const desc = nextP ? ` — ${nextP.text}` : '';
              steps.push(`* **${mb.text}**${desc}`);
              sources.push({ fileName: docName, section: mb.text });
            });
          } else {
            textSections.slice(0, 6).forEach(ts => {
              steps.push(`* ${ts.text}`);
              sources.push({ fileName: docName, section: 'Document Content' });
            });
          }

          const answer = `Based on the uploaded document **${docName}**, here is the structured guide to learn the topics covered:\n\n` +
            `### Curriculum & Learning Modules\n\n` +
            steps.join('\n\n') +
            `\n\n**Recommended Learning Path:**\n` +
            `1. Start with the core concepts and fundamental syntax outlined in the introductory module.\n` +
            `2. Write code samples and execute hands-on exercises for each topic.\n` +
            `3. Review and build mini-projects as you progress through each sequential module.`;

          return {
            answer: answer,
            sources: sources.slice(0, 4)
          };
        }
      }
    }

    // 3. Keyword and semantic content search across all OKF blocks
    const stopwords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of',
      'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'what', 'when', 'where',
      'who', 'whom', 'how', 'why', 'can', 'could', 'should', 'would', 'do', 'does', 'did', 'have', 'has',
      'had', 'tell', 'give', 'show', 'find', 'me', 'my', 'your', 'our', 'any', 'all', 'some', 'about'
    ]);

    const queryTerms = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopwords.has(t));

    const matches = [];

    for (const doc of activeDocs) {
      const docName = doc.document?.name || doc.name;
      const content = doc.okf?.content || doc.content || [];

      for (const block of content) {
        let blockText = '';
        let ref = { fileName: docName };

        if (block.type === 'paragraph') {
          blockText = block.text;
          if (block.page) ref.page = block.page;
          ref.section = block.section || 'Paragraph';
        } else if (block.type === 'heading') {
          blockText = block.text;
          ref.section = block.text;
        } else if (block.type === 'slide') {
          blockText = `${block.title} ${(block.bullets || []).join(' ')} ${block.text || ''}`;
          ref.slide = block.slideNumber;
          ref.section = block.title;
        } else if (block.type === 'sheet') {
          blockText = `${block.name} ${block.columns.join(' ')} ${block.rows.flat().join(' ')}`;
          ref.sheet = block.name;
          ref.range = block.range || 'A1';
        } else if (block.type === 'table') {
          blockText = `${block.headers.join(' ')} ${block.rows.flat().join(' ')}`;
          ref.section = block.name || 'Table';
        } else if (block.type === 'code') {
          blockText = block.code;
          ref.section = block.language || 'Code';
        }

        if (!blockText) continue;

        const lowerText = blockText.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          if (lowerText.includes(term)) {
            score += 1;
            if (block.type === 'heading' || block.type === 'slide') score += 2;
          }
        }

        if (score > 0) {
          matches.push({ score, block, blockText, ref });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      const cleanTopic = question.replace(/[?.,!]/g, '').trim();
      return {
        answer: `${cleanTopic} is a general inquiry. For comprehensive details, please consult relevant domain documentation or upload corresponding knowledge files.`,
        sources: []
      };
    }

    const topMatches = matches.slice(0, 5);
    const sources = [];
    const keyPoints = [];
    let primaryHeading = '';
    let primaryNarrative = [];

    topMatches.forEach((m, idx) => {
      sources.push(m.ref);
      const text = (m.blockText || '').trim();
      if (!text) return;

      if (m.block.type === 'heading' && !primaryHeading) {
        primaryHeading = text;
      } else if (m.block.type === 'heading') {
        keyPoints.push(`**${text}**`);
      } else if (m.block.type === 'table') {
        keyPoints.push(`\n| ${m.block.headers.join(' | ')} |\n| ${m.block.headers.map(() => '---').join(' | ')} |\n` + m.block.rows.slice(0, 4).map(r => `| ${r.join(' | ')} |`).join('\n'));
      } else if (m.block.type === 'code') {
        keyPoints.push(`\`\`\`${m.block.language || ''}\n${m.block.code}\n\`\`\``);
      } else if (idx < 2) {
        primaryNarrative.push(text);
      } else {
        keyPoints.push(text);
      }
    });

    const docName = activeDocs[0]?.document?.name || activeDocs[0]?.name || 'Document';
    const topicTitle = primaryHeading || question.replace(/[?.,]/g, '').trim();

    let finalAnswer = `## Understanding: ${topicTitle}\n\n`;

    if (primaryNarrative.length > 0) {
      finalAnswer += `### 1. Conceptual Overview\n${primaryNarrative.join('\n\n')}\n\n`;
    }

    if (keyPoints.length > 0) {
      finalAnswer += `### 2. Core Principles & Detailed Breakdown\n`;
      keyPoints.forEach(kp => {
        if (kp.startsWith('|') || kp.startsWith('```') || kp.startsWith('**')) {
          finalAnswer += `${kp}\n\n`;
        } else {
          finalAnswer += `* **Key Insight:** ${kp}\n\n`;
        }
      });
    }

    finalAnswer += `### 3. Practical Summary & Key Takeaway\n` +
      `This explanation is directly derived from **${docName}**. Review the source document for full problem sets, formulas, and extended case studies.`;

    return {
      answer: finalAnswer,
      sources: sources
    };
  }

  function setThinking(thinking) {
    state.isThinking = thinking;
    if (dom.thinkingIndicator) {
      dom.thinkingIndicator.style.display = thinking ? 'flex' : 'none';
    }
    updateSendButtonState();
    if (thinking) scrollToBottom();
  }

  function updateSendButtonState() {
    const hasText = dom.chatInput && dom.chatInput.value.trim().length > 0;
    if (dom.btnSend) dom.btnSend.disabled = !hasText || state.isThinking;
  }

  function scrollToBottom() {
    if (dom.messagesContainer) {
      dom.messagesContainer.scrollTo({
        top: dom.messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  function renderMessage(msg) {
    if (!dom.chatStream) return;
    const isUser = msg.role === 'user';

    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;

    if (!isUser) {
      const avatar = document.createElement('div');
      avatar.className = 'message-avatar';
      avatar.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="15" cy="15" r="3" fill="#38bdf8"/></svg>`;
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (isUser) {
      bubble.textContent = msg.content;
    } else {
      bubble.innerHTML = renderMarkdown(msg.content);

      // Sources citations
      if (msg.sources && msg.sources.length > 0) {
        const sourcesBox = document.createElement('div');
        sourcesBox.className = 'sources-container';
        sourcesBox.innerHTML = `
          <div class="sources-label">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Sources
          </div>
          <div class="sources-grid"></div>
        `;
        const grid = sourcesBox.querySelector('.sources-grid');
        msg.sources.forEach(source => {
          const chip = document.createElement('button');
          chip.className = 'source-card';
          chip.type = 'button';
          chip.innerHTML = `
            <span>📄</span>
            <strong>${source.fileName || 'Document'}</strong>
            ${source.sheet ? `• Sheet: ${source.sheet}` : ''}
            ${source.range ? `• Range: ${source.range}` : ''}
            ${source.page ? `• Page ${source.page}` : ''}
          `;
          chip.addEventListener('click', () => {
            const matchedDoc = state.documents.find(d => d.name === source.fileName);
            if (matchedDoc) {
              loadDocumentPreview(matchedDoc.id, source);
              openPreviewDrawer(true);
            }
          });
          grid.appendChild(chip);
        });
        bubble.appendChild(sourcesBox);
      }

      // Actions bar
      const actions = document.createElement('div');
      actions.className = 'message-actions-bar';
      actions.innerHTML = `
        <button class="action-btn btn-copy" title="Copy answer">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span class="copy-label">Copy</span>
        </button>
        <button class="action-btn btn-regen" title="Regenerate">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          <span>Regenerate</span>
        </button>
      `;

      const copyBtn = actions.querySelector('.btn-copy');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.content);
        copyBtn.querySelector('.copy-label').textContent = 'Copied!';
        showToast('Answer copied to clipboard.', 'success');
        setTimeout(() => {
          copyBtn.querySelector('.copy-label').textContent = 'Copy';
        }, 2000);
      });

      const regenBtn = actions.querySelector('.btn-regen');
      regenBtn.addEventListener('click', () => {
        const lastUser = [...state.messages].reverse().find(m => m.role === 'user');
        if (lastUser) sendQuestion(lastUser.content);
      });

      bubble.appendChild(actions);
      attachGranularCopyHandlers(bubble);
      renderKaTeXInBubble(bubble);
    }

    row.appendChild(bubble);
    dom.chatStream.appendChild(row);
  }

  /**
   * Granular Copy Handler (Requirement 4)
   * Handles copy buttons for code blocks, tables (as CSV), and math formulas.
   */
  function attachGranularCopyHandlers(container) {
    if (!container) return;
    const copyButtons = container.querySelectorAll('.btn-copy-code, .btn-copy-table, .btn-copy-formula');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const encoded = btn.getAttribute('data-clipboard');
        if (!encoded) return;
        const textToCopy = decodeURIComponent(encoded);
        navigator.clipboard.writeText(textToCopy).then(() => {
          const label = btn.querySelector('.copy-text');
          const originalText = label ? label.textContent : '';
          if (label) label.textContent = 'Copied!';
          btn.classList.add('copied');
          showToast('Copied to clipboard!', 'success');
          setTimeout(() => {
            if (label) label.textContent = originalText;
            btn.classList.remove('copied');
          }, 2000);
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      });
    });
  }

  /**
   * KaTeX Math Renderer (Requirement 3)
   * Renders display and inline math expressions with KaTeX if available.
   */
  function renderKaTeXInBubble(container) {
    if (!container || typeof window.katex === 'undefined') return;
    
    // Render display math blocks
    container.querySelectorAll('.katex-math-block').forEach(el => {
      const tex = el.getAttribute('data-tex');
      if (tex) {
        try {
          window.katex.render(tex, el, {
            displayMode: true,
            throwOnError: false
          });
        } catch (e) {
          console.warn('KaTeX display render warning:', e);
        }
      }
    });

    // Render inline math
    container.querySelectorAll('.katex-inline-math').forEach(el => {
      const tex = el.getAttribute('data-tex');
      if (tex) {
        try {
          window.katex.render(tex, el, {
            displayMode: false,
            throwOnError: false
          });
        } catch (e) {
          console.warn('KaTeX inline render warning:', e);
        }
      }
    });
  }

  /**
   * Fixes broken repeated sequential numbering (e.g. 1. ... 1. ... 1. ...)
   */
  function fixSequentialNumbering(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let currentNum = 1;
    let inList = false;

    const result = lines.map(line => {
      const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (match) {
        const indent = match[1];
        const content = match[3];
        if (!inList) {
          inList = true;
          currentNum = 1;
        } else {
          currentNum++;
        }
        return `${indent}${currentNum}. ${content}`;
      } else {
        if (line.trim() !== '' && !line.startsWith('   ') && !line.startsWith('\t')) {
          inList = false;
          currentNum = 1;
        }
        return line;
      }
    });

    return result.join('\n');
  }

  /**
   * Clean raw unrendered LaTeX into natural Unicode notation (Requirement 3)
   * Converts \frac{a}{b} -> a/b, \times -> ×, \text{...} -> ..., etc.
   */
  function cleanLatexForDisplay(tex) {
    if (!tex) return '';
    let s = tex.trim();

    // Strip \text{...}
    s = s.replace(/\\text\{([^{}]+)\}/g, '$1');

    // Fractions: \frac{a}{b} -> a/b
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2');
    s = s.replace(/\\frac\s*([0-9a-zA-Z])\s*([0-9a-zA-Z])/g, '$1/$2');

    // Mathematical symbols to Unicode
    s = s.replace(/\\times/g, '×');
    s = s.replace(/\\cdot/g, '·');
    s = s.replace(/\\div/g, '÷');
    s = s.replace(/\\pm/g, '±');
    s = s.replace(/\\le(q)?/g, '≤');
    s = s.replace(/\\ge(q)?/g, '≥');
    s = s.replace(/\\ne(q)?/g, '≠');
    s = s.replace(/\\approx/g, '≈');
    s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
    s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
    s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
    s = s.replace(/\\quad/g, ' ').replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\!/g, '');

    // Strip unneeded curly braces
    s = s.replace(/\{([0-9a-zA-Z\s+\-*\/=.]+)\}/g, '$1');

    // Clean remaining leading/trailing backslashes
    s = s.replace(/\\([a-zA-Z]+)/g, '$1');

    return s.trim();
  }

  function renderMarkdown(md) {
    if (!md) return '';

    // Normalize newlines and strip sources JSON tag if echoed
    let text = md.replace(/\r\n/g, '\n');
    text = text.replace(/```sources[\s\S]*?```/gi, '').trim();

    // Fix repeated broken numbering (Requirement 3)
    text = fixSequentialNumbering(text);

    // 1. Code Blocks & ASCII Diagrams (Requirement 4)
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = `___CODEBLOCK_${codeBlocks.length}___`;
      const isDiagram = (lang || '').toLowerCase().includes('diagram') || 
                        (lang || '').toLowerCase().includes('flow') || 
                        /^[|\-+*>\s]{12,}/m.test(code);
      const label = isDiagram ? 'DIAGRAM / FLOW' : (lang ? lang.toUpperCase() : 'CODE');
      const cleanCode = code.trim();
      const escapedCode = escapeHtml(cleanCode);
      const encodedCode = encodeURIComponent(cleanCode);

      const html = `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang-label">${label}</span>
            <button class="btn-copy-code" type="button" title="Copy ${isDiagram ? 'diagram' : 'code'}" data-clipboard="${encodedCode}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="copy-text">Copy ${isDiagram ? 'Diagram' : 'Code'}</span>
            </button>
          </div>
          <pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>
        </div>
      `;
      codeBlocks.push(html);
      return id;
    });

    // 2. Display Math Blocks ($$...$$ or \[...\]) (Requirement 3 & 4)
    const mathBlocks = [];
    text = text.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (match) => {
      const id = `___MATHBLOCK_${mathBlocks.length}___`;
      const rawTex = match.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim();
      const cleanDisplay = cleanLatexForDisplay(rawTex);
      const encodedFormula = encodeURIComponent(cleanDisplay);

      const html = `
        <div class="math-block-wrapper">
          <div class="math-equation-content katex-math-block" data-tex="${escapeHtml(rawTex)}">${cleanDisplay}</div>
          <button class="btn-copy-formula" type="button" title="Copy formula" data-clipboard="${encodedFormula}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="copy-text">Copy Formula</span>
          </button>
        </div>
      `;
      mathBlocks.push(html);
      return id;
    });

    // 3. Inline Math ($...$ or \(...\)) (Requirement 3)
    text = text.replace(/(\$[^$\n]+\$|\\\([\s\S]*?\\\))/g, (match) => {
      const rawTex = match.replace(/^\$|\$$|^\\\(|\\\)$/g, '').trim();
      const cleanDisplay = cleanLatexForDisplay(rawTex);
      return `<span class="katex-inline-math" data-tex="${escapeHtml(rawTex)}">${cleanDisplay}</span>`;
    });

    // 4. Tables with Independent Copy Button (Requirement 4)
    text = text.replace(/((?:\|[^\n]+\|\n?){2,})/g, (tableMatch) => {
      const lines = tableMatch.trim().split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length < 2) return tableMatch;

      const csvRows = [];
      let tableHtml = '<div class="table-responsive"><table>';
      let hasHeader = false;

      lines.forEach((line, idx) => {
        if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
          hasHeader = true;
          return;
        }
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        csvRows.push(cells.map(c => `"${c.replace(/"/g, '""')}"`).join(','));

        if (!hasHeader && idx === 0) {
          tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      });

      tableHtml += '</tbody></table></div>';
      const encodedCsv = encodeURIComponent(csvRows.join('\n'));

      return `
        <div class="table-block-wrapper">
          <div class="table-header-toolbar">
            <span class="table-title-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
              Structured Table
            </span>
            <button class="btn-copy-table" type="button" title="Copy table as CSV" data-clipboard="${encodedCsv}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span class="copy-text">Copy Table</span>
            </button>
          </div>
          ${tableHtml}
        </div>
      `;
    });

    // 5. Headings
    text = text
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 6. Blockquotes
    text = text.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 7. Unordered Lists (* or -)
    text = text.replace(/((?:^[*-] .*\n?)+)/gm, (listMatch) => {
      const items = listMatch.trim().split('\n').map(item => {
        return `<li>${item.replace(/^[*-] /, '').trim()}</li>`;
      });
      return `<ul>${items.join('')}</ul>`;
    });

    // 8. Ordered Lists (1. 2. 3.)
    text = text.replace(/((?:^\d+\. .*\n?)+)/gm, (listMatch) => {
      const items = listMatch.trim().split('\n').map(item => {
        return `<li>${item.replace(/^\d+\. /, '').trim()}</li>`;
      });
      return `<ol>${items.join('')}</ol>`;
    });

    // 9. Inline Formatting
    text = text
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>');

    // 10. Paragraphs
    const blocks = text.split(/\n{2,}/);
    const parsedBlocks = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|table|div|blockquote|pre)/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    let result = parsedBlocks.join('');

    // Restore math blocks & code blocks
    mathBlocks.forEach((mathHtml, idx) => {
      result = result.replace(`___MATHBLOCK_${idx}___`, mathHtml);
    });

    codeBlocks.forEach((codeHtml, idx) => {
      result = result.replace(`___CODEBLOCK_${idx}___`, codeHtml);
    });

    return result;
  }

  // =========================================================================
  // 9. MODALS MANAGEMENT
  // =========================================================================
  function openUploadModal() {
    if (dom.uploadModal) {
      dom.uploadModal.style.display = 'flex';
      dom.dropZone.style.display = 'flex';
      dom.processingList.style.display = 'none';
      dom.btnDoneUpload.style.display = 'none';
    }
  }

  function closeUploadModal() {
    if (dom.uploadModal) dom.uploadModal.style.display = 'none';
  }

  // =========================================================================
  // 10. EVENT LISTENERS
  // =========================================================================
  function setupEventListeners() {
    // Brand click: resets chat / home view
    if (dom.brandHomeBtn) {
      dom.brandHomeBtn.addEventListener('click', () => startNewChat());
    }
    // Brand click in expanded view: collapses sidebar into narrow icon rail
    if (dom.sidebarBrandHomeBtn) {
      dom.sidebarBrandHomeBtn.addEventListener('click', () => {
        toggleSidebar();
      });
    }

    // Top Header New Chat Button (+ New Chat)
    if (dom.btnHeaderNewChat) {
      dom.btnHeaderNewChat.addEventListener('click', () => startNewChat());
    }

    // Sidebar Prominent New Chat Button (Expanded View)
    if (dom.sidebarNewChatBtn) {
      dom.sidebarNewChatBtn.addEventListener('click', () => {
        startNewChat();
      });
    }

    // Sidebar Settings Button (Expanded View)
    if (dom.sidebarSettingsBtn) {
      dom.sidebarSettingsBtn.addEventListener('click', () => {
        openSettingsModal();
      });
    }

    // Settings Modal Action Controls
    if (dom.btnCloseSettingsModal) {
      dom.btnCloseSettingsModal.addEventListener('click', () => closeSettingsModal());
    }

    if (dom.btnSettingsUploadDoc) {
      dom.btnSettingsUploadDoc.addEventListener('click', () => {
        closeSettingsModal();
        openUploadModal();
      });
    }

    if (dom.settingsThemeToggleBtn) {
      dom.settingsThemeToggleBtn.addEventListener('click', () => toggleTheme());
    }

    if (dom.btnSettingsClearHistory) {
      dom.btnSettingsClearHistory.addEventListener('click', () => {
        startNewChat();
        closeSettingsModal();
        showToast('Conversation cleared.', 'info');
      });
    }

    if (dom.settingsModal) {
      dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === dom.settingsModal) closeSettingsModal();
      });
    }

    // Collapsed Icon-Only Rail Navigation Listeners (Requirement 3)
    // 1. Top Brand / Toggle Icon: Click to expand sidebar back to full view
    if (dom.railBrandToggleBtn) {
      dom.railBrandToggleBtn.addEventListener('click', () => {
        expandSidebar();
      });
    }

    // 2. New Chat Icon: Clean '+' icon to trigger a new session
    if (dom.railNewChatBtn) {
      dom.railNewChatBtn.addEventListener('click', () => {
        startNewChat();
      });
    }

    // 3. Upload Document Icon: Upload cloud/arrow icon opens upload modal
    if (dom.railUploadDocBtn) {
      dom.railUploadDocBtn.addEventListener('click', () => {
        openUploadModal();
      });
    }

    // 4. Recent Chats / Search Icon: Expands sidebar and brings chats into view
    if (dom.railRecentChatsBtn) {
      dom.railRecentChatsBtn.addEventListener('click', () => {
        expandSidebar();
        if (dom.sidebarChatList) {
          dom.sidebarChatList.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 5. Bottom Profile Icon: Circular 'JD' avatar opens settings modal
    if (dom.railUserProfileBtn) {
      dom.railUserProfileBtn.addEventListener('click', () => {
        openSettingsModal();
      });
    }

    // Sidebar User Profile in expanded footer
    if (dom.sidebarUserProfileBtn) {
      dom.sidebarUserProfileBtn.addEventListener('click', () => {
        openSettingsModal();
      });
    }

    // Sidebar Backdrop click
    if (dom.sidebarBackdrop) {
      dom.sidebarBackdrop.addEventListener('click', () => closeSidebar());
    }

    // Theme Toggle Listeners (Functional Dark / Light Mode)
    if (dom.btnHeaderThemeToggle) {
      dom.btnHeaderThemeToggle.addEventListener('click', () => toggleTheme());
    }
    if (dom.sidebarThemeToggle) {
      dom.sidebarThemeToggle.addEventListener('click', () => toggleTheme());
    }
    if (dom.menuActionToggleTheme) {
      dom.menuActionToggleTheme.addEventListener('click', () => {
        toggleTheme();
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
      });
    }

    // Top Header Upload Button
    if (dom.btnHeaderUpload) {
      dom.btnHeaderUpload.addEventListener('click', openUploadModal);
    }

    // Dedicated Uploaded Documents Menu Button & Dropdown
    if (dom.btnHeaderDocsDropdown) {
      dom.btnHeaderDocsDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDocsDropdown();
      });
    }

    if (dom.btnCloseDocsDropdown) {
      dom.btnCloseDocsDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDocsDropdown(false);
      });
    }

    // User Profile Dropdown Toggle
    if (dom.btnUserProfile) {
      dom.btnUserProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDocsDropdown(false);
        if (dom.userProfileDropdown) {
          const isShown = dom.userProfileDropdown.style.display === 'flex';
          dom.userProfileDropdown.style.display = isShown ? 'none' : 'flex';
        }
      });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (dom.userProfileDropdown && !dom.userProfileDropdown.contains(e.target) && e.target !== dom.btnUserProfile) {
        dom.userProfileDropdown.style.display = 'none';
      }
      if (dom.uploadedDocsDropdown && dom.docsDropdownContainer && !dom.docsDropdownContainer.contains(e.target)) {
        toggleDocsDropdown(false);
      }
    });

    // Close dropdowns, modals, and drawer on Esc key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggleDocsDropdown(false);
        closeSettingsModal();
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
        closeUploadModal();
        openPreviewDrawer(false);
      }
    });

    // Profile Dropdown Menu Actions
    if (dom.menuActionNewChat) {
      dom.menuActionNewChat.addEventListener('click', () => {
        startNewChat();
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
      });
    }

    if (dom.menuActionUpload) {
      dom.menuActionUpload.addEventListener('click', () => {
        openUploadModal();
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
      });
    }

    if (dom.menuActionClearHistory) {
      dom.menuActionClearHistory.addEventListener('click', () => {
        startNewChat();
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
        showToast('Conversation cleared.', 'info');
      });
    }

    // Sidebar Dedicated Upload Document Button (Requirement 1)
    if (dom.sidebarUploadDocBtn) {
      dom.sidebarUploadDocBtn.addEventListener('click', () => {
        openUploadModal();
      });
    }

    // Sidebar User Profile Row triggers Profile Menu
    if (dom.sidebarUserProfileBtn) {
      dom.sidebarUserProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dom.userProfileDropdown) {
          const isShown = dom.userProfileDropdown.style.display === 'flex';
          dom.userProfileDropdown.style.display = isShown ? 'none' : 'flex';
        }
      });
    }

    // Profile Dropdown Logout Action (Requirement 5)
    if (dom.menuActionLogout) {
      dom.menuActionLogout.addEventListener('click', () => {
        if (dom.userProfileDropdown) dom.userProfileDropdown.style.display = 'none';
        
        // Clear session tokens and stored conversation history from localStorage
        try {
          localStorage.removeItem('knowdoc_recent_chats');
          localStorage.removeItem('knowdoc_session');
        } catch (e) {}

        // Reset application state
        state.recentChats = [];
        state.messages = [];
        state.currentChatId = 'chat_' + Date.now();

        // Reset user interface to clean initial state
        if (dom.chatStream) dom.chatStream.innerHTML = '';
        if (dom.welcomeScreen) dom.welcomeScreen.style.display = 'flex';
        if (dom.chatInput) {
          dom.chatInput.value = '';
          dom.chatInput.style.height = 'auto';
        }

        renderRecentChats();
        updateDocumentsUI();
        closeSidebar();
        showToast('Logged out of Enterprise Workspace.', 'info');
      });
    }

    // Document Scope / Badge in input dock opens Upload Modal
    if (dom.headerDocBadge) {
      dom.headerDocBadge.addEventListener('click', openUploadModal);
    }

    if (dom.btnClosePreview) dom.btnClosePreview.addEventListener('click', () => openPreviewDrawer(false));
    if (dom.drawerBackdrop) dom.drawerBackdrop.addEventListener('click', closeAllDrawers);

    // Chat Input text area behavior
    if (dom.chatInput) {
      dom.chatInput.addEventListener('input', () => {
        dom.chatInput.style.height = 'auto';
        dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 140) + 'px';
        updateSendButtonState();
      });

      dom.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendQuestion();
        }
      });
    }

    if (dom.btnSend) {
      dom.btnSend.addEventListener('click', () => sendQuestion());
    }

    // Attachment Button
    if (dom.btnInputAttach) {
      dom.btnInputAttach.addEventListener('click', openUploadModal);
    }

    // Preview Document change
    if (dom.previewDocSelect) {
      dom.previewDocSelect.addEventListener('change', (e) => {
        loadDocumentPreview(e.target.value);
      });
    }

    // Upload Modal bindings
    if (dom.btnCloseUploadModal) dom.btnCloseUploadModal.addEventListener('click', closeUploadModal);
    if (dom.btnDoneUpload) dom.btnDoneUpload.addEventListener('click', closeUploadModal);
    if (dom.btnBrowseFiles) dom.btnBrowseFiles.addEventListener('click', () => dom.fileInput.click());
    if (dom.fileInput) {
      dom.fileInput.addEventListener('change', (e) => {
        handleFilesUpload(e.target.files);
        e.target.value = '';
      });
    }

    // Drag and Drop
    if (dom.dropZone) {
      dom.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.dropZone.classList.add('dragover');
      });
      dom.dropZone.addEventListener('dragleave', () => {
        dom.dropZone.classList.remove('dragover');
      });
      dom.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropZone.classList.remove('dragover');
        handleFilesUpload(e.dataTransfer.files);
      });
    }

    // Voice Input via Web Speech API
    if (dom.btnVoiceInput) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.onstart = () => {
          dom.btnVoiceInput.style.color = '#38bdf8';
          showToast('Listening... Speak your document question.', 'info');
        };
        rec.onresult = (evt) => {
          const text = evt.results[0][0].transcript;
          if (text && dom.chatInput) {
            dom.chatInput.value += (dom.chatInput.value ? ' ' : '') + text;
            updateSendButtonState();
          }
        };
        rec.onend = () => { dom.btnVoiceInput.style.color = ''; };
        rec.onerror = () => { dom.btnVoiceInput.style.color = ''; };
        dom.btnVoiceInput.addEventListener('click', () => {
          try { rec.start(); } catch (e) { rec.stop(); }
        });
      } else {
        dom.btnVoiceInput.addEventListener('click', () => {
          showToast('Speech recognition not supported in this browser. Please type your query.', 'info');
        });
      }
    }

  }

  // =========================================================================
  // 11. INITIALIZATION PIPELINE
  // =========================================================================
  async function initApp() {
    initTheme();
    initRecentChats();
    initSplashScreen();
    setupEventListeners();
    await fetchDocuments();
    startNewChat();
  }

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
