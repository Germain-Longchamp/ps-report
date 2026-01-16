/**
 * PSReportApp v6.2 - Scrollbar & Final Tweaks
 */
const PSReportApp = (function() {

    const STORAGE_KEY = 'ps_report_saas_data'; 
    const SETTINGS_KEY = 'ps_report_settings';

    // STRICT LIST OF IMAGE AUDIT IDs
    const IMAGE_AUDIT_IDS = [
        'properly-size-images',
        'uses-optimized-images', 
        'modern-image-formats',
        'uses-webp-images',
        'uses-responsive-images',
        'offscreen-images',
        'efficient-animated-content',
        'unsized-images',
        'preload-lcp-image',
        'image-delivery-insight'
    ];

    let dom = {};

    let state = {
        folders: [{ id: 1, name: 'Général', rootUrl: null, status: 'unknown', siteMetrics: null, urls: [] }],
        activeFolderId: 'dashboard',
        notifications: [],
        pendingAction: null
    };

    let settings = { apiKey: '' };

    function init() {
        console.log("PSReportApp: Initialisation...");

        if (typeof M === 'undefined') {
            console.error("PSReportApp: Materialize JS non chargé !");
            return;
        }

        dom = {
            navDashboard: document.getElementById('nav-dashboard'),
            navNotifications: document.getElementById('nav-notifications'),
            notifBadge: document.getElementById('notif-badge'),
            
            folderList: document.getElementById('folder-list'),
            
            pageTitle: document.getElementById('page-title'),
            visitSiteBtn: document.getElementById('visit-site-btn'), 

            deleteFolderBtn: document.getElementById('delete-folder-btn'),
            editFolderBtn: document.getElementById('edit-folder-btn'),
            
            analyzeAllBtn: document.getElementById('analyze-all-btn'), 

            clearNotifsBtn: document.getElementById('clear-notifs-btn'),

            viewDashboard: document.getElementById('view-dashboard'),
            viewFolder: document.getElementById('view-folder'),
            viewNotifications: document.getElementById('view-notifications'),
            
            // Site General Block Elements
            siteGeneralBlock: document.getElementById('site-general-block'),
            siteLastCheck: document.getElementById('site-last-check'),
            siteScreenshot: document.getElementById('site-screenshot'),
            siteScreenshotPlaceholder: document.getElementById('site-screenshot-placeholder'),
            gmStatusCode: document.getElementById('gm-status-code'),
            gmHttps: document.getElementById('gm-https'),
            gmCrawling: document.getElementById('gm-crawling'),
            
            notificationList: document.getElementById('notification-list'),
            emptyNotifs: document.getElementById('empty-notifs'),
            
            systemsListContainer: document.getElementById('systems-list-container'),
            refreshSystemsBtn: document.getElementById('refresh-systems-btn'),
            noSitesMsg: document.getElementById('no-sites-msg'),

            statTotal: document.getElementById('stat-total-urls'),
            statAnalyzed: document.getElementById('stat-analyzed'),
            statImprovements: document.getElementById('stat-improvements'),
            statAlerts: document.getElementById('stat-alerts'),
            statOffline: document.getElementById('stat-offline'), 

            alertsList: document.getElementById('alerts-list'), // KEEP null safe in usage
            noAlertsMsg: document.getElementById('no-alerts-msg'),
            improvementsList: document.getElementById('improvements-list'), // KEEP null safe in usage
            noImprovementsMsg: document.getElementById('no-improvements-msg'),
            
            offlineSection: document.getElementById('offline-section'), 
            offlineList: document.getElementById('offline-list'), 
            
            // Removed: nameInput, urlInput, addUrlBtn references
            urlList: document.getElementById('url-list'),
            emptyState: document.getElementById('empty-state'),

            apiKeyInput: document.getElementById('api-key-input'),
            saveKeyBtn: document.getElementById('save-api-key'),

            editFolderNameInput: document.getElementById('edit-folder-name-input'),
            editFolderRootInput: document.getElementById('edit-folder-root-input'), 
            saveFolderNameBtn: document.getElementById('save-folder-name-btn'),
            editUrlNameInput: document.getElementById('edit-url-name-input'),
            editUrlIdHidden: document.getElementById('edit-url-id-hidden'),
            saveUrlEditBtn: document.getElementById('save-url-edit-btn'),

            confirmModal: document.getElementById('confirmation-modal'),
            confirmModalTitle: document.getElementById('confirm-modal-title'),
            confirmModalMsg: document.getElementById('confirm-modal-msg'),
            confirmActionBtn: document.getElementById('confirm-action-btn'),

            detailPanel: document.getElementById('detail-side-panel'),
            detailOverlay: document.getElementById('detail-overlay'),
            detailContent: document.getElementById('detail-content-body'),
            closeDetailBtn: document.getElementById('close-detail-btn'),
            
            createSiteName: document.getElementById('create-site-name'),
            createSiteRoot: document.getElementById('create-site-root'),
            confirmCreateSiteBtn: document.getElementById('confirm-create-site-btn'),
            
            // NEW: Add URL Modal Elements
            openAddUrlModalBtn: document.getElementById('open-add-url-modal-btn'),
            addUrlNameInput: document.getElementById('add-url-name-input'),
            addUrlLinkInput: document.getElementById('add-url-link-input'),
            confirmAddUrlBtn: document.getElementById('confirm-add-url-btn')
        };

        M.Modal.init(document.querySelectorAll('.modal'));
        M.Tooltip.init(document.querySelectorAll('.tooltipped'));

        loadSettings();
        handleDataLoading();

        if (state.activeFolderId !== 'dashboard' && state.activeFolderId !== 'notifications' && !state.folders.find(f => f.id === state.activeFolderId)) {
            state.activeFolderId = 'dashboard';
        }

        renderNavigation();
        renderMainContent();
        bindEvents();
        
        console.log("PSReportApp: Prêt !");
    }

    function loadSettings() {
        const s = localStorage.getItem(SETTINGS_KEY);
        if (s) settings = JSON.parse(s);
        if(dom.apiKeyInput) {
            dom.apiKeyInput.value = settings.apiKey || '';
            if(settings.apiKey) M.updateTextFields();
        }
    }

    function saveSettings() {
        settings.apiKey = dom.apiKeyInput.value.trim();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        notify('Clé API enregistrée', 'green');
    }

    function handleDataLoading() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                state = parsed;
                if (!state.notifications) state.notifications = []; 
                state.folders.forEach(f => {
                    if(f.rootUrl === undefined) f.rootUrl = '';
                    if(!f.status) f.status = 'unknown'; 
                    if(!f.siteMetrics) f.siteMetrics = null; // Migration
                    
                    f.urls.forEach(u => {
                        if (!u.scores) u.scores = null;
                        u.isLoading = false; 
                        if (!u.name) u.name = null;
                        if (!u.status) u.status = 'unknown'; 
                        if (!u.details) u.details = null; 
                        if (!u.errorCode) u.errorCode = null; // New error prop
                    });
                });
            } catch (e) { console.error("PSReportApp: Erreur parsing LocalStorage", e); }
        }
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function addNotification(type, title, message) {
        const notif = {
            id: Date.now(),
            type: type, // 'success' | 'error'
            title: title,
            message: message,
            date: new Date().toLocaleString('fr-FR'),
            read: false
        };
        state.notifications.unshift(notif);
        if (state.notifications.length > 50) state.notifications.pop();
        
        saveData();
        renderNavigation(); 
        if (state.activeFolderId === 'notifications') {
            renderMainContent();
        }
    }

    function clearNotifications() {
        state.notifications = [];
        saveData();
        renderNavigation();
        renderMainContent();
        notify("Historique effacé", "grey");
    }

    function getGlobalStats() {
        let total = 0;
        let analyzed = 0;
        let alerts = [];
        let improvements = [];
        let offline = [];

        state.folders.forEach(folder => {
            folder.urls.forEach(url => {
                total++;
                if (url.status === 'down') offline.push({ ...url, folderName: folder.name, folderId: folder.id });

                if (url.scores) {
                    analyzed++;
                    const scores = [url.scores.performance, url.scores.accessibility, url.scores.bestPractices, url.scores.seo];
                    const minScore = Math.min(...scores);
                    if (minScore < 50) alerts.push({ ...url, folderName: folder.name });
                    else if (minScore < 90) improvements.push({ ...url, folderName: folder.name });
                }
            });
        });
        return { total, analyzed, alerts, improvements, offline };
    }

    function getActiveFolder() { 
        if (state.activeFolderId === 'dashboard' || state.activeFolderId === 'notifications') return null;
        return state.folders.find(f => f.id === state.activeFolderId); 
    }

    // NEW: Create Site Logic
    function handleCreateSite() {
        const name = dom.createSiteName.value.trim();
        let root = dom.createSiteRoot.value.trim();
        
        if (!name || !root) {
            notify("Nom et URL racine obligatoires", "red");
            return;
        }
        
        if (!/^https?:\/\//i.test(root)) root = 'https://' + root;
        try { new URL(root); } catch (_) { notify('URL Racine Invalide', 'red'); return; }

        const newSite = { 
            id: Date.now(), 
            name: name, 
            rootUrl: root, 
            status: 'unknown', 
            siteMetrics: null, // Init Metrics
            urls: [] 
        };
        
        state.folders.push(newSite);
        state.activeFolderId = newSite.id;
        
        saveData();
        renderNavigation();
        renderMainContent();
        notify(`Site "${name}" créé`, 'green');
        
        dom.createSiteName.value = '';
        dom.createSiteRoot.value = '';
        
        // Auto check site status
        checkSiteStatus(newSite);
        
        const instance = M.Modal.getInstance(document.getElementById('create-site-modal'));
        instance.close();
    }

    // NEW: Check Single Site Root Status
    async function checkSiteStatus(folder) {
        if(!folder.rootUrl) return;
        try {
            await fetch(folder.rootUrl, { mode: 'no-cors', cache: 'no-cache' });
            folder.status = 'up';
        } catch (e) {
            console.warn("Ping failed", e);
            folder.status = 'down';
        }
        saveData();
        if(state.activeFolderId === 'dashboard') {
            renderDashboardView();
        }
    }

    // NEW: Check All Sites Status (For Dashboard)
    async function checkAllSitesStatus() {
        if(state.folders.length === 0) return;
        
        notify("Vérification des statuts systèmes...", "blue");
        
        for (const folder of state.folders) {
            await checkSiteStatus(folder);
            await new Promise(r => setTimeout(r, 50)); 
        }
        notify("Statuts systèmes mis à jour", "green");
    }

    function askDeleteFolder() {
        if (state.activeFolderId === 'dashboard' || state.activeFolderId === 'notifications') return;
        
        const folder = getActiveFolder();
        state.pendingAction = { type: 'deleteFolder', payload: folder.id };
        
        dom.confirmModalTitle.textContent = "Supprimer le site ?";
        dom.confirmModalMsg.textContent = `Vous êtes sur le point de supprimer "${folder.name}" et tout son contenu. Cette action est irréversible.`;
        
        const instance = M.Modal.getInstance(dom.confirmModal);
        instance.open();
    }

    function askDeleteUrl(urlId) {
        let urlName = "cette page";
        const folder = getActiveFolder();
        if (folder) {
            const u = folder.urls.find(x => x.id === urlId);
            if (u) urlName = u.name || u.url;
        }

        state.pendingAction = { type: 'deleteUrl', payload: urlId };
        
        dom.confirmModalTitle.textContent = "Supprimer la page ?";
        dom.confirmModalMsg.textContent = `Voulez-vous vraiment supprimer "${urlName}" de ce site ?`;
        
        const instance = M.Modal.getInstance(dom.confirmModal);
        instance.open();
    }

    function performConfirmedAction() {
        if (!state.pendingAction) return;

        if (state.pendingAction.type === 'deleteFolder') {
            const index = state.folders.findIndex(f => f.id === state.pendingAction.payload);
            if (index > -1) {
                state.folders.splice(index, 1);
                state.activeFolderId = 'dashboard';
                saveData();
                renderNavigation();
                renderMainContent();
                notify("Site supprimé", 'grey');
            }
        } else if (state.pendingAction.type === 'deleteUrl') {
            const urlId = state.pendingAction.payload;
            state.folders.forEach(f => {
                f.urls = f.urls.filter(u => u.id !== urlId);
            });
            saveData();
            renderNavigation(); 
            renderMainContent();
            notify("Page supprimée", 'grey');
        }

        state.pendingAction = null;
    }
    
    // --- Edit Functions ---
    function openEditFolderModal() {
        const folder = getActiveFolder();
        if(!folder) return;
        dom.editFolderNameInput.value = folder.name;
        dom.editFolderRootInput.value = folder.rootUrl || ''; 
        M.updateTextFields();
        const instance = M.Modal.getInstance(document.getElementById('folder-edit-modal'));
        instance.open();
    }
    
    function saveFolderEdit() {
        const folder = getActiveFolder();
        const newName = dom.editFolderNameInput.value.trim();
        const newRoot = dom.editFolderRootInput.value.trim();

        if(!folder || !newName) return;
        
        folder.name = newName;
        folder.rootUrl = newRoot; 

        saveData();
        renderNavigation();
        renderMainContent(); 
        notify('Site modifié', 'green');
    }

    function openEditUrlModal(urlId) {
        const folder = getActiveFolder();
        if (!folder) return;
        const urlObj = folder.urls.find(u => u.id === urlId);
        if (!urlObj) return;
        dom.editUrlIdHidden.value = urlId;
        dom.editUrlNameInput.value = urlObj.name || urlObj.url;
        M.updateTextFields();
        const instance = M.Modal.getInstance(document.getElementById('url-edit-modal'));
        instance.open();
    }
    
    function saveUrlEdit() {
        const urlId = parseInt(dom.editUrlIdHidden.value);
        const newName = dom.editUrlNameInput.value.trim();
        const folder = getActiveFolder();
        if(!folder) return;
        const urlObj = folder.urls.find(u => u.id === urlId);
        if(urlObj) {
            urlObj.name = newName || urlObj.url;
            saveData();
            renderMainContent();
            notify('URL modifiée', 'green');
        }
    }

    // NEW: Handle Add URL Modal
    function handleAddUrl() {
        const folder = getActiveFolder();
        if (!folder) return;
        
        let url = dom.addUrlLinkInput.value.trim();
        let name = dom.addUrlNameInput.value.trim();

        if (!url) { notify('Veuillez entrer une URL', 'red'); return; }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        try { new URL(url); } catch (_) { notify('URL Invalide', 'red'); return; }
        if (folder.urls.some(u => u.url === url)) { notify('Cette URL existe déjà dans ce site', 'orange'); return; }

        folder.urls.unshift({
            id: Date.now(),
            url: url,
            name: name || url,
            dateAdded: new Date().toLocaleDateString('fr-FR'),
            scores: null,
            previousScores: null, 
            status: 'unknown',
            details: null, 
            isLoading: false
        });
        saveData();
        renderMainContent(); 
        notify('Page ajoutée !', 'green');
        
        dom.addUrlLinkInput.value = '';
        dom.addUrlNameInput.value = '';
        
        checkUrlStatus(folder.urls[0]);
        
        const instance = M.Modal.getInstance(document.getElementById('add-url-modal'));
        instance.close();
    }

    async function checkUrlStatus(urlItem) {
        try {
            await fetch(urlItem.url, { mode: 'no-cors', cache: 'no-cache' });
            urlItem.status = 'up';
        } catch (e) {
            console.warn("Ping failed", e);
            urlItem.status = 'down';
        }
        
        saveData();
        if(state.activeFolderId !== 'notifications' && state.activeFolderId !== 'dashboard') {
            renderMainContent();
        }
    }

    async function runFullAnalysis() {
        const folder = getActiveFolder();
        if (!folder || folder.urls.length === 0) return;
        
        if (!settings.apiKey) {
             const instance = M.Modal.getInstance(document.getElementById('settings-modal'));
             instance.open();
             notify('Clé API requise pour les audits', 'orange');
             return;
        }

        notify(`Lancement de l'analyse complète...`, 'blue');
        
        // NEW: Launch Site Root Audit
        if(folder.rootUrl) {
            auditSiteRoot(folder);
        }

        for (const url of folder.urls) {
            checkUrlStatus(url); 
            runAudit(url.id);
            await new Promise(r => setTimeout(r, 500)); 
        }
    }

    // NEW: Audit Site Root for General Block
    async function auditSiteRoot(folder) {
         try {
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(folder.rootUrl)}&key=${settings.apiKey}&strategy=mobile&category=seo&category=best-practices&category=performance`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            const audits = data.lighthouseResult.audits;
            
            // Extract Metrics
            
            // Status Code Extraction logic
            let finalStatusCode = 'N/A';
            // Try network requests first as it gives the main document status
            if (audits['network-requests'] && audits['network-requests'].details && audits['network-requests'].details.items) {
                 const rootReq = audits['network-requests'].details.items.find(i => i.url === folder.rootUrl || i.url === folder.rootUrl + '/') || audits['network-requests'].details.items[0];
                 if(rootReq) finalStatusCode = rootReq.statusCode;
            } else if (audits['http-status-code']) {
                 finalStatusCode = audits['http-status-code'].displayValue || 'OK';
            }

            folder.siteMetrics = {
                screenshot: audits['final-screenshot'] ? audits['final-screenshot'].details.data : null,
                statusCode: finalStatusCode,
                isHttps: audits['is-on-https'] ? (audits['is-on-https'].score === 1) : false,
                isCrawlable: audits['is-crawlable'] ? (audits['is-crawlable'].score === 1) : false,
                lastCheck: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
            };
            
            saveData();
            // Re-render if looking at this folder
            if(state.activeFolderId === folder.id) {
                renderMainContent();
            }

        } catch (err) {
            console.error("Erreur Site Root Audit", err);
            // Silent error for site block to avoid spam
        }
    }

    async function runAudit(urlId) {
        if (!settings.apiKey) {
            const instance = M.Modal.getInstance(document.getElementById('settings-modal'));
            instance.open();
            notify('Clé API requise', 'orange');
            return;
        }

        let targetUrl = null;
        for (const f of state.folders) {
            const u = f.urls.find(item => item.id === urlId);
            if (u) { targetUrl = u; break; }
        }

        if (!targetUrl) return;
        targetUrl.isLoading = true;
        
        if(state.activeFolderId !== 'notifications' && state.activeFolderId !== 'dashboard') {
            renderMainContent(); 
        }

        try {
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl.url)}&key=${settings.apiKey}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            // CHECK HTTP STATUS FIRST
            const audits = data.lighthouseResult.audits;
            let statusCode = 200;
            
            if (audits['network-requests'] && audits['network-requests'].details && audits['network-requests'].details.items) {
                 const rootReq = audits['network-requests'].details.items.find(i => i.url === targetUrl.url || i.url === targetUrl.url + '/') || audits['network-requests'].details.items[0];
                 if(rootReq) statusCode = rootReq.statusCode;
            }

            if (statusCode >= 400) {
                // IT IS AN ERROR PAGE
                targetUrl.status = 'down';
                targetUrl.errorCode = `Erreur ${statusCode}`;
                targetUrl.scores = null; // Clear scores
                targetUrl.details = null;
                
                addNotification('error', 'Page Inaccessible', `${targetUrl.name || targetUrl.url} répond en erreur ${statusCode}.`);
            } else {
                // SUCCESS
                if (targetUrl.scores) {
                    targetUrl.previousScores = { ...targetUrl.scores };
                }

                const categories = data.lighthouseResult.categories;
                
                // ... (Opportunities extraction remains same) ...
                let opportunities = [];
                for (const key in audits) {
                    const audit = audits[key];
                    const isImageIssue = IMAGE_AUDIT_IDS.includes(key);
                    const hasSavings = audit.details && (
                        (audit.details.overallSavingsMs && audit.details.overallSavingsMs > 0) || 
                        (audit.details.overallSavingsBytes && audit.details.overallSavingsBytes > 0)
                    );

                    let shouldInclude = false;
                    if (isImageIssue) {
                        if ( (typeof audit.score === 'number' && audit.score < 0.9) || hasSavings ) {
                            shouldInclude = true;
                        }
                    } else if (audit.details && audit.details.type === 'opportunity' && typeof audit.score === 'number' && audit.score < 0.9) {
                        shouldInclude = true;
                    }

                    if (shouldInclude) {
                        opportunities.push({
                            id: key, 
                            title: audit.title,
                            description: audit.description,
                            savings: audit.displayValue || '',
                            score: audit.score,
                            wastedMs: audit.details.overallSavingsMs || 0,
                            wastedBytes: audit.details.overallSavingsBytes || 0
                        });
                    }
                }
                
                opportunities.sort((a, b) => {
                    const aIsImage = IMAGE_AUDIT_IDS.includes(a.id);
                    const bIsImage = IMAGE_AUDIT_IDS.includes(b.id);
                    if (aIsImage && !bIsImage) return -1;
                    if (!aIsImage && bIsImage) return 1;
                    const aImpact = a.wastedMs + (a.wastedBytes / 100); 
                    const bImpact = b.wastedMs + (b.wastedBytes / 100);
                    return bImpact - aImpact;
                });

                targetUrl.details = {
                    metrics: {
                        fcp: audits['first-contentful-paint'] ? audits['first-contentful-paint'].displayValue : 'N/A',
                        lcp: audits['largest-contentful-paint'] ? audits['largest-contentful-paint'].displayValue : 'N/A',
                        cls: audits['cumulative-layout-shift'] ? audits['cumulative-layout-shift'].displayValue : 'N/A',
                        speedIndex: audits['speed-index'] ? audits['speed-index'].displayValue : 'N/A'
                    },
                    opportunities: opportunities.slice(0, 20)
                };

                targetUrl.scores = {
                    performance: Math.round(categories['performance'].score * 100),
                    accessibility: Math.round(categories['accessibility'].score * 100),
                    bestPractices: Math.round(categories['best-practices'].score * 100),
                    seo: Math.round(categories['seo'].score * 100),
                    ttfb: Math.round(audits['server-response-time'].numericValue), 
                    lastRun: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
                };
                
                targetUrl.status = 'up'; 
                targetUrl.errorCode = null;
                addNotification('success', 'Audit terminé', `L'analyse de ${targetUrl.name || targetUrl.url} a réussi.`);
            }

        } catch (err) {
            console.error("Erreur Lighthouse", err);
            // Network error mostly (DNS, etc)
            targetUrl.status = 'down';
            targetUrl.errorCode = "Erreur Réseau";
            targetUrl.scores = null;
            
            if(state.notifications.length < 5) notify('Erreur audit', 'red'); 
            addNotification('error', 'Échec de l\'audit', `Erreur sur ${targetUrl.name || targetUrl.url}: ${err.message}`);
        } finally {
            targetUrl.isLoading = false;
            saveData();
            if(state.activeFolderId !== 'notifications' && state.activeFolderId !== 'dashboard') {
                renderMainContent();
            }
            renderNavigation(); 
        }
    }

    // --- Detail Panel Functions ---
    function openDetailPanel(urlId) {
        let foundUrl = null;
        for (const f of state.folders) {
            const u = f.urls.find(item => item.id === urlId);
            if (u) { foundUrl = u; break; }
        }
        
        if (!foundUrl) return;
        
        renderDetailPanel(foundUrl);
        dom.detailPanel.classList.add('open');
        dom.detailOverlay.classList.add('open');
    }

    function closeDetailPanel() {
        dom.detailPanel.classList.remove('open');
        dom.detailOverlay.classList.remove('open');
    }

    function renderDetailPanel(url) {
        const title = url.name || url.url;
        document.getElementById('detail-title').textContent = title;
        
        const contentDiv = dom.detailContent;
        contentDiv.innerHTML = ''; 

        if (!url.details) {
            contentDiv.innerHTML = `
                <div style="text-align:center; padding:40px; color:#90a4ae;">
                    <i class="material-icons large">analytics</i>
                    <p>Aucun détail disponible.<br>Lancez une analyse complète pour voir le rapport.</p>
                </div>
            `;
            return;
        }

        const metricsHtml = `
            <div class="detail-section-title">Métriques Clés</div>
            <div class="detail-metric-grid">
                <div class="detail-metric-card">
                    <span class="dm-label">Premier affichage (FCP)</span>
                    <span class="dm-val">${url.details.metrics.fcp}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-label">Affichage complet (LCP)</span>
                    <span class="dm-val">${url.details.metrics.lcp}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-label">Stabilité visuelle (CLS)</span>
                    <span class="dm-val">${url.details.metrics.cls}</span>
                </div>
                <div class="detail-metric-card">
                    <span class="dm-label">Speed Index</span>
                    <span class="dm-val">${url.details.metrics.speedIndex}</span>
                </div>
            </div>
        `;

        let priorityOpps = [];
        let advancedOpps = [];

        url.details.opportunities.forEach(opp => {
            if(opp.id && IMAGE_AUDIT_IDS.includes(opp.id)) {
                priorityOpps.push(opp);
            } else {
                advancedOpps.push(opp);
            }
        });

        const generateOppsList = (list) => {
            if (list.length === 0) return '';
            return list.map(opp => {
                const simpleDesc = opp.description.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split('.')[0] + '.';
                let savingLabel = opp.savings;
                if(savingLabel.includes('ms') || savingLabel.includes('s')) savingLabel = `Gain estimé : ${savingLabel}`;
                else if(savingLabel.includes('KiB') || savingLabel.includes('KB')) savingLabel = `Réduction : ${savingLabel}`;
                
                let severityClass = 'warning'; 
                let severityIcon = 'info';
                
                if (opp.score !== null && opp.score < 0.5) {
                    severityClass = 'critical'; 
                    severityIcon = 'error';
                } else if (opp.score === null && (opp.wastedMs > 0 || opp.wastedBytes > 0)) {
                     // Keep as warning for diagnostics
                }

                return `
                    <div class="opportunity-item ${severityClass}">
                        <div class="opp-header">
                            <i class="material-icons tiny ${severityClass}-text">${severityIcon}</i>
                            <span class="opp-title">${opp.title}</span>
                        </div>
                        <div class="opp-desc">${simpleDesc}</div>
                        <div class="opp-save">${savingLabel}</div>
                    </div>
                `;
            }).join('');
        };

        let easySection = `<div class="detail-section-title c-green" style="color:#2e7d32;"><i class="material-icons tiny">image</i> Actions Rapides (Images)</div>`;
        if (priorityOpps.length > 0) {
            easySection += generateOppsList(priorityOpps);
        } else {
            easySection += `<p class="grey-text" style="font-size:0.9rem; padding-left:10px;">✅ Vos images semblent optimisées.</p>`;
        }

        let advancedSection = '';
        if (advancedOpps.length > 0) {
            advancedSection = `<div class="detail-section-title" style="color:#f57c00;"><i class="material-icons tiny">build</i> Optimisations Techniques (Avancé)</div>`;
            advancedSection += generateOppsList(advancedOpps);
        }

        contentDiv.innerHTML = metricsHtml + easySection + advancedSection;
    }

    // --- Rendering ---
    function getScoreColor(score) {
        if (score >= 90) return '#00c853';
        if (score >= 50) return '#ffab00';
        return '#ff1744';
    }

    function renderNavigation() {
        if(!dom.folderList) return;
        
        dom.navDashboard.className = `nav-item ${state.activeFolderId === 'dashboard' ? 'active' : ''}`;
        dom.navNotifications.className = `nav-item ${state.activeFolderId === 'notifications' ? 'active' : ''}`;
        
        const unreadCount = state.notifications ? state.notifications.filter(n => !n.read).length : 0;
        if (unreadCount > 0) {
            dom.notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            dom.notifBadge.style.display = 'inline-block';
        } else {
            dom.notifBadge.style.display = 'none';
        }

        dom.folderList.innerHTML = '';
        state.folders.forEach(folder => {
            const li = document.createElement('li');
            li.className = `nav-item ${folder.id === state.activeFolderId ? 'active' : ''}`;
            li.innerHTML = `<span><i class="material-icons tiny left" style="margin-right:10px; opacity:0.7">language</i>${folder.name}</span><span class="new badge" data-badge-caption="">${folder.urls.length}</span>`;
            li.onclick = () => {
                state.activeFolderId = folder.id;
                saveData();
                renderNavigation();
                renderMainContent();
            };
            dom.folderList.appendChild(li);
        });
    }

    function renderMainContent() {
        if(dom.viewDashboard) dom.viewDashboard.style.display = 'none';
        if(dom.viewFolder) dom.viewFolder.style.display = 'none';
        if(dom.viewNotifications) dom.viewNotifications.style.display = 'none';
        
        if(dom.deleteFolderBtn) dom.deleteFolderBtn.style.display = 'none';
        if(dom.editFolderBtn) dom.editFolderBtn.style.display = 'none';
        if(dom.clearNotifsBtn) dom.clearNotifsBtn.style.display = 'none';
        if(dom.visitSiteBtn) dom.visitSiteBtn.style.display = 'none'; 
        if(dom.analyzeAllBtn) dom.analyzeAllBtn.style.display = 'none'; 

        if (state.activeFolderId === 'dashboard') {
            renderDashboardView();
        } else if (state.activeFolderId === 'notifications') {
            renderNotificationsView();
        } else {
            renderFolderView();
        }
    }
    
    function renderNotificationsView() {
        if(dom.viewNotifications) dom.viewNotifications.style.display = 'block';
        dom.pageTitle.textContent = "Notifications";
        if(dom.clearNotifsBtn) dom.clearNotifsBtn.style.display = 'block'; 
        
        dom.notificationList.innerHTML = '';
        if (!state.notifications || state.notifications.length === 0) {
            dom.emptyNotifs.style.display = 'block';
            return;
        }
        
        dom.emptyNotifs.style.display = 'none';
        state.notifications.forEach(notif => {
            const li = document.createElement('li');
            li.className = `collection-item notification-item ${!notif.read ? 'unread' : ''}`;
            const icon = notif.type === 'success' ? 'check_circle' : 'error';
            const iconColor = notif.type === 'success' ? 'green-text' : 'red-text';
            li.innerHTML = `
                <i class="material-icons notif-icon ${iconColor}">${icon}</i>
                <div class="notif-content">
                    <div class="notif-title">${notif.title}</div>
                    <div class="notif-msg">${notif.message}</div>
                    <div class="notif-time">${notif.date}</div>
                </div>
            `;
            dom.notificationList.appendChild(li);
        });
    }

    // UPDATED: Dashboard with Systems Table (Modern List Design)
    function renderDashboardView() {
        if(dom.viewDashboard) dom.viewDashboard.style.display = 'block';
        dom.pageTitle.textContent = "Tableau de bord";

        // Systems Section
        dom.systemsListContainer.innerHTML = '';
        if (state.folders.length === 0) {
            dom.noSitesMsg.style.display = 'block';
        } else {
            dom.noSitesMsg.style.display = 'none';
            state.folders.forEach(folder => {
                
                let statusClass = 'sys-status-unknown';
                if (folder.status === 'up') statusClass = 'sys-status-up';
                else if (folder.status === 'down') statusClass = 'sys-status-down';

                const card = document.createElement('div');
                card.className = 'system-card';
                card.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <div class="sys-status-dot ${statusClass}"></div>
                        <div class="sys-info">
                            <div class="sys-name">${folder.name}</div>
                        </div>
                    </div>
                    <div class="sys-action">
                        <button class="btn-flat btn-small waves-effect waves-teal blue-text">
                            <i class="material-icons left">folder_open</i>Dossier
                        </button>
                    </div>
                `;
                
                card.onclick = () => {
                    state.activeFolderId = folder.id;
                    saveData();
                    renderNavigation();
                    renderMainContent();
                };
                
                dom.systemsListContainer.appendChild(card);
            });
        }

        // Stats Section
        const stats = getGlobalStats();
        if(dom.statTotal) dom.statTotal.textContent = stats.total;
        if(dom.statAnalyzed) dom.statAnalyzed.textContent = stats.analyzed;
        if(dom.statAlerts) dom.statAlerts.textContent = stats.alerts.length;
        if(dom.statImprovements) dom.statImprovements.textContent = stats.improvements.length;
        if(dom.statOffline) dom.statOffline.textContent = stats.offline.length;

        // Offline Pages List (UPDATED WITH MINI-CARD LOGIC)
        dom.offlineList.innerHTML = '';
        if (stats.offline.length > 0) {
            dom.offlineSection.style.display = 'block';
            stats.offline.forEach(item => {
                // Here we create a card specifically for the dashboard error list
                // We reuse createUrlCard but modify it slightly for the dashboard context
                const card = createUrlCard(item, 'critical');
                
                // Add the mini-offline-card class for styling
                card.classList.add('mini-offline-card');
                
                // Add click handler for navigation
                card.onclick = () => {
                    // Find the folder this item belongs to. getGlobalStats added folderId?
                    // We need to ensure getGlobalStats returns folderId.
                    // Let's check getGlobalStats implementation below.
                    // It seems getGlobalStats logic was updated in thought but not in code block yet.
                    // Let's ensure it has folderId.
                    
                    // Actually, let's find the folder ID here if missing in item
                    // But efficient way is to fix getGlobalStats.
                    
                    // For now, let's find it:
                    const folder = state.folders.find(f => f.urls.some(u => u.id === item.id));
                    if (folder) {
                        state.activeFolderId = folder.id;
                        saveData();
                        renderNavigation();
                        renderMainContent();
                    }
                };
                
                dom.offlineList.appendChild(card);
            });
        } else {
            dom.offlineSection.style.display = 'none';
        }

        // REMOVED: Alerts & Improvements lists population logic
    }

    function renderFolderView() {
        if(dom.viewFolder) dom.viewFolder.style.display = 'block';

        const folder = getActiveFolder();
        if (!folder) return; 

        dom.pageTitle.textContent = folder.name;
        
        // Update Visit Button
        if(folder.rootUrl && dom.visitSiteBtn) {
            dom.visitSiteBtn.href = folder.rootUrl;
            dom.visitSiteBtn.style.display = 'inline-flex'; 
        } else if(dom.visitSiteBtn) {
            dom.visitSiteBtn.style.display = 'none';
        }

        if(dom.deleteFolderBtn) dom.deleteFolderBtn.style.display = 'block';
        if(dom.editFolderBtn) dom.editFolderBtn.style.display = 'block';
        // NEW: Show Analyze button only in folder view
        if(dom.analyzeAllBtn) dom.analyzeAllBtn.style.display = 'inline-flex';

        // RENDER SITE GENERAL BLOCK
        if(folder.siteMetrics) {
            dom.siteGeneralBlock.style.display = 'block';
            dom.siteLastCheck.textContent = 'Dernier check: ' + folder.siteMetrics.lastCheck;
            
            // Screenshot
            if(folder.siteMetrics.screenshot) {
                dom.siteScreenshot.src = folder.siteMetrics.screenshot;
                dom.siteScreenshot.style.display = 'block';
                dom.siteScreenshotPlaceholder.style.display = 'none';
            } else {
                dom.siteScreenshot.style.display = 'none';
                dom.siteScreenshotPlaceholder.style.display = 'block';
            }

            // Status Code
            dom.gmStatusCode.textContent = folder.siteMetrics.statusCode;
            // HTTPS
            dom.gmHttps.innerHTML = folder.siteMetrics.isHttps 
                ? '<i class="material-icons green-text">lock</i> <span class="green-text">Sécurisé</span>' 
                : '<i class="material-icons red-text">lock_open</i> <span class="red-text">Non sécurisé</span>';
            // Crawlable
            dom.gmCrawling.innerHTML = folder.siteMetrics.isCrawlable 
                ? '<i class="material-icons green-text">check_circle</i> <span class="green-text">Oui</span>' 
                : '<i class="material-icons orange-text">block</i> <span class="orange-text">Non</span>';
            
        } else {
            dom.siteGeneralBlock.style.display = 'none';
        }


        dom.urlList.innerHTML = '';
        if (folder.urls.length === 0) dom.emptyState.style.display = 'flex';
        else {
            dom.emptyState.style.display = 'none';
            
            // SORT URLS: ERRORS FIRST
            const sortedUrls = [...folder.urls].sort((a, b) => {
                const aIsDown = (a.status === 'down');
                const bIsDown = (b.status === 'down');
                if (aIsDown && !bIsDown) return -1;
                if (!aIsDown && bIsDown) return 1;
                // Otherwise sort by date desc (assuming insertion order implies date, or parse date)
                // Defaulting to insertion order (index) if dates equal, but array sort is stable.
                return 0;
            });
            
            sortedUrls.forEach(item => dom.urlList.appendChild(createUrlCard(item, false)));
        }
    }

    function createUrlCard(item, alertType = false) {
        const div = document.createElement('div');
        
        const displayName = item.name || item.url;
        
        let statusClass = 'status-unknown';
        if(item.status === 'up') statusClass = 'status-up';
        if(item.status === 'down') statusClass = 'status-down';
        const statusHtml = `<span class="status-indicator ${statusClass}" title="Statut: ${item.status}"></span>`;

        // Scores HTML Generation
        let scoresHtml = '';
        
        // CHECK ERROR STATE FIRST
        if (item.status === 'down' || item.errorCode) {
            // ERROR STATE RENDER
            const errorMsg = item.errorCode || "Erreur Inconnue";
            
            if (!alertType) {
                // Horizontal Layout Error
                 scoresHtml = `
                    <div class="error-badge">
                        <i class="material-icons tiny">error_outline</i>
                        ${errorMsg}
                    </div>
                `;
            } else {
                 // Vertical/Alert Layout Error (Used for Dashboard)
                 // This will be restyled by CSS for .mini-offline-card
                 scoresHtml = `
                    <div style="padding: 15px; text-align:center;">
                        <span class="error-badge"><i class="material-icons tiny">error</i> ${errorMsg}</span>
                    </div>
                `;
            }

        } else if (item.scores) {
            // SUCCESS STATE RENDER
            const metrics = [
                { key: 'performance', label: 'Perf', val: item.scores.performance },
                { key: 'accessibility', label: 'Access', val: item.scores.accessibility },
                { key: 'bestPractices', label: 'Best P.', val: item.scores.bestPractices },
                { key: 'seo', label: 'SEO', val: item.scores.seo },
            ];
            
            const scoreItems = metrics.map(m => {
                const color = getScoreColor(m.val);
                let style = '';
                if (alertType === 'critical' && m.val < 50) style = 'border: 2px solid #ff1744;';
                else if (alertType === 'improvement' && m.val < 90 && m.val >= 50) style = 'border: 2px solid #ff9800;';
                
                const gradient = `conic-gradient(${color} ${m.val}%, #e0e0e0 0)`;
                
                let diffHtml = '';
                if (item.previousScores && item.previousScores[m.key] !== undefined) {
                    const diff = m.val - item.previousScores[m.key];
                    if (diff > 0) diffHtml = `<div class="score-diff diff-pos">▲${diff}</div>`;
                    else if (diff < 0) diffHtml = `<div class="score-diff diff-neg">▼${Math.abs(diff)}</div>`;
                    else diffHtml = `<div class="score-diff diff-eq">=</div>`;
                } else {
                    diffHtml = `<div class="score-diff" style="visibility:hidden">-</div>`;
                }

                return `
                    <div class="score-item">
                        <div class="score-circle" style="background: ${gradient}; ${style}">
                            <span class="score-value">${m.val}</span>
                        </div>
                        ${diffHtml}
                        <span class="score-label">${m.label}</span>
                    </div>`;
            }).join('');

            let ttfbItem = '';
            if(item.scores.ttfb !== undefined) {
                const ttfbVal = item.scores.ttfb;
                let ttfbColor = '#ff1744'; 
                if (ttfbVal < 200) ttfbColor = '#00c853'; 
                else if (ttfbVal <= 600) ttfbColor = '#ff9800'; 

                let ttfbDiffHtml = '';
                if (item.previousScores && item.previousScores.ttfb !== undefined) {
                    const diff = ttfbVal - item.previousScores.ttfb;
                    if (diff < 0) ttfbDiffHtml = `<div class="score-diff diff-pos">▼${Math.abs(diff)}</div>`; 
                    else if (diff > 0) ttfbDiffHtml = `<div class="score-diff diff-neg">▲${diff}</div>`; 
                    else ttfbDiffHtml = `<div class="score-diff diff-eq">=</div>`;
                } else {
                    ttfbDiffHtml = `<div class="score-diff" style="visibility:hidden">-</div>`;
                }

                ttfbItem = `
                    <div class="score-item">
                        <div class="score-circle ttfb-circle" style="border: 3px solid ${ttfbColor}; background:white;">
                            <span class="score-value" style="font-size:0.8rem; color:#37474f;">${ttfbVal}ms</span>
                        </div>
                        ${ttfbDiffHtml}
                        <span class="score-label">TTFB</span>
                    </div>
                `;
            }

            if (!alertType) {
                scoresHtml = `<div class="scores-flex">${scoreItems}${ttfbItem}</div>`;
            } else {
                scoresHtml = `<div class="scores-grid">${scoreItems}</div>`; 
            }
            
        } else if (!alertType) {
            scoresHtml = `<span class="grey-text" style="font-size:0.9rem">Aucun audit</span>`;
        }

        // --- MAIN LAYOUT BRANCHING ---
        
        if (!alertType) {
            // === FOLDER VIEW: HORIZONTAL LAYOUT ===
            let mainClass = 'url-card horizontal-layout';
            if (item.status === 'down' || item.errorCode) mainClass += ' is-error'; // Add error class
            
            div.className = mainClass;
            
            // Show Detail button only if NOT error? Or show it to see error details? 
            // Usually error means no lighthouse data, so no details. Hide detail btn if error.
            const showDetail = !(item.status === 'down' || item.errorCode);
            
            const actionButtons = `
                 <div class="url-actions-group">
                    <button class="btn waves-effect waves-light btn-small blue lighten-1 audit-btn" data-id="${item.id}" title="Lancer l'audit"><i class="material-icons">refresh</i></button>
                    ${showDetail ? `<button class="btn waves-effect waves-light btn-small grey lighten-2 grey-text text-darken-2 view-detail-btn" data-id="${item.id}" title="Voir le détail"><i class="material-icons">visibility</i></button>` : ''}
                    <button class="btn-flat btn-small waves-effect waves-teal edit-url-btn" data-id="${item.id}" title="Modifier"><i class="material-icons grey-text">edit</i></button>
                    <button class="btn-flat btn-small waves-effect waves-red delete-url-btn" data-id="${item.id}" title="Supprimer"><i class="material-icons grey-text">close</i></button>
                </div>
            `;

            div.innerHTML = `
                ${item.isLoading ? '<div class="card-loader"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div></div></div></div>' : ''}
                
                <div class="url-info-group">
                    <div class="url-icon" style="margin-right:15px; background: #e3f2fd; padding: 10px; border-radius: 50%; color: #1e88e5;"><i class="material-icons">language</i></div>
                    <div class="url-details">
                        <div class="url-name" style="font-size: 1.1rem; font-weight: 500; color: #37474f;">${statusHtml} ${displayName}</div>
                        <div class="url-link"><a href="${item.url}" target="_blank" class="grey-text" style="font-size: 0.9rem;">${item.url}</a></div>
                        <div class="url-date" style="font-size: 0.75rem; color: #b0bec5; margin-top: 2px;">
                            Ajouté le ${item.dateAdded} ${item.scores ? `• Audit: ${item.scores.lastRun}` : ''}
                        </div>
                    </div>
                </div>

                <div class="url-scores-group">
                    ${scoresHtml}
                </div>

                ${actionButtons}
            `;

        } else {
            // === DASHBOARD VIEW: VERTICAL LAYOUT ===
            let cssClass = 'url-card';
            if (alertType === 'critical') cssClass += ' critical-alert';
            if (alertType === 'improvement') cssClass += ' improvement-alert';
            div.className = cssClass;

            const folderBadge = `<span class="folder-badge"><i class="material-icons tiny left">folder</i>${item.folderName}</span>`;
            const iconType = alertType === 'critical' ? 'warning' : (alertType === 'improvement' ? 'build' : 'language');

            div.innerHTML = `
                ${item.isLoading ? '<div class="card-loader"><div class="preloader-wrapper active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div></div></div></div>' : ''}
                <div class="card-header">
                    <div class="url-info">
                        <div class="url-icon"><i class="material-icons">${iconType}</i></div>
                        <div class="url-details">
                            <div class="url-name">${statusHtml} ${displayName} ${folderBadge}</div>
                            <div class="url-link"><a href="${item.url}" target="_blank" class="grey-text">${item.url}</a></div>
                            <div class="url-date">Ajouté le ${item.dateAdded} ${item.scores ? `• Audit: ${item.scores.lastRun}` : ''}</div>
                        </div>
                    </div>
                </div>
                ${scoresHtml}
            `;
        }

        return div;
    }

    function bindEvents() {
        if(dom.saveKeyBtn) dom.saveKeyBtn.onclick = saveSettings;
        if(dom.saveFolderNameBtn) dom.saveFolderNameBtn.onclick = saveFolderEdit;
        if(dom.saveUrlEditBtn) dom.saveUrlEditBtn.onclick = saveUrlEdit;
        if(dom.clearNotifsBtn) dom.clearNotifsBtn.onclick = clearNotifications;
        
        if(dom.analyzeAllBtn) dom.analyzeAllBtn.onclick = runFullAnalysis; 
        
        // NEW: Binding for Create Site Modal
        if(dom.confirmCreateSiteBtn) dom.confirmCreateSiteBtn.onclick = handleCreateSite;
        
        // NEW: Binding for Refresh Systems
        if(dom.refreshSystemsBtn) dom.refreshSystemsBtn.onclick = checkAllSitesStatus;
        
        // NEW: Binding for Add URL Modal confirmation
        if(dom.confirmAddUrlBtn) dom.confirmAddUrlBtn.onclick = handleAddUrl;

        if(dom.confirmActionBtn) dom.confirmActionBtn.onclick = performConfirmedAction;

        // Slide-out panel close events
        if(dom.closeDetailBtn) dom.closeDetailBtn.onclick = closeDetailPanel;
        if(dom.detailOverlay) dom.detailOverlay.onclick = closeDetailPanel;

        dom.navDashboard.onclick = () => {
            state.activeFolderId = 'dashboard';
            saveData();
            renderNavigation();
            renderMainContent();
        };

        dom.navNotifications.onclick = () => {
            state.activeFolderId = 'notifications';
            if(state.notifications) {
                state.notifications.forEach(n => n.read = true);
            }
            saveData();
            renderNavigation();
            renderMainContent();
        };

        // NEW: Removed old input enter listener, added generic modal keypress helper?
        // Let's just handle specific modal inputs if needed, or rely on button clicks.

        dom.editFolderBtn.onclick = openEditFolderModal;
        dom.deleteFolderBtn.onclick = askDeleteFolder;

        // dom.addUrlBtn.onclick = (e) => {
        //     e.preventDefault();
        //     addUrlToCurrent();
        // };

        // const handleEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); addUrlToCurrent(); } };
        // dom.urlInput.onkeypress = handleEnter;
        // dom.nameInput.onkeypress = handleEnter;
        
        dom.editFolderNameInput.onkeypress = (e) => { if(e.key === 'Enter') saveFolderEdit(); };
        dom.editUrlNameInput.onkeypress = (e) => { if(e.key === 'Enter') saveUrlEdit(); };

        document.querySelector('.content-scroll').onclick = (e) => {
            const delBtn = e.target.closest('.delete-url-btn');
            if (delBtn) { 
                askDeleteUrl(parseInt(delBtn.dataset.id)); 
                return; 
            }
            const auditBtn = e.target.closest('.audit-btn');
            if (auditBtn) { runAudit(parseInt(auditBtn.dataset.id)); return; }
            const editBtn = e.target.closest('.edit-url-btn');
            if (editBtn) { openEditUrlModal(parseInt(editBtn.dataset.id)); return; }
            
            const detailBtn = e.target.closest('.view-detail-btn');
            if (detailBtn) { openDetailPanel(parseInt(detailBtn.dataset.id)); return; }
        };
    }

    function notify(msg, color) {
        if (typeof M !== 'undefined') M.toast({html: msg, classes: color + ' rounded'});
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', PSReportApp.init);
