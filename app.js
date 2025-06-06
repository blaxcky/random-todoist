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
    }

    bindEvents() {
        document.getElementById('save-api-key').addEventListener('click', () => this.saveApiKey());
        document.getElementById('change-api-key').addEventListener('click', () => this.showApiKeySection());
        document.getElementById('complete-task').addEventListener('click', () => this.completeTask());
        document.getElementById('postpone-task').addEventListener('click', () => this.postponeTask());
        document.getElementById('next-task').addEventListener('click', () => this.loadRandomTask());
        document.getElementById('refresh-tasks').addEventListener('click', () => this.loadTasks());
        
        document.getElementById('api-key-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
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

        document.getElementById('task-title').textContent = task.content;
        document.getElementById('task-description').textContent = task.description || '';
        
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

    async completeTask() {
        if (!this.currentTask) return;

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
        }
    }

    async postponeTask() {
        if (!this.currentTask) return;

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
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    new TodoistApp();
});