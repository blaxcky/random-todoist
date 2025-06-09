class TodoistApp {
    constructor() {
        this.apiKey = null;
        this.tasks = [];
        this.currentTask = null;
        this.isLoadingTasks = false;
        this.shownTaskIds = new Set(); // Track which tasks have been shown
        this.allOverdueTasks = []; // Cache all overdue tasks
        this.init();
    }

    init() {
        this.loadApiKey();
        this.bindEvents();
        
        if (this.apiKey) {
            this.showTaskSection();
            if (this.currentTask) {
                // If we have a saved current task, show it directly
                this.displayTask(this.currentTask);
                // Also preload tasks in background if not cached
                if (this.allOverdueTasks.length === 0) {
                    this.loadTasksInBackground();
                }
            } else {
                // Preload tasks when app starts
                this.loadTasks();
            }
        } else {
            this.showApiKeySection();
        }
        
        // Menu-Button Event binding with proper DOM checking
        this.bindMenuButton();
    }

    bindMenuButton() {
        const menuButton = document.getElementById('menu-toggle');
        if (menuButton && !menuButton.hasAttribute('data-bound')) {
            menuButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
            menuButton.setAttribute('data-bound', 'true');
        } else if (!menuButton) {
            // Retry if element not found yet
            setTimeout(() => this.bindMenuButton(), 50);
        }
    }

    bindEvents() {
        document.getElementById('save-api-key').addEventListener('click', () => this.saveApiKey());
        document.getElementById('change-api-key').addEventListener('click', () => this.showApiKeySection());
        document.getElementById('complete-task').addEventListener('click', () => this.completeTask());
        document.getElementById('postpone-task').addEventListener('click', () => this.postponeTask());
        document.getElementById('postpone-week-task').addEventListener('click', () => this.postponeTaskWeek());
        document.getElementById('next-task').addEventListener('click', () => this.loadRandomTask());
        document.getElementById('refresh-tasks').addEventListener('click', () => this.loadTasks());
        document.getElementById('edit-title').addEventListener('click', () => this.openEditPopup());
        document.getElementById('save-title').addEventListener('click', () => this.saveTitle());
        document.getElementById('cancel-edit').addEventListener('click', () => this.closeEditPopup());
        document.getElementById('close-popup').addEventListener('click', () => this.closeEditPopup());
        document.getElementById('reset-cycle').addEventListener('click', () => this.resetCycleFromMenu());
        document.getElementById('force-reload').addEventListener('click', () => this.forceReload());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-container')) {
                this.closeMenu();
            }
        });
        
        document.getElementById('api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
        
        document.getElementById('task-title-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.saveTitle();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeEditPopup();
            }
        });
        
        // Close popup when clicking backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-popup-backdrop')) {
                this.closeEditPopup();
            }
        });
    }

    loadApiKey() {
        this.apiKey = localStorage.getItem('todoist-api-key');
        
        // Load saved current task if exists
        const savedTask = localStorage.getItem('current-task');
        if (savedTask) {
            try {
                this.currentTask = JSON.parse(savedTask);
            } catch (error) {
                console.error('Fehler beim Laden der gespeicherten Aufgabe:', error);
                localStorage.removeItem('current-task');
            }
        }
        
        // Load saved shown task IDs
        const savedShownIds = localStorage.getItem('shown-task-ids');
        if (savedShownIds) {
            try {
                this.shownTaskIds = new Set(JSON.parse(savedShownIds));
            } catch (error) {
                console.error('Fehler beim Laden der gezeigten Aufgaben:', error);
                localStorage.removeItem('shown-task-ids');
                this.shownTaskIds = new Set();
            }
        }
    }

    saveCurrentTask() {
        if (this.currentTask) {
            localStorage.setItem('current-task', JSON.stringify(this.currentTask));
        }
    }
    
    saveShownTaskIds() {
        localStorage.setItem('shown-task-ids', JSON.stringify([...this.shownTaskIds]));
    }

    clearCurrentTask() {
        this.currentTask = null;
        localStorage.removeItem('current-task');
    }

    saveApiKey() {
        const input = document.getElementById('api-key-input');
        const key = input.value.trim();
        
        if (!key) {
            this.showError('Bitte gib einen API-Key ein.');
            return;
        }
        
        // Basic API key validation
        if (key.length < 32 || !/^[a-f0-9]+$/i.test(key)) {
            this.showError('API-Key scheint ungültig zu sein. Erwartet: 32+ hexadezimale Zeichen.');
            return;
        }

        this.apiKey = key;
        localStorage.setItem('todoist-api-key', key);
        input.value = '';
        
        this.showTaskSection();
        this.loadTasks();
    }

    showApiKeySection() {
        document.getElementById('api-key-section').style.display = 'block';
        document.getElementById('task-section').style.display = 'none';
        document.getElementById('save-api-key').style.display = this.apiKey ? 'none' : 'inline-block';
        document.getElementById('change-api-key').style.display = this.apiKey ? 'inline-block' : 'none';
    }

    showTaskSection() {
        document.getElementById('api-key-section').style.display = 'none';
        document.getElementById('task-section').style.display = 'block';
    }

    showStartState() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('task-display').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        
        // Show a start message if no tasks are loaded yet
        if (this.tasks.length === 0 && !this.currentTask) {
            const taskSection = document.getElementById('task-section');
            let startMessage = document.getElementById('start-message');
            
            if (!startMessage) {
                startMessage = document.createElement('div');
                startMessage.id = 'start-message';
                startMessage.className = 'start-message';
                startMessage.innerHTML = `
                    <p>Bereit für eine zufällige überfällige Aufgabe?</p>
                    <button id="start-button" class="btn btn-start">Erste Aufgabe laden</button>
                `;
                taskSection.appendChild(startMessage);
                
                // Add event listener for start button (prevent memory leaks)
                const startButton = document.getElementById('start-button');
                if (startButton && !startButton.hasAttribute('data-bound')) {
                    startButton.addEventListener('click', () => this.loadRandomTask());
                    startButton.setAttribute('data-bound', 'true');
                }
            }
            
            startMessage.style.display = 'block';
        }
    }

    async loadTasks() {
        this.showLoading();
        
        try {
            const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const allTasks = await response.json();
            
            const now = new Date();
            const overdueTasks = allTasks.filter(task => {
                if (!task.due) return false;
                
                try {
                    const dueDate = new Date(task.due.date);
                    if (isNaN(dueDate.getTime())) {
                        console.warn('Invalid due date for task:', task.id, task.due.date);
                        return false;
                    }
                    return dueDate <= now;
                } catch (error) {
                    console.error('Error parsing due date for task:', task.id, error);
                    return false;
                }
            });
            
            // Cache all overdue tasks for cycling
            this.allOverdueTasks = [...overdueTasks];
            
            // Filter out tasks that are completed/postponed but still in shown list
            this.tasks = overdueTasks.filter(task => 
                !this.shownTaskIds.has(task.id) || task.id === this.currentTask?.id
            );

            if (this.tasks.length === 0) {
                this.showNoTasks();
            } else {
                // Don't mark as shown on first load
                this.loadRandomTask(false);
            }

        } catch (error) {
            console.error('Fehler beim Laden der Aufgaben:', error);
            this.showError(`Fehler beim Laden der Aufgaben: ${error.message}`);
        }
    }

    async loadTasksInBackground() {
        try {
            const response = await fetch('https://api.todoist.com/rest/v2/tasks', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const allTasks = await response.json();
            
            const now = new Date();
            const overdueTasks = allTasks.filter(task => {
                if (!task.due) return false;
                
                try {
                    const dueDate = new Date(task.due.date);
                    if (isNaN(dueDate.getTime())) {
                        console.warn('Invalid due date for task:', task.id, task.due.date);
                        return false;
                    }
                    return dueDate <= now;
                } catch (error) {
                    console.error('Error parsing due date for task:', task.id, error);
                    return false;
                }
            });
            
            // Update cache but don't change current UI state
            this.allOverdueTasks = [...overdueTasks];
            
            // Update progress indicator with current state
            this.updateProgressIndicator();

        } catch (error) {
            console.error('Fehler beim Laden der Aufgaben im Hintergrund:', error);
        }
    }

    async loadRandomTask(markCurrentAsShown = true) {
        // Hide start message if it exists
        const startMessage = document.getElementById('start-message');
        if (startMessage) {
            startMessage.style.display = 'none';
        }
        
        // Load tasks if not loaded yet (prevent race conditions)
        if (this.allOverdueTasks.length === 0) {
            if (this.isLoadingTasks) return;
            this.isLoadingTasks = true;
            try {
                await this.loadTasks();
            } finally {
                this.isLoadingTasks = false;
            }
            return;
        }

        // Mark current task as shown only if explicitly requested (not on first load)
        if (this.currentTask && markCurrentAsShown) {
            this.shownTaskIds.add(this.currentTask.id);
            this.saveShownTaskIds();
        }

        // Get unshown tasks
        const unshownTasks = this.allOverdueTasks.filter(task => 
            !this.shownTaskIds.has(task.id)
        );

        if (unshownTasks.length === 0) {
            // All tasks have been shown - ask user to restart cycle
            this.showRestartCyclePrompt();
            return;
        }

        // Pick random unshown task
        const randomIndex = Math.floor(Math.random() * unshownTasks.length);
        this.currentTask = unshownTasks[randomIndex];
        
        this.saveCurrentTask();
        this.displayTask(this.currentTask);
    }

    showRestartCyclePrompt() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('task-display').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        
        const taskSection = document.getElementById('task-section');
        let restartMessage = document.getElementById('restart-cycle-message');
        
        if (!restartMessage) {
            restartMessage = document.createElement('div');
            restartMessage.id = 'restart-cycle-message';
            restartMessage.className = 'restart-cycle-message';
            restartMessage.innerHTML = `
                <h3>🎉 Alle überfälligen Aufgaben durchgegangen!</h3>
                <p>Du hast alle ${this.allOverdueTasks.length} überfälligen Aufgaben einmal gesehen.</p>
                <p>Möchtest du wieder von vorne anfangen?</p>
                <div class="restart-buttons">
                    <button id="restart-cycle" class="btn btn-restart">🔄 Von vorne anfangen</button>
                    <button id="refresh-all-tasks" class="btn btn-refresh">🔍 Nach neuen Aufgaben suchen</button>
                </div>
            `;
            taskSection.appendChild(restartMessage);
            
            // Add event listeners
            document.getElementById('restart-cycle').addEventListener('click', () => this.restartCycle());
            document.getElementById('refresh-all-tasks').addEventListener('click', () => this.refreshAndRestart());
        }
        
        restartMessage.style.display = 'block';
    }

    restartCycle() {
        // Clear shown task IDs to start over
        this.shownTaskIds.clear();
        this.saveShownTaskIds();
        
        // Hide restart message
        const restartMessage = document.getElementById('restart-cycle-message');
        if (restartMessage) {
            restartMessage.style.display = 'none';
        }
        
        // Load random task to start new cycle (don't mark as shown yet)
        this.loadRandomTask(false);
    }

    async refreshAndRestart() {
        // Clear shown task IDs
        this.shownTaskIds.clear();
        this.saveShownTaskIds();
        
        // Hide restart message
        const restartMessage = document.getElementById('restart-cycle-message');
        if (restartMessage) {
            restartMessage.style.display = 'none';
        }
        
        // Reload all tasks and start fresh
        await this.loadTasks();
    }

    resetCycleFromMenu() {
        // Close the menu first
        this.closeMenu();
        
        // Clear shown task IDs to start cycle from beginning
        this.shownTaskIds.clear();
        this.saveShownTaskIds();
        
        // Clear current task
        this.clearCurrentTask();
        
        // Hide any restart message that might be showing
        const restartMessage = document.getElementById('restart-cycle-message');
        if (restartMessage) {
            restartMessage.style.display = 'none';
        }
        
        // Show loading and reload all tasks fresh
        this.showLoading();
        this.loadTasks();
    }

    async displayTask(task) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('task-display').style.display = 'block';
        
        // Reset all button states
        this.resetButtonStates();

        const titleElement = document.getElementById('task-title');
        titleElement.innerHTML = this.formatLinks(task.content);
        
        // Dynamische Schriftgröße basierend auf Titellänge
        this.adjustTitleSize(titleElement, task.content);
        
        document.getElementById('task-description').innerHTML = this.formatLinks(task.description || '');
        
        let projectName = '';
        if (task.project_id) {
            try {
                const projectResponse = await fetch(`https://api.todoist.com/rest/v2/projects/${task.project_id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                if (projectResponse.ok) {
                    const project = await projectResponse.json();
                    projectName = project.name;
                }
            } catch (error) {
                console.error('Fehler beim Laden des Projekts:', error);
            }
        }
        
        document.getElementById('task-project').textContent = projectName || 'Kein Projekt';
        
        const dueDate = task.due ? new Date(task.due.date).toLocaleDateString('de-DE') : 'Kein Fälligkeitsdatum';
        document.getElementById('task-due-date').textContent = dueDate;
        
        // Update progress indicator
        this.updateProgressIndicator();
    }

    updateProgressIndicator() {
        if (this.allOverdueTasks.length === 0) return;
        
        const totalTasks = this.allOverdueTasks.length;
        const shownTasks = this.shownTaskIds.size;
        // Count current task as being worked on (1-based counting)
        const effectiveShownCount = this.currentTask ? shownTasks + 1 : shownTasks;
        
        // Update or create progress indicator
        let progressContainer = document.getElementById('task-progress');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'task-progress';
            progressContainer.className = 'task-progress';
            
            const taskMeta = document.querySelector('.task-meta');
            if (taskMeta) {
                taskMeta.parentNode.insertBefore(progressContainer, taskMeta);
            }
        }
        
        const percentage = Math.round((effectiveShownCount / totalTasks) * 100);
        progressContainer.innerHTML = `
            <div class="progress-info">
                <span>Fortschritt: ${effectiveShownCount}/${totalTasks} Aufgaben</span>
                <span>${percentage}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    }

    resetButtonStates() {
        const buttons = [
            { id: 'complete-task', text: 'Erledigt' },
            { id: 'postpone-task', text: 'Morgen' },
            { id: 'postpone-week-task', text: 'Nächste Woche' },
            { id: 'next-task', text: 'Nächste Aufgabe' }
        ];
        
        buttons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.disabled = false;
                element.textContent = button.text;
                element.style.opacity = '1';
            }
        });
    }

    formatLinks(text) {
        if (!text) return '';
        
        // Todoist-Style Links: [Text](URL)
        const todoistLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        text = text.replace(todoistLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="task-link">$1</a>');
        
        // Normale URLs automatisch verlinken (mit Validierung gegen XSS)
        const urlRegex = /(^|[^"'])(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, (match, prefix, url) => {
            try {
                // Validate URL to prevent XSS attacks
                new URL(url);
                // Escape HTML characters in URL
                const safeUrl = url.replace(/[<>"']/g, (char) => {
                    const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
                    return escapeMap[char];
                });
                return `${prefix}<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="task-link">${safeUrl}</a>`;
            } catch {
                return match; // Return original if URL is invalid
            }
        });
        
        return text;
    }

    async completeTask() {
        if (!this.currentTask) return;

        const completeButton = document.getElementById('complete-task');
        const originalText = completeButton.textContent;
        
        completeButton.disabled = true;
        completeButton.textContent = '⏳ Wird erledigt...';
        completeButton.style.opacity = '0.7';

        try {
            const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${this.currentTask.id}/close`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove from cached overdue tasks
            this.allOverdueTasks = this.allOverdueTasks.filter(task => task.id !== this.currentTask.id);
            // Also remove from shown tasks as it's completed
            this.shownTaskIds.delete(this.currentTask.id);
            this.saveShownTaskIds();
            this.clearCurrentTask();
            
            // Load next task from cycle
            this.loadRandomTask();

        } catch (error) {
            console.error('Fehler beim Abschließen der Aufgabe:', error);
            this.showError(`Fehler beim Abschließen der Aufgabe: ${error.message}`);
            
            completeButton.disabled = false;
            completeButton.textContent = originalText;
            completeButton.style.opacity = '1';
        }
    }

    async postponeTask() {
        if (!this.currentTask) return;

        const postponeButton = document.getElementById('postpone-task');
        const originalText = postponeButton.textContent;
        
        postponeButton.disabled = true;
        postponeButton.textContent = '⏳ Wird verschoben...';
        postponeButton.style.opacity = '0.7';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        try {
            const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${this.currentTask.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    due_date: tomorrowStr
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove from cached overdue tasks (task is no longer overdue)
            this.allOverdueTasks = this.allOverdueTasks.filter(task => task.id !== this.currentTask.id);
            // Also remove from shown tasks as it's postponed
            this.shownTaskIds.delete(this.currentTask.id);
            this.saveShownTaskIds();
            this.clearCurrentTask();
            
            // Load next task from cycle
            this.loadRandomTask();

        } catch (error) {
            console.error('Fehler beim Verschieben der Aufgabe:', error);
            this.showError(`Fehler beim Verschieben der Aufgabe: ${error.message}`);
            
            postponeButton.disabled = false;
            postponeButton.textContent = originalText;
            postponeButton.style.opacity = '1';
        }
    }

    async postponeTaskWeek() {
        if (!this.currentTask) return;

        const postponeButton = document.getElementById('postpone-week-task');
        const originalText = postponeButton.textContent;
        
        postponeButton.disabled = true;
        postponeButton.textContent = '⏳ Wird verschoben...';
        postponeButton.style.opacity = '0.7';

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        try {
            const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${this.currentTask.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    due_date: nextWeekStr
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Remove from cached overdue tasks (task is no longer overdue)
            this.allOverdueTasks = this.allOverdueTasks.filter(task => task.id !== this.currentTask.id);
            // Also remove from shown tasks as it's postponed
            this.shownTaskIds.delete(this.currentTask.id);
            this.saveShownTaskIds();
            this.clearCurrentTask();
            
            // Load next task from cycle
            this.loadRandomTask();

        } catch (error) {
            console.error('Fehler beim Verschieben der Aufgabe auf nächste Woche:', error);
            this.showError(`Fehler beim Verschieben der Aufgabe: ${error.message}`);
            
            postponeButton.disabled = false;
            postponeButton.textContent = originalText;
            postponeButton.style.opacity = '1';
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('task-display').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
    }

    showNoTasks() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('task-display').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'block';
        document.getElementById('error-message').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('task-display').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('error-message').textContent = message;
    }

    openEditPopup() {
        const inputElement = document.getElementById('task-title-input');
        const popup = document.getElementById('edit-popup');

        // Verwende den originalen Titel mit Markdown-Formatierung
        inputElement.value = this.currentTask ? this.currentTask.content : '';
        popup.style.display = 'flex';
        
        // Focus textarea after animation
        setTimeout(() => {
            inputElement.focus();
            inputElement.select();
        }, 100);
    }

    closeEditPopup() {
        const popup = document.getElementById('edit-popup');
        popup.style.display = 'none';
    }

    async saveTitle() {
        const inputElement = document.getElementById('task-title-input');
        const saveButton = document.getElementById('save-title');
        const newTitle = inputElement.value.trim();
        
        if (!newTitle) {
            this.showError('Der Titel darf nicht leer sein.');
            return;
        }

        if (!this.currentTask) {
            this.showError('Keine Aufgabe zum Bearbeiten gefunden.');
            return;
        }

        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = '⏳ Speichert...';
        saveButton.style.opacity = '0.7';
        inputElement.disabled = true;

        try {
            const response = await fetch(`https://api.todoist.com/rest/v2/tasks/${this.currentTask.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newTitle
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.currentTask.content = newTitle;
            this.saveCurrentTask();
            
            const taskInList = this.tasks.find(task => task.id === this.currentTask.id);
            if (taskInList) {
                taskInList.content = newTitle;
            }

            document.getElementById('task-title').innerHTML = this.formatLinks(newTitle);
            this.adjustTitleSize(document.getElementById('task-title'), newTitle);
            this.closeEditPopup();

        } catch (error) {
            console.error('Fehler beim Speichern des Titels:', error);
            this.showError(`Fehler beim Speichern des Titels: ${error.message}`);
            
            saveButton.disabled = false;
            saveButton.textContent = originalText;
            saveButton.style.opacity = '1';
            inputElement.disabled = false;
        }
    }


    async forceReload() {
        const reloadButton = document.getElementById('force-reload');
        const originalText = reloadButton.textContent;
        
        reloadButton.disabled = true;
        reloadButton.textContent = '🔄 Cache wird geleert...';
        reloadButton.style.opacity = '0.7';

        try {
            // Service Worker stoppen
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // Alle Caches löschen
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            // Browser-Cache headers setzen für Force Reload
            const timestamp = Date.now();
            const newUrl = window.location.href.split('?')[0] + `?_=${timestamp}`;
            
            // Hard reload mit Cache-Busting
            window.location.replace(newUrl);

        } catch (error) {
            console.error('Fehler beim Cache leeren:', error);
            reloadButton.disabled = false;
            reloadButton.textContent = originalText;
            reloadButton.style.opacity = '1';
            this.showError(`Fehler beim Cache leeren: ${error.message}`);
        }
    }

    toggleMenu() {
        const menu = document.getElementById('dropdown-menu');
        const isVisible = menu.style.display === 'block';
        menu.style.display = isVisible ? 'none' : 'block';
    }

    closeMenu() {
        document.getElementById('dropdown-menu').style.display = 'none';
    }

    adjustTitleSize(titleElement, content) {
        // Entferne HTML-Tags für Längenberechnung
        const textContent = content.replace(/<[^>]*>/g, '');
        const length = textContent.length;
        
        // Bestimme Schriftgröße basierend auf Länge
        let fontSize = '1.5rem'; // Standard
        
        if (length > 100) {
            fontSize = '1.1rem';
        } else if (length > 70) {
            fontSize = '1.2rem';
        } else if (length > 50) {
            fontSize = '1.3rem';
        } else if (length > 30) {
            fontSize = '1.4rem';
        }
        
        titleElement.style.fontSize = fontSize;
        titleElement.style.lineHeight = length > 50 ? '1.3' : '1.4';
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New service worker found');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            console.log('New content available, will refresh automatically');
                            
                            // Show update notification (optional)
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification('App Update', {
                                    body: 'Eine neue Version ist verfügbar und wird geladen...',
                                    icon: './icon.svg'
                                });
                            }
                            
                            // Auto-refresh after short delay (prevent infinite loops)
                            if (!sessionStorage.getItem('sw-updating')) {
                                sessionStorage.setItem('sw-updating', 'true');
                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            }
                        }
                    });
                });
                
                // Check for updates periodically (every 5 minutes)
                setInterval(() => {
                    registration.update();
                }, 5 * 60 * 1000);
                
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
            
        // Handle controller changes
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service worker controller changed');
            window.location.reload();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    new TodoistApp();
});