/**
 * PSReportApp v3.0 - TTFB & Unified Analysis
 */
const PSReportApp = (function() {

    const STORAGE_KEY = 'ps_report_saas_data'; 
    const SETTINGS_KEY = 'ps_report_settings';

    let dom = {};

    let state = {
        folders: [{ id: 1, name: 'Général', urls: [] }],
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
            newFolderInput: document.getElementById('new-folder-name'),
            pageTitle: document.getElementById('page-title'),
            deleteFolderBtn: document.getElementById('delete-folder-btn'),
            editFolderBtn: document.getElementById('edit-folder-btn'),
            
            analyzeAllBtn: document.getElementById('analyze-all-btn'), 

            clearNotifsBtn: document.getElementById('clear-notifs-btn'),

            viewDashboard: document.getElementById('view-dashboard'),
            viewFolder: document.getElementById('view-folder'),
            viewNotifications: document.getElementById('view-notifications'),
            
            notificationList: document.getElementById('notification-list'),
            emptyNotifs: document.getElementById('empty-notifs'),

            statTotal: document.getElementById('stat-total-urls'),
            statAnalyzed: document.getElementById('stat-analyzed'),
            statImprovements: document.getElementById('stat-improvements'),
            statAlerts: document.getElementById('stat-alerts'),
            statOffline: document.getElementById('stat-offline'), 

            alertsList: document.getElementById('alerts-list'),
            noAlertsMsg: document.getElementById('no-alerts-msg'),
            improvementsList: document.getElementById('improvements-list'),
            noImprovementsMsg: document.getElementById('no-improvements-msg'),
            
            offlineSection: document.getElementById('offline-section'), 
            offlineList: document.getElementById('offline-list'), 

            nameInput: document.getElementById('website_name'), 
            urlInput: document.getElementById('website_url'),
            addUrlBtn: document.getElementById('add-btn'),
            urlList: document.getElementById('url-list'),
            emptyState: document.getElementById('empty-state'),

            apiKeyInput: document.getElementById('api-key-input'),
            saveKeyBtn: document.getElementById('save-api-key'),

            editFolderNameInput: document.getElementById('edit-folder-name-input'),
            saveFolderNameBtn: document.getElementById('save-folder-name-btn'),
            editUrlNameInput: document.getElementById('edit-url-name-input'),
            editUrlIdHidden: document.getElementById('edit-url-id-hidden'),
            saveUrlEditBtn: document.getElementById('save-url-edit-btn'),

            confirmModal: document.getElementById('confirmation-modal'),
            confirmModalTitle: document.getElementById('confirm-modal-title'),
            confirmModalMsg: document.getElementById('confirm-modal-msg'),
            confirmActionBtn: document.getElementById('confirm-action-btn')
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
                    f.urls.forEach(u => {
                        if (!u.scores) u.scores = null;
                        u.isLoading = false; 
                        if (!u.name) u.name = null;
                        if (!u.status) u.status = 'unknown'; 
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
                if (url.status === 'down') offline.push({ ...url, folderName: folder.name });

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

    function createFolder(name) {
        const newFolder = { id: Date.now(), name: name, urls: [] };
        state.folders.push(newFolder);
        state.activeFolderId = newFolder.id;
        saveData();
        renderNavigation();
        renderMainContent();
        notify(`Dossier "${name}" créé`, 'green');
    }

    function askDeleteFolder() {
        if (state.activeFolderId === 'dashboard' || state.activeFolderId === 'notifications') return;
        
        const folder = getActiveFolder();
        state.pendingAction = { type: 'deleteFolder', payload: folder.id };
        
        dom.confirmModalTitle.textContent = "Supprimer le dossier ?";
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
        dom.confirmModalMsg.textContent = `Voulez-vous vraiment supprimer "${urlName}" de ce dossier ?`;
        
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
                notify("Dossier supprimé", 'grey');
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
        M.updateTextFields();
        const instance = M.Modal.getInstance(document.getElementById('folder-edit-modal'));
        instance.open();
    }
    
    function saveFolderEdit() {
        const folder = getActiveFolder();
        const newName = dom.editFolderNameInput.value.trim();
        if(!folder || !newName) return;
        folder.name = newName;
        saveData();
        renderNavigation();
        renderMainContent(); 
        notify('Dossier renommé', 'green');
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

    function addUrlToCurrent() {
        const folder = getActiveFolder();
        if (!folder) return;
        let url = dom.urlInput.value.trim();
        let name = dom.nameInput.value.trim();

        if (!url) { notify('Veuillez entrer une URL', 'red'); return; }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        try { new URL(url); } catch (_) { notify('URL Invalide', 'red'); return; }
        if (folder.urls.some(u => u.url === url)) { notify('Cette URL existe déjà dans ce dossier', 'orange'); return; }

        folder.urls.unshift({
            id: Date.now(),
            url: url,
            name: name || url,
            dateAdded: new Date().toLocaleDateString('fr-FR'),
            scores: null,
            previousScores: null, 
            status: 'unknown',
            isLoading: false
        });
        saveData();
        renderMainContent(); 
        notify('Site ajouté !', 'green');
        dom.urlInput.value = '';
        dom.nameInput.value = '';
        M.updateTextFields();
        
        checkUrlStatus(folder.urls[0]);
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

    // Unified Full Analysis
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

        for (const url of folder.urls) {
            // Trigger Status Check
            checkUrlStatus(url); 
            
            // Trigger Audit
            runAudit(url.id);
            
            // Throttling
            await new Promise(r => setTimeout(r, 500)); 
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

            // SAVE PREVIOUS SCORES BEFORE UPDATING
            if (targetUrl.scores) {
                targetUrl.previousScores = { ...targetUrl.scores };
            }

            const categories = data.lighthouseResult.categories;
            const audits = data.lighthouseResult.audits; // For TTFB

            targetUrl.scores = {
                performance: Math.round(categories['performance'].score * 100),
                accessibility: Math.round(categories['accessibility'].score * 100),
                bestPractices: Math.round(categories['best-practices'].score * 100),
                seo: Math.round(categories['seo'].score * 100),
                ttfb: Math.round(audits['server-response-time'].numericValue), // NEW
                lastRun: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
            };
            
            targetUrl.status = 'up'; // Force up if audit worked
            
            addNotification('success', 'Audit terminé', `L'analyse de ${targetUrl.name || targetUrl.url} a réussi.`);

        } catch (err) {
            console.error("Erreur Lighthouse", err);
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
            li.innerHTML = `<span><i class="material-icons tiny left" style="margin-right:10px; opacity:0.7">folder</i>${folder.name}</span><span class="new badge" data-badge-caption="">${folder.urls.length}</span>`;
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
        dom.viewDashboard.style.display = 'none';
        dom.viewFolder.style.display = 'none';
        dom.viewNotifications.style.display = 'none';
        
        dom.deleteFolderBtn.style.display = 'none';
        dom.editFolderBtn.style.display = 'none';
        dom.clearNotifsBtn.style.display = 'none';
        
        if (state.activeFolderId === 'dashboard') {
            renderDashboardView();
        } else if (state.activeFolderId === 'notifications') {
            renderNotificationsView();
        } else {
            renderFolderView();
        }
    }
    
    function renderNotificationsView() {
        dom.viewNotifications.style.display = 'block';
        dom.pageTitle.textContent = "Notifications";
        dom.clearNotifsBtn.style.display = 'block'; 
        
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

    function renderDashboardView() {
        dom.viewDashboard.style.display = 'block';
        dom.pageTitle.textContent = "Tableau de bord";

        const stats = getGlobalStats();
        dom.statTotal.textContent = stats.total;
        
        if(dom.statAnalyzed) dom.statAnalyzed.textContent = stats.analyzed;
        
        dom.statAlerts.textContent = stats.alerts.length;
        dom.statImprovements.textContent = stats.improvements.length;
        if(dom.statOffline) dom.statOffline.textContent = stats.offline.length;

        // Offline Section
        dom.offlineList.innerHTML = '';
        if (stats.offline.length > 0) {
            dom.offlineSection.style.display = 'block';
            stats.offline.forEach(item => dom.offlineList.appendChild(createUrlCard(item, 'critical')));
        } else {
            dom.offlineSection.style.display = 'none';
        }

        dom.alertsList.innerHTML = '';
        if (stats.alerts.length === 0) dom.noAlertsMsg.style.display = 'block';
        else {
            dom.noAlertsMsg.style.display = 'none';
            stats.alerts.forEach(item => dom.alertsList.appendChild(createUrlCard(item, 'critical')));
        }

        dom.improvementsList.innerHTML = '';
        if (stats.improvements.length === 0) dom.noImprovementsMsg.style.display = 'block';
        else {
            dom.noImprovementsMsg.style.display = 'none';
            stats.improvements.forEach(item => dom.improvementsList.appendChild(createUrlCard(item, 'improvement')));
        }
    }

    function renderFolderView() {
        dom.viewFolder.style.display = 'block';

        const folder = getActiveFolder();
        if (!folder) return; 

        dom.pageTitle.textContent = folder.name;
        dom.deleteFolderBtn.style.display = 'block';
        dom.editFolderBtn.style.display = 'block'; 

        dom.urlList.innerHTML = '';
        if (folder.urls.length === 0) dom.emptyState.style.display = 'flex';
        else {
            dom.emptyState.style.display = 'none';
            folder.urls.forEach(item => dom.urlList.appendChild(createUrlCard(item, false)));
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
        if (item.scores) {
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

            // NEW: Add TTFB Item if available
            let ttfbItem = '';
            if(item.scores.ttfb !== undefined) {
                const ttfbVal = item.scores.ttfb;
                let ttfbColor = '#ff1744'; // > 600
                if (ttfbVal < 200) ttfbColor = '#00c853'; // < 200
                else if (ttfbVal <= 600) ttfbColor = '#ff9800'; // 200-600

                // Diff logic inverted for TTFB
                let ttfbDiffHtml = '';
                if (item.previousScores && item.previousScores.ttfb !== undefined) {
                    const diff = ttfbVal - item.previousScores.ttfb;
                    if (diff < 0) ttfbDiffHtml = `<div class="score-diff diff-pos">▼${Math.abs(diff)}</div>`; // Good
                    else if (diff > 0) ttfbDiffHtml = `<div class="score-diff diff-neg">▲${diff}</div>`; // Bad
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

            // Layout Branching for Scores Container
            if (!alertType) {
                scoresHtml = `<div class="scores-flex">${scoreItems}${ttfbItem}</div>`;
            } else {
                scoresHtml = `<div class="scores-grid">${scoreItems}</div>`; // Keep Dashboard simple (no TTFB there for now)
            }
            
        } else if (!alertType) {
            scoresHtml = `<span class="grey-text" style="font-size:0.9rem">Aucun audit</span>`;
        }

        // --- MAIN LAYOUT BRANCHING ---
        
        if (!alertType) {
            // === FOLDER VIEW: HORIZONTAL LAYOUT ===
            div.className = 'url-card horizontal-layout';
            
            const actionButtons = `
                 <div class="url-actions-group">
                    <button class="btn waves-effect waves-light btn-small blue lighten-1 audit-btn" data-id="${item.id}" title="Lancer l'audit"><i class="material-icons">refresh</i></button>
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
        
        if(dom.analyzeAllBtn) dom.analyzeAllBtn.onclick = runFullAnalysis; // NEW BINDING
        
        if(dom.confirmActionBtn) dom.confirmActionBtn.onclick = performConfirmedAction;

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

        dom.newFolderInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && dom.newFolderInput.value.trim()) {
                createFolder(dom.newFolderInput.value.trim());
                dom.newFolderInput.value = '';
            }
        });
        
        dom.editFolderBtn.onclick = openEditFolderModal;
        dom.deleteFolderBtn.onclick = askDeleteFolder;

        dom.addUrlBtn.onclick = (e) => {
            e.preventDefault();
            addUrlToCurrent();
        };

        const handleEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); addUrlToCurrent(); } };
        dom.urlInput.onkeypress = handleEnter;
        dom.nameInput.onkeypress = handleEnter;
        
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
        };
    }

    function notify(msg, color) {
        if (typeof M !== 'undefined') M.toast({html: msg, classes: color + ' rounded'});
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', PSReportApp.init);
