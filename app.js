class TodoistApp {
    constructor() {
        this.apiKey = null;
        this.tasks = [];
        this.currentTask = null;
        this.init();
    }

    init() {
        this.loadApiKey();
        this.bindEvents();
        
        if (this.apiKey) {
            this.showTaskSection();
            this.loadTasks();
        } else {
            this.showApiKeySection();
        }
        
        // Menu-Button Event nach DOM-Load
        setTimeout(() => {
            const menuButton = document.getElementById('menu-toggle');
            if (menuButton) {
                menuButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu();
                });
            }
        }, 100);
    }

    bindEvents() {
        document.getElementById('save-api-key').addEventListener('click', () => this.saveApiKey());
        document.getElementById('change-api-key').addEventListener('click', () => this.showApiKeySection());
        document.getElementById('complete-task').addEventListener('click', () => this.completeTask());
        document.getElementById('postpone-task').addEventListener('click', () => this.postponeTask());
        document.getElementById('next-task').addEventListener('click', () => this.loadRandomTask());
        document.getElementById('refresh-tasks').addEventListener('click', () => this.loadTasks());
        document.getElementById('edit-title').addEventListener('click', () => this.startEditTitle());
        document.getElementById('save-title').addEventListener('click', () => this.saveTitle());
        document.getElementById('cancel-edit').addEventListener('click', () => this.cancelEditTitle());
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
        
        document.getElementById('task-title-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveTitle();
            } else if (e.key === 'Escape') {
                this.cancelEditTitle();
            }
        });
    }

    loadApiKey() {
        this.apiKey = localStorage.getItem('todoist-api-key');
    }

    saveApiKey() {
        const input = document.getElementById('api-key-input');
        const key = input.value.trim();
        
        if (!key) {
            this.showError('Bitte gib einen API-Key ein.');
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
            this.tasks = allTasks.filter(task => {
                if (!task.due) return false;
                
                const dueDate = new Date(task.due.date);
                return dueDate <= now;
            });

            if (this.tasks.length === 0) {
                this.showNoTasks();
            } else {
                this.loadRandomTask();
            }

        } catch (error) {
            console.error('Fehler beim Laden der Aufgaben:', error);
            this.showError(`Fehler beim Laden der Aufgaben: ${error.message}`);
        }
    }

    loadRandomTask() {
        if (this.tasks.length === 0) {
            this.showNoTasks();
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.tasks.length);
        this.currentTask = this.tasks[randomIndex];
        this.displayTask(this.currentTask);
    }

    async displayTask(task) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-tasks').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('task-display').style.display = 'block';

        document.getElementById('task-title').innerHTML = this.formatLinks(task.content);
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
    }

    formatLinks(text) {
        if (!text) return '';
        
        // Todoist-Style Links: [Text](URL)
        const todoistLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        text = text.replace(todoistLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="task-link">$1</a>');
        
        // Normale URLs automatisch verlinken
        const urlRegex = /(^|[^"'])(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="task-link">$2</a>');
        
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

            this.tasks = this.tasks.filter(task => task.id !== this.currentTask.id);
            
            if (this.tasks.length === 0) {
                this.showNoTasks();
            } else {
                this.loadRandomTask();
            }

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

            this.tasks = this.tasks.filter(task => task.id !== this.currentTask.id);
            
            if (this.tasks.length === 0) {
                this.showNoTasks();
            } else {
                this.loadRandomTask();
            }

        } catch (error) {
            console.error('Fehler beim Verschieben der Aufgabe:', error);
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

    startEditTitle() {
        const titleElement = document.getElementById('task-title');
        const inputElement = document.getElementById('task-title-input');
        const editButton = document.getElementById('edit-title');
        const editActions = document.querySelector('.edit-actions');
        const titleContainer = document.querySelector('.task-title-container');

        inputElement.value = titleElement.textContent;
        
        titleContainer.style.display = 'none';
        inputElement.style.display = 'block';
        editActions.style.display = 'flex';
        
        inputElement.focus();
        inputElement.select();
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
            
            const taskInList = this.tasks.find(task => task.id === this.currentTask.id);
            if (taskInList) {
                taskInList.content = newTitle;
            }

            document.getElementById('task-title').textContent = newTitle;
            this.cancelEditTitle();

        } catch (error) {
            console.error('Fehler beim Speichern des Titels:', error);
            this.showError(`Fehler beim Speichern des Titels: ${error.message}`);
            
            saveButton.disabled = false;
            saveButton.textContent = originalText;
            saveButton.style.opacity = '1';
            inputElement.disabled = false;
        }
    }

    cancelEditTitle() {
        const titleContainer = document.querySelector('.task-title-container');
        const inputElement = document.getElementById('task-title-input');
        const editActions = document.querySelector('.edit-actions');

        titleContainer.style.display = 'flex';
        inputElement.style.display = 'none';
        editActions.style.display = 'none';
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
                            
                            // Auto-refresh after short delay
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
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